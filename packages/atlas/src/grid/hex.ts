/**
 * Hex-grid math on axial coordinates. A hex is `{ q, r }`; the third cube axis
 * is derived (`s = -q - r`), so distance and rounding stay exact without
 * storing it. Layouts are pointy- or flat-topped with a world-unit radius
 * (`size` = centre to corner), and the conversion pair is an exact inverse:
 * `worldToHex(hexToWorld(h, l), l)` returns `h` for every hex.
 */
import { AtlasConfigError } from '../errors.js';
import type { Point, Rect } from '../shapes.js';
import type { GridTopology } from './topology.js';

/** A hex addressed by axial coordinates (`s` is always `-q - r`). */
export type HexCoord = Readonly<{ q: number; r: number }>;

/** How hexes map to world space: `size` is the centre-to-corner radius. */
export type HexLayout = Readonly<{
  orientation: 'flat' | 'pointy';
  size: number;
}>;

const SQRT3 = Math.sqrt(3);

/** The six axial neighbour directions, in clockwise order from east. */
export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

function assertLayout(layout: HexLayout): void {
  if (!(layout.size > 0)) {
    throw new AtlasConfigError(`hex layout.size must be positive, got ${layout.size}`);
  }
  if (layout.orientation !== 'flat' && layout.orientation !== 'pointy') {
    throw new AtlasConfigError(`hex layout.orientation must be "flat" or "pointy", got ${String(layout.orientation)}`);
  }
}

function assertHex(coord: HexCoord): void {
  if (!Number.isInteger(coord.q) || !Number.isInteger(coord.r)) {
    throw new AtlasConfigError(`hex coordinates must be integers, got (${coord.q}, ${coord.r})`);
  }
}

/** The world centre of a hex. */
export function hexToWorld(coord: HexCoord, layout: HexLayout): Point {
  assertLayout(layout);
  assertHex(coord);
  if (layout.orientation === 'pointy') {
    return { x: layout.size * SQRT3 * (coord.q + coord.r / 2), y: layout.size * 1.5 * coord.r };
  }
  return { x: layout.size * 1.5 * coord.q, y: layout.size * SQRT3 * (coord.r + coord.q / 2) };
}

/** The hex whose centre is nearest to a world point. */
export function worldToHex(point: Point, layout: HexLayout): HexCoord {
  assertLayout(layout);
  const fq =
    layout.orientation === 'pointy'
      ? ((SQRT3 / 3) * point.x) / layout.size - point.y / (3 * layout.size)
      : ((2 / 3) * point.x) / layout.size;
  const fr =
    layout.orientation === 'pointy'
      ? ((2 / 3) * point.y) / layout.size
      : -point.x / (3 * layout.size) + ((SQRT3 / 3) * point.y) / layout.size;
  return cubeRound(fq, fr);
}

