/** Internal validation helpers. Shared by every public entry point; never exported. */
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
  requireFiniteNumber(value, name);
  if (!Number.isInteger(value)) {
    throw new InkConfigError(`Expected ${name} to be an integer, received ${String(value)}.`);
  }
  return requireRange(value as number, name, min, max);
}

/** Validates a stroke point array and returns it typed. Allows empty arrays unless `minPoints` says otherwise. */
export function requireStrokePoints(value: unknown, minPoints = 0): readonly StrokePoint[] {
  if (!Array.isArray(value)) {
    throw new InkConfigError(`Expected an array of stroke points, received ${typeof value}.`);
  }
  if (value.length < minPoints) {
    throw new InkConfigError(`Expected at least ${minPoints} stroke point(s), received ${value.length}.`);
  }
  for (const [index, point] of (value as unknown[]).entries()) {
    if (point === null || typeof point !== 'object') {
      throw new InkConfigError(`Expected stroke point at index ${index} to be an object, received ${String(point)}.`);
    }
    const candidate = point as { x?: unknown; y?: unknown; pressure?: unknown };
    requireFiniteNumber(candidate.x, `points[${index}].x`);
    requireFiniteNumber(candidate.y, `points[${index}].y`);
    if (candidate.pressure !== undefined) {
      requireFiniteNumber(candidate.pressure, `points[${index}].pressure`);
    }
  }
  return value as readonly StrokePoint[];
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
