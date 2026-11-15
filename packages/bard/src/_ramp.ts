/** Shared ramp and sampling helpers. */

/** Smallest gain an exponential ramp may target; 0 throws a `RangeError`. */
export const MIN_GAIN = 1e-4;

/** Micro-fade seconds that removes clicks without an audible dip. */
export const MICRO_FADE = 0.015;

/** Default ducking attack seconds. */
export const DEFAULT_ATTACK = 0.2;

/** Default ducking release seconds. */
export const DEFAULT_RELEASE = 0.8;

/**
 * Ramps a gain-like param to `target` over `seconds` using a linear ramp from
 * its current value. Never assigns `param.value` directly while scheduled
 * automation exists, which is what produces clicks.
 */
export function rampParam(param: AudioParam, target: number, seconds: number, now: number): void {
  const from = param.value;
  param.cancelScheduledValues(now);
  param.setValueAtTime(from, now);
  if (seconds <= 0 || from === target) {
    param.setValueAtTime(target, now);
    return;
  }
  param.linearRampToValueAtTime(target, now + seconds);
}

/** Exponentially sweeps a frequency-like param, clamped away from zero. */
export function expRampTo(param: AudioParam, target: number, seconds: number, now: number): void {
  const from = Math.max(param.value, MIN_GAIN);
  param.cancelScheduledValues(now);
  param.setValueAtTime(from, now);
  param.exponentialRampToValueAtTime(Math.max(target, MIN_GAIN), now + seconds);
}

/** Resolves a scalar-or-range option to one sample. */
export function sampleRange(
  value: number | readonly [min: number, max: number] | undefined,
  random: () => number,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  const [min, max] = value;
  return min + (max - min) * Math.min(Math.max(random(), 0), 1);
}
