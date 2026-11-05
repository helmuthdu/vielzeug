import { attachAbortSignalListener } from './_handle';
import { NecromancerConfigError } from './errors';
import { shouldReduceMotion } from './motion';
import type { AnimationResult, MotionMode } from './types';

/**
 * Physical spring parameters, in the damped-harmonic-oscillator model:
 * `mass * x'' = -stiffness * (x - to) - damping * x'`.
 */
export type SpringOptions = Readonly<{
  /** Spring stiffness k. Higher settles faster. Defaults to `170`. */
  readonly stiffness?: number;
  /** Viscous damping c. Lower overshoots more; `2 * sqrt(k * mass)` is critically damped. Defaults to `26`. */
  readonly damping?: number;
  /** Mass m. Defaults to `1`. */
  readonly mass?: number;
  /** Initial velocity in units/s, typically the finger velocity at release. Defaults to `0`. */
  readonly velocity?: number;
  /** Both |x - to| and |velocity| must fall below this to rest. Defaults to `0.1`. */
  readonly precision?: number;
  /** Reduced motion jumps straight to the target. Defaults to `'system'`. */
  readonly motion?: MotionMode;
  /** Disposes the returned handle when aborted. */
  readonly signal?: AbortSignal;
}>;

/** Called once per frame with the current spring value and velocity (units/s). */
export type SpringUpdate = (value: number, velocity: number) => void;

/** A lifecycle-owned spring animation. */
export interface SpringHandle {
  /** Stops the spring mid-flight and releases owned listeners. */
  dispose(reason?: unknown): void;
  /** Whether this handle has been disposed. */
  readonly disposed: boolean;
  /** Resolves once the spring rests or is disposed. */
  readonly result: Promise<AnimationResult>;
  /** Calls {@link dispose}. */
  [Symbol.dispose](): void;
}

const DEFAULTS = { damping: 26, mass: 1, precision: 0.1, stiffness: 170 } as const;

/** Longest frame integrated in one step; a backgrounded tab resumes without a physics jump. */
const MAX_FRAME_SECONDS = 1 / 30;

/** Fixed physics substep; keeps the explicit integrator stable at stiff settings. */
const SUBSTEP_SECONDS = 1 / 240;

function validate(name: string, value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new NecromancerConfigError(`${name} must be a positive finite number, got: ${value}`);
  }
  return value;
}

/**
 * Endpoint validation. Unlike the config knobs, a spring boundary may legitimately be zero or
 * negative (a height animating from `0`, a panel sliding to a negative offset), so only finiteness
 * is enforced. It still has to be checked: the rest test compares against `to`, so a non-finite
 * endpoint can never be satisfied and the spring would request frames forever while emitting NaN.
 */
function validateBound(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new NecromancerConfigError(`${name} must be a finite number, got: ${value}`);
  }
  return value;
}

/**
 * Animates a scalar value on a physical spring, calling `onUpdate` once per frame.
 *
 * Unlike a fixed-duration easing curve, a spring takes its **initial velocity**
 * from the caller — typically the pointer velocity a gesture reported at release
 * — so a fling continues from the finger's momentum and a slow drag settles
 * without overshoot. The motion is interruptible by design: dispose the handle
 * and start a new spring from the current value and velocity.
 *
 * Under reduced motion the value jumps to the target in a single update.
 */
export function spring(from: number, to: number, onUpdate: SpringUpdate, options: SpringOptions = {}): SpringHandle {
  validateBound('from', from);
  validateBound('to', to);
  const stiffness = validate('stiffness', options.stiffness ?? DEFAULTS.stiffness);
  const damping = validate('damping', options.damping ?? DEFAULTS.damping);
  const mass = validate('mass', options.mass ?? DEFAULTS.mass);
  const precision = validate('precision', options.precision ?? DEFAULTS.precision);
  const velocity0 = options.velocity ?? 0;
  if (!Number.isFinite(velocity0)) {
    throw new NecromancerConfigError(`velocity must be a finite number, got: ${velocity0}`);
  }
  options.signal?.throwIfAborted();

  let disposed = false;
  let settled = false;
  let frame = 0;
  let removeAbortListener: (() => void) | undefined;
  let settle: (result: AnimationResult) => void = () => undefined;

  const result = new Promise<AnimationResult>((resolve) => {
    settle = (animationResult) => {
      settled = true;
      removeAbortListener?.();
      removeAbortListener = undefined;
      resolve(animationResult);
    };

    if (shouldReduceMotion(options.motion ?? 'system')) {
      onUpdate(to, 0);
      settle({ status: 'finished' });
      return;
    }

    let value = from;
    let velocity = velocity0;
    let lastTime: number | undefined;

    const step = (time: number): void => {
      if (disposed) return;

      const elapsed = lastTime === undefined ? 0 : Math.min((time - lastTime) / 1000, MAX_FRAME_SECONDS);
      lastTime = time;

      let remaining = elapsed;
      while (remaining > 0) {
        const dt = Math.min(remaining, SUBSTEP_SECONDS);
        remaining -= dt;
        // Semi-implicit Euler: update velocity first, then position from it.
        const acceleration = (-stiffness * (value - to) - damping * velocity) / mass;
        velocity += acceleration * dt;
        value += velocity * dt;
      }

      if (Math.abs(value - to) < precision && Math.abs(velocity) < precision) {
        onUpdate(to, 0);
        settle({ status: 'finished' });
        return;
      }

      onUpdate(value, velocity);
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
  });

  const dispose = (reason?: unknown): void => {
    if (disposed || settled) return;

    disposed = true;
    cancelAnimationFrame(frame);
    settle({ reason, status: 'cancelled' });
  };

  if (options.signal && !settled) {
    removeAbortListener = attachAbortSignalListener(options.signal, dispose);
  }

  return {
    dispose,
    get disposed() {
      return disposed;
    },
    result,
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}
