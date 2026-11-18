/** Shared input validation for the main-thread and worker stage halves. */

import type { Matrix, Rect, Size } from '@vielzeug/atlas';
import { StageConfigError } from './errors.js';

/** @internal */
export function requireSize(size: Size, context: string): void {
  if (!Number.isFinite(size.width) || size.width <= 0 || !Number.isFinite(size.height) || size.height <= 0) {
    throw new StageConfigError(`${context} size must be positive finite numbers, got ${size.width}x${size.height}.`);
  }
}

/** @internal */
export function requireDpr(dpr: number, context: string): void {
  if (!Number.isFinite(dpr) || dpr <= 0) {
    throw new StageConfigError(`${context} dpr must be a positive finite number, got ${dpr}.`);
  }
}

/** @internal */
export function requireRect(rect: Rect, context: string): void {
  if (
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.width) ||
    rect.width <= 0 ||
    !Number.isFinite(rect.height) ||
    rect.height <= 0
  ) {
    throw new StageConfigError(
      `${context} region must have finite coordinates and positive finite size, got ${rect.width}x${rect.height} at ${rect.x},${rect.y}.`,
    );
  }
}

/** @internal */
export function requireScale(scale: number, context: string): void {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new StageConfigError(`${context} scale must be a positive finite number, got ${scale}.`);
  }
}

/** @internal */
export function requireFiniteMatrix(matrix: Matrix): void {
  for (const value of matrix) {
    if (!Number.isFinite(value)) {
      throw new StageConfigError(`Stage matrix must contain only finite numbers, got ${value}.`);
    }
  }
}
