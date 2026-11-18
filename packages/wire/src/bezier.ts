import { SIDE_VECTOR } from './_sides.js';
import { WireConfigError } from './errors.js';
import type { CubicBezier, PortAnchor } from './types.js';

/** Default control-point distance for `bezierRoute()` when `handleLength` is omitted. */
const DEFAULT_HANDLE_LENGTH = 40;

/** Configuration for `bezierRoute()`. */
export interface BezierRouteOptions {
  /** Distance each control point extends outward from its port along the port side. Defaults to 40. */
  handleLength?: number;
  /**
   * Widen the handles so an edge whose endpoints sit on the same side of one
   * node forms a visible loop instead of collapsing onto that side. When the
   * ports share a side, each handle grows to `1.5 *` the distance between the
   * ports (never smaller than `handleLength`), keeping the loop symmetric and
   * deterministic. Ignored when the ports face different sides. Defaults to false.
   */
  selfLoop?: boolean;
}

/** Multiplier applied to the port spacing when `selfLoop` widens the handles. */
const SELF_LOOP_HANDLE_RATIO = 1.5;

/**
 * Builds a cubic bezier segment between two ports.
 *
 * Control points extend outward from each port along its side, so the curve leaves
 * and enters ports perpendicular to the node edge. With `selfLoop` and both ports
 * on the same side, the handles stretch to `1.5 *` the port spacing so the curve
 * bulges outward into a loop.
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

  let effectiveHandle = handleLength;
  if (options.selfLoop && from.side === to.side) {
    const spacing = Math.hypot(to.x - from.x, to.y - from.y);
    effectiveHandle = Math.max(handleLength, spacing * SELF_LOOP_HANDLE_RATIO);
  }

  return {
    c1: { x: from.x + fromVector.x * effectiveHandle, y: from.y + fromVector.y * effectiveHandle },
    c2: { x: to.x + toVector.x * effectiveHandle, y: to.y + toVector.y * effectiveHandle },
    from: { x: from.x, y: from.y },
    to: { x: to.x, y: to.y },
  };
}