/** Rounds fractional axial coordinates to the nearest hex (cube rounding). */
function cubeRound(q: number, r: number): HexCoord {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  // The axis with the smallest rounding error is derived from the other two.
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

/** The six corner points of a hex, in clockwise order from the first corner. */
export function hexCorners(coord: HexCoord, layout: HexLayout): readonly Point[] {
  assertLayout(layout);
  const center = hexToWorld(coord, layout);
  const start = layout.orientation === 'pointy' ? 30 : 0;
  return Array.from({ length: 6 }, (_, i) => {
    const angle = ((start + 60 * i) * Math.PI) / 180;
    return { x: center.x + layout.size * Math.cos(angle), y: center.y + layout.size * Math.sin(angle) };
  });
}

/** A stable string key for a hex, e.g. `"3:-1"`. */
export function hexKey(coord: HexCoord): string {
  return `${String(coord.q)}:${String(coord.r)}`;
}

/** The number of hex steps between two hexes. */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** The six hexes adjacent to a hex. */
export function hexNeighbors(coord: HexCoord): readonly HexCoord[] {
  return HEX_DIRECTIONS.map((d) => ({ q: coord.q + d.q, r: coord.r + d.r }));
}

/** Every hex within `radius` steps of a centre, centre included (`1 + 3n(n+1)`). */
export function hexRange(center: HexCoord, radius: number): readonly HexCoord[] {
  if (!Number.isInteger(radius) || radius < 0) {
    throw new AtlasConfigError(`hex radius must be a non-negative integer, got ${radius}`);
  }
  const out: HexCoord[] = [];
  for (let dq = -radius; dq <= radius; dq += 1) {
    const rMin = Math.max(-radius, -dq - radius);
    const rMax = Math.min(radius, -dq + radius);
    for (let r = rMin; r <= rMax; r += 1) out.push({ q: center.q + dq, r: center.r + r });
  }
  return out;
}

/**
 * The hexes a straight walk from `a` to `b` crosses, both ends included. The
 * interpolation is nudged a hair off exact hex edges so a line that grazes a
 * shared corner resolves to the same cells in both directions.
 */
export function hexLine(a: HexCoord, b: HexCoord): readonly HexCoord[] {
  const n = hexDistance(a, b);
  if (n === 0) return [{ q: a.q, r: a.r }];
  // Walk from one canonical endpoint so reversing the pair gives the same
  // cells in reverse order; float drift at a corner can otherwise round the
  // two directions onto different hexes.
  const forward = a.q < b.q || (a.q === b.q && a.r <= b.r);
  const from = forward ? a : b;
  const to = forward ? b : a;
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  // 1e-7 hexes per step: far below any float drift, far above a real grazing.
  const eps = 1e-7;
  const q0 = from.q + eps * Math.sign(dq);
  const r0 = from.r + eps * Math.sign(dr);
  const q1 = to.q - eps * Math.sign(dq);
  const r1 = to.r - eps * Math.sign(dr);
  const out: HexCoord[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    out.push(cubeRound(q0 + (q1 - q0) * t, r0 + (r1 - r0) * t));
  }
  return forward ? out : out.reverse();
}

/**
 * The hexes overlapping a world rect, in axial column-major order. The rect's
 * corners map to axial space, and the bounds carry one hex of slack so no
 * partially visible hex is dropped.
 */
export function visibleHexes(view: Rect, layout: HexLayout): readonly HexCoord[] {
  assertLayout(layout);
  const corners: Point[] = [
    { x: view.x, y: view.y },
    { x: view.x + view.width, y: view.y },
    { x: view.x, y: view.y + view.height },
    { x: view.x + view.width, y: view.y + view.height },
  ];
  let minQ = Infinity;
  let maxQ = -Infinity;
  let minR = Infinity;
  let maxR = -Infinity;
  for (const corner of corners) {
    const hex = worldToHex(corner, layout);
    if (hex.q < minQ) minQ = hex.q;
    if (hex.q > maxQ) maxQ = hex.q;
    if (hex.r < minR) minR = hex.r;
    if (hex.r > maxR) maxR = hex.r;
  }
  const out: HexCoord[] = [];
  for (let q = minQ - 1; q <= maxQ + 1; q += 1) {
    for (let r = minR - 1; r <= maxR + 1; r += 1) out.push({ q, r });
  }
  return out;
}

/**
 * Hexes within `radius` of the origin that a straight line reaches without
 * crossing a blocker. A blocking hex is itself visible when the path to it is
 * clear: you can look at a wall you face.
 */
export function computeHexFov(
  origin: HexCoord,
  radius: number,
  options: Readonly<{ blocks?: (coord: HexCoord) => boolean }> = {},
): Set<string> {
  if (!Number.isInteger(radius) || radius < 0) {
    throw new AtlasConfigError(`hex FOV radius must be a non-negative integer, got ${radius}`);
  }
  const blocks = options.blocks ?? (() => false);
  const lit = new Set<string>([hexKey(origin)]);
  for (const hex of hexRange(origin, radius)) {
    if (hexDistance(origin, hex) === 0) continue;
    const path = hexLine(origin, hex);
    let clear = true;
    for (let i = 1; i < path.length - 1; i += 1) {
      const step = path[i];
      if (step && blocks(step)) {
        clear = false;
        break;
      }
    }
    if (clear) lit.add(hexKey(hex));
  }
  return lit;
}

/** The {@link GridTopology} for hex grids: six neighbours, hex distance, hex lines. */
export const hexTopology: GridTopology<HexCoord> = {
  distance: hexDistance,
  key: hexKey,
  line: hexLine,
  neighbors: hexNeighbors,
};
