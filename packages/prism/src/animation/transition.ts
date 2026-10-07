import type { TransitionConfig } from '../types';
import type { EasingFn } from './easing';
import { resolveEasing } from './easing';
import { resolveMotion } from './motion';
import { tweenNumber } from './tween';

export interface AnimationTarget {
  attrs: Record<string, { from: number; to: number }>;
  el: SVGElement;
}

export interface TweenOptions {
  /** Number of staggered lanes; the loop runs until the last lane finishes. */
  count: number;
  /** Milliseconds before the first lane starts; shifts the whole tween, not just one lane. */
  delay?: number;
  /** Milliseconds per lane. A non-positive value completes synchronously. */
  duration: number;
  easing: EasingFn;
  onComplete?: () => void;
  /**
   * Runs once per frame (and once synchronously for a zero-length tween). Receives a
   * `progress(lane)` resolver returning that lane's eased 0-1 value, so callers
   * interpolate their own values without re-deriving elapsed time.
   */
  onFrame: (progress: (lane: number) => number) => void;
  /** Aborted when the owning chart is disposed: cancels the in-flight frame. */
  signal?: AbortSignal;
  /** Per-lane delay in milliseconds; each lane starts `stagger` ms after the previous. */
  stagger?: number;
}

/**
 * The package's single `requestAnimationFrame` tween loop. Every animated surface
 * (bar, line, area, pie, radar, sparkline) drives its transition through here, so
 * disposal-correctness is enforced in exactly one place: an aborted `signal` cancels
 * the in-flight frame and stops rescheduling.
 *
 * Elapsed time comes from the timestamp the browser passes to the frame callback,
 * never a captured `performance.now()`. Returns a `cancel()` function for superseding
 * a tween before it ends.
 */
export function startTween(options: TweenOptions): () => void {
  const { count, delay = 0, duration, easing, stagger = 0, signal, onFrame, onComplete } = options;

  if (signal?.aborted) return () => {};

  // A zero-length (or reduced-motion) tween applies its final frame synchronously: no rAF.
  if (duration <= 0) {
    onFrame(() => 1);
    onComplete?.();

    return () => {};
  }

  if (count === 0) {
    onComplete?.();

    return () => {};
  }

  const totalDuration = delay + duration + stagger * (count - 1);
  let startTime: number | null = null;
  let rafId: number | null = null;
  let cancelled = false;

  const cancel = (): void => {
    cancelled = true;

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    signal?.removeEventListener('abort', cancel);
  };

  const frame = (timestamp: number): void => {
    if (cancelled || signal?.aborted) return;

    if (startTime === null) startTime = timestamp;

    const elapsed = timestamp - startTime;

    onFrame((lane) => easing(Math.max(0, Math.min(1, (elapsed - delay - lane * stagger) / duration))));

    if (elapsed < totalDuration) {
      rafId = requestAnimationFrame(frame);
    } else {
      rafId = null;
      signal?.removeEventListener('abort', cancel);
      onComplete?.();
    }
  };

  signal?.addEventListener('abort', cancel, { once: true });
  rafId = requestAnimationFrame(frame);

  return cancel;
}

/**
 * Runs a batch of numeric-attribute tweens through {@link startTween}, sharing one
 * `requestAnimationFrame` loop. Returns the loop's `cancel()` function.
 */
export function animate(
  targets: AnimationTarget[],
  config?: TransitionConfig,
  onComplete?: () => void,
  signal?: AbortSignal,
): () => void {
  const motion = resolveMotion(config);

  return startTween({
    count: targets.length,
    duration: motion.duration,
    easing: resolveEasing(motion.easing),
    onComplete,
    onFrame: (progress) => {
      for (const [lane, target] of targets.entries()) {
        const eased = progress(lane);

        for (const [attr, { from, to }] of Object.entries(target.attrs)) {
          target.el.setAttribute(attr, String(tweenNumber(from, to, eased)));
        }
      }
    },
    signal,
    stagger: motion.stagger,
  });
}
