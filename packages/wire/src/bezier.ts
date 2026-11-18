import { SIDE_VECTOR } from './_sides.js';
import { WireConfigError } from './errors.js';
import type { CubicBezier, PortAnchor } from './types.js';

/** Default control-point distance for `bezierRoute()` when `handleLength` is omitted. */
const DEFAULT_HANDLE_LENGTH = 40;

/** Configuration for `bezierRoute()`. */
export interface BezierRouteOptions {
  /** Distance each control point extends outward from its port along the port side. Defaults to 40. */
  handleLength?: number;
}

/**
 * Builds a cubic bezier segment between two ports.
 *
 * Control points extend outward from each port along its side, so the curve leaves
 * and enters ports perpendicular to the node edge.
 */
export function bezierRoute(from: PortAnchor, to: PortAnchor, options: BezierRouteOptions = {}): CubicBezier {
  const handleLength = options.handleLength ?? DEFAULT_HANDLE_LENGTH;
  if (!Number.isFinite(handleLength) || handleLength < 0) {
    throw new WireConfigError(
      `Bezier handleLength must be a finite non-negative number, received ${String(handleLength)}.`,
    );
  }

  const fromVector = SIDE_VECTOR[from.side];
  const toVector = SIDE_VECTOR[to.side];

  return {
    c1: { x: from.x + fromVector.x * handleLength, y: from.y + fromVector.y * handleLength },
    c2: { x: to.x + toVector.x * handleLength, y: to.y + toVector.y * handleLength },
    from: { x: from.x, y: from.y },
    to: { x: to.x, y: to.y },
  };
}
