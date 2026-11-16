import { fmt } from './_format.js';
import { WireConfigError } from './errors.js';
import type { Point, PortSide } from './types.js';

/** Default control-point distance for `bezierRoute()` when `offset` is omitted. */
const DEFAULT_OFFSET = 40;

const SIDE_VECTOR: Readonly<Record<PortSide, Point>> = {
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
};

/** Configuration for `bezierRoute()`. */
export interface BezierRouteOptions {
  /** Distance each control point extends outward from its port along the port side. Defaults to 40. */
  offset?: number;
}

/**
 * Builds a cubic bezier SVG path `d` string between two ports.
 *
 * Control points extend outward from each port along its side; a missing `side` is
 * inferred as `right` for `from` and `left` for `to`, matching left-to-right flows.
 */
export function bezierRoute(
  from: Point & { side?: PortSide },
  to: Point & { side?: PortSide },
  options: BezierRouteOptions = {},
): string {
  const offset = options.offset ?? DEFAULT_OFFSET;
  if (!Number.isFinite(offset) || offset < 0) {
    throw new WireConfigError(`Bezier offset must be a finite non-negative number, received ${String(offset)}.`);
  }

  const fromSide = from.side ?? 'right';
  const toSide = to.side ?? 'left';
  const fromVector = SIDE_VECTOR[fromSide];
  const toVector = SIDE_VECTOR[toSide];

  const c1x = from.x + fromVector.x * offset;
  const c1y = from.y + fromVector.y * offset;
  const c2x = to.x + toVector.x * offset;
  const c2y = to.y + toVector.y * offset;

  return `M ${fmt(from.x)} ${fmt(from.y)} C ${fmt(c1x)} ${fmt(c1y)}, ${fmt(c2x)} ${fmt(c2y)}, ${fmt(to.x)} ${fmt(to.y)}`;
}
