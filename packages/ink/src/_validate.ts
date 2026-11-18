/** Internal validation helpers. Shared by every public entry point; never exported.
 *
 * Stroke points arrive typed and are produced by capture loops, not by untrusted
 * input, so they are not validated per point (matching atlas and wire). Only
 * option ranges and algorithm preconditions are checked.
 */
import { InkConfigError } from './errors.js';
import type { StrokePoint } from './types.js';

export function requireFiniteNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InkConfigError(`Expected ${name} to be a finite number, received ${String(value)}.`);
  }
  return value;
}

export function requireRange(value: number, name: string, min: number, max: number): number {
  if (value < min || value > max) {
    throw new InkConfigError(`Expected ${name} to be within [${min}, ${max}], received ${value}.`);
  }
  return value;
}

export function requirePositive(value: unknown, name: string): number {
  return requireRange(requireFiniteNumber(value, name), name, Number.MIN_VALUE, Number.POSITIVE_INFINITY);
}

export function requireInteger(value: unknown, name: string, min: number, max: number): number {
  const resolved = requireFiniteNumber(value, name);
  if (!Number.isInteger(resolved)) {
    throw new InkConfigError(`Expected ${name} to be an integer, received ${String(value)}.`);
  }
  return requireRange(resolved, name, min, max);
}

/** Checks the array shape and minimum length of a stroke; the points themselves are trusted as typed. */
export function requireStrokePoints(value: readonly StrokePoint[], minPoints = 0): readonly StrokePoint[] {
  if (value.length < minPoints) {
    throw new InkConfigError(`Expected at least ${minPoints} stroke point(s), received ${value.length}.`);
  }
  return value;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Distance between two points. */
export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.hypot(dx, dy);
}
