/**
 * @vielzeug/ink: freehand stroke smoothing, width profiling, and SVG path output.
 *
 * Pure, deterministic geometry functions. No DOM, no timers, no long-lived handles.
 */
export { InkConfigError, InkError } from './errors.js';
export { strokeOutline } from './outline.js';
export { simplifyStroke } from './simplify.js';
export { type SmoothStrokeOptions, smoothStroke } from './smoothing.js';
export { type StabilizeStrokeOptions, stabilizeStroke } from './stabilize.js';
export { type PolylineToSvgPathOptions, polylineToSvgPath } from './svg.js';
export type { Point, StrokePoint } from './types.js';
export { type StrokeWidthOptions, strokeWidths } from './widths.js';
