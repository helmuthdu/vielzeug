import type { Matrix, Point } from './_shapes.js';

export const IDENTITY: Matrix = Object.freeze([1, 0, 0, 1, 0, 0]) as Matrix;

export function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

export function apply(matrix: Matrix, point: Point): Point {
  return {
    x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
    y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
  };
}

export function translate(tx: number, ty: number): Matrix {
  return [1, 0, 0, 1, tx, ty];
}

export function scale(sx: number, sy: number = sx): Matrix {
  return [sx, 0, 0, sy, 0, 0];
}

/** Rotation in radians; positive is clockwise on screen (y grows downward). */
export function rotate(radians: number): Matrix {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [cos, sin, -sin, cos, 0, 0];
}

/** Returns null for non-invertible matrices (zero determinant). */
export function invert(matrix: Matrix): Matrix | null {
  const det = matrix[0] * matrix[3] - matrix[2] * matrix[1];
  if (!Number.isFinite(det) || det === 0) return null;
  const inv = 1 / det;
  return [
    matrix[3] * inv,
    -matrix[1] * inv,
    -matrix[2] * inv,
    matrix[0] * inv,
    (matrix[2] * matrix[5] - matrix[3] * matrix[4]) * inv,
    (matrix[1] * matrix[4] - matrix[0] * matrix[5]) * inv,
  ];
}

/** Transform applied around an anchor point: translate(anchor) · matrix · translate(-anchor). */
export function around(anchor: Point, matrix: Matrix): Matrix {
  return multiply(multiply(translate(anchor.x, anchor.y), matrix), translate(-anchor.x, -anchor.y));
}

/** Decomposes scale from a matrix; returns 0 for degenerate matrices. */
export function scaleOf(matrix: Matrix): number {
  const sx = Math.hypot(matrix[0], matrix[1]);
  const sy = Math.hypot(matrix[2], matrix[3]);
  return (sx + sy) / 2;
}

/** Serializes to a CSS `matrix()` value usable in `transform`. */
export function toCssMatrix(matrix: Matrix): string {
  return `matrix(${matrix.join(',')})`;
}
