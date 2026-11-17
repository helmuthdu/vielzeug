/** @vielzeug/ink: shared public type definitions. */

/** A two-dimensional point. Structural so canvas-toolkit packages can share it without importing each other. */
export type Point = Readonly<{ x: number; y: number }>;

/** A sampled point along a freehand stroke. `pressure` is normalized to `[0, 1]` when present. */
export type StrokePoint = Readonly<{ x: number; y: number; pressure?: number }>;
