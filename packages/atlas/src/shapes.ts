/**
 * Shared structural shapes for the canvas toolkit. These are intentionally plain
 * readonly objects; every toolkit package declares the same shapes so consumers
 * can pass values across packages without adapters.
 */

export type Point = Readonly<{ x: number; y: number }>;

export type Size = Readonly<{ width: number; height: number }>;

export type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;

/**
 * 2D affine matrix in Canvas2D/DOMMatrix order:
 * `[a c e; b d f; 0 0 1]` — column vectors, so `apply(m, p)` is
 * `{ x: a*px + c*py + e, y: b*px + d*py + f }`.
 */
export type Matrix = readonly [a: number, b: number, c: number, d: number, e: number, f: number];
