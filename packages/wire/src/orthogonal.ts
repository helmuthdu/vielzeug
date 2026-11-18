import { MinHeap } from './_heap.js';
import { DELTA, Dir, type Move, OPPOSITE, SIDE_DIR, SIDE_VECTOR } from './_sides.js';
import { WireConfigError } from './errors.js';
import type { Point, PortAnchor, PortSide, Rect } from './types.js';

/** Configuration for `orthogonalRoute()`. */
export interface OrthogonalRouteOptions {
  /** Cost added per bend, on top of path length. Defaults to 12. */
  bendPenalty?: number;
  /**
   * Rectangles the route must not cross — typically every node's raw bounding box.
   * `padding` supplies the clearance, so do not inflate the rects yourself. The
   * obstacles a port sits inside are exempted for that port's straight exit segment
   * only; the rest of the route still avoids them.
   */
  obstacles?: readonly Rect[];
  /** Distance obstacles are inflated by; routes may travel along the inflated boundary. Defaults to 8. */
  padding?: number;
  /**
   * Distance the route runs straight out of a port before it may bend, and straight
   * into the target port. Defaults to 16; `0` disables the directional stubs (a port
   * inside an obstacle still exits straight to clear it).
   */
  stub?: number;
}

/** Number of direction slots packed per grid node in a state id (`node * DIR_COUNT + dir`). */
const DIR_COUNT = 5;

interface PaddedRect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function padRect(rect: Rect, padding: number): PaddedRect {
  return {
    x0: rect.x - padding,
    x1: rect.x + rect.width + padding,
    y0: rect.y - padding,
    y1: rect.y + rect.height + padding,
  };
}

/** A point exactly on a padded boundary is free: routes are allowed to hug obstacle margins. */
function pointBlocked(px: number, py: number, obstacles: readonly PaddedRect[]): boolean {
  for (const rect of obstacles) {
    if (px > rect.x0 && px < rect.x1 && py > rect.y0 && py < rect.y1) return true;
  }
  return false;
}

/** Whether the open axis-aligned span from `a` to `b` passes through an obstacle interior. */
function spanBlocked(a: Point, b: Point, obstacles: readonly PaddedRect[]): boolean {
  const xLow = Math.min(a.x, b.x);
  const xHigh = Math.max(a.x, b.x);
  const yLow = Math.min(a.y, b.y);
  const yHigh = Math.max(a.y, b.y);
  for (const rect of obstacles) {
    if (yLow === yHigh) {
      if (yLow > rect.y0 && yLow < rect.y1 && xLow < rect.x1 && rect.x0 < xHigh) return true;
    } else if (xLow === xHigh && xLow > rect.x0 && xLow < rect.x1 && yLow < rect.y1 && rect.y0 < yHigh) {
      return true;
    }
  }
  return false;
}

/** Obstacles whose padded interior contains `point` — the obstacles that "own" the port. */
function ownersOf(point: Point, obstacles: readonly PaddedRect[]): PaddedRect[] {
  return obstacles.filter((rect) => pointBlocked(point.x, point.y, [rect]));
}

/**
 * Distance from `point` to the padded boundary of `owners`, measured along `dir`.
 * Zero when the point is outside every owner.
 */
function escapeDistance(point: Point, dir: Move, owners: readonly PaddedRect[]): number {
  const delta = DELTA[dir];
  let distance = 0;
  for (const rect of owners) {
    const along =
      delta.x > 0
        ? rect.x1 - point.x
        : delta.x < 0
          ? point.x - rect.x0
          : delta.y > 0
            ? rect.y1 - point.y
            : point.y - rect.y0;
    if (along > distance) distance = along;
  }
  return distance;
}

/**
 * Routes a Manhattan (axis-aligned) polyline between two ports over a visibility grid
 * built from the obstacle corners, using A* with a per-bend penalty.
 *
 * Pass every node's raw rect as `obstacles`; `padding` supplies the clearance. A port
 * that sits inside an obstacle (its own node, since ports are on node boundaries) is
 * exempted only for the straight exit segment out of that port; the searched route
 * never enters any padded obstacle interior, including its own nodes.
 *
 * Returns the waypoint polyline with `from` first and `to` last, or `null` when every
 * route is blocked (including a blocked exit segment). Cost is path length plus
 * `bendPenalty` per bend, so among equal length routes the one with fewer bends wins.
 * Expansion order is fully deterministic.
 */
export function orthogonalRoute(
  from: PortAnchor,
  to: PortAnchor,
  options: OrthogonalRouteOptions = {},
): Point[] | null {
  const padding = options.padding ?? 8;
  const bendPenalty = options.bendPenalty ?? 12;
  const stub = options.stub ?? 16;
  if (!Number.isFinite(padding) || padding < 0) {
    throw new WireConfigError(`Orthogonal padding must be a finite non-negative number, received ${String(padding)}.`);
  }
  if (!Number.isFinite(bendPenalty) || bendPenalty < 0) {
    throw new WireConfigError(`Bend penalty must be a finite non-negative number, received ${String(bendPenalty)}.`);
  }
  if (!Number.isFinite(stub) || stub < 0) {
    throw new WireConfigError(`Stub must be a finite non-negative number, received ${String(stub)}.`);
  }

  const start: Point = { x: from.x, y: from.y };
  const goal: Point = { x: to.x, y: to.y };
  if (start.x === goal.x && start.y === goal.y) return [start];

  const obstacles = (options.obstacles ?? []).map((rect) => padRect(rect, padding));
  const startOwners = ownersOf(start, obstacles);
  const goalOwners = ownersOf(goal, obstacles);
  // Obstacles to check against for a segment leaving `owners`: everything except those owners.
  const othersFor = (owners: readonly PaddedRect[]): PaddedRect[] =>
    owners.length === 0 ? obstacles : obstacles.filter((rect) => !owners.includes(rect));
  const startOthers = othersFor(startOwners);
  const goalOthers = othersFor(goalOwners);

  // Port stubs: the route leaves the source port straight along its side and enters
  // the target port along that side, so wires never peel off a port sideways. A port
  // inside an obstacle always exits straight far enough to clear the obstacle margin,
  // even when `stub` is smaller than that distance (or zero).
  const fromDir = SIDE_DIR[from.side];
  const toDir = SIDE_DIR[to.side];

  // Straight shot: when the direct segment agrees with both port sides and is clear
  // of every obstacle except the endpoints' own owners, it is optimal by construction
  // (also covers facing ports closer than two stubs).
  if (start.x === goal.x || start.y === goal.y) {
    const dir: Move =
      start.x !== goal.x ? (goal.x > start.x ? Dir.Right : Dir.Left) : goal.y > start.y ? Dir.Down : Dir.Up;
    // A port with no forced exit (no stub, no owner to escape) accepts any direction.
    const agreesWithStart = (stub === 0 && startOwners.length === 0) || fromDir === dir;
    const agreesWithGoal = (stub === 0 && goalOwners.length === 0) || OPPOSITE[toDir] === dir;
    const freeSpan = obstacles.filter((rect) => !startOwners.includes(rect) && !goalOwners.includes(rect));
    if (agreesWithStart && agreesWithGoal && !spanBlocked(start, goal, freeSpan)) return [start, goal];
  }

  const exitTip = (point: Point, side: PortSide, dir: Move, owners: readonly PaddedRect[]): Point => {
    const vector = SIDE_VECTOR[side];
    const distance = Math.max(stub, escapeDistance(point, dir, owners));
    return { x: point.x + vector.x * distance, y: point.y + vector.y * distance };
  };
  const fromTip = exitTip(start, from.side, fromDir, startOwners);
  const toTip = exitTip(goal, to.side, toDir, goalOwners);

  // The exit segment may cross its own owners but no other obstacle; a blocked exit
  // means the port is walled in, so no route exists.
  if (spanBlocked(start, fromTip, startOthers)) return null;
  if (spanBlocked(goal, toTip, goalOthers)) return null;

  const routeStart = fromTip;
  const routeGoal = toTip;
  // `stub: 0` disables the directional stubs unless an owner escape forced one.
  const startDir: Dir = stub > 0 || startOwners.length > 0 ? fromDir : Dir.None;
  // The route must not arrive at the goal tip moving along the port's outward
  // direction (that would overshoot the port and double back); any other incoming
  // direction continues smoothly into the final stub segment.
  const forbiddenIncoming: Dir = stub > 0 || goalOwners.length > 0 ? toDir : Dir.None;

  // Grid lines: every obstacle edge plus the exit tips' own rows and columns.
  const xs = new Set<number>([routeStart.x, routeGoal.x]);
  const ys = new Set<number>([routeStart.y, routeGoal.y]);
  for (const rect of obstacles) {
    xs.add(rect.x0);
    xs.add(rect.x1);
    ys.add(rect.y0);
    ys.add(rect.y1);
  }
  const xLines = [...xs].sort((a, b) => a - b);
  const yLines = [...ys].sort((a, b) => a - b);
  const columns = xLines.length;
  const rows = yLines.length;
  const nodeCount = columns * rows;

  const nodeX = (node: number): number => xLines[node % columns] as number;
  const nodeY = (node: number): number => yLines[Math.floor(node / columns)] as number;
  const nodeAt = (x: number, y: number): number => yLines.indexOf(y) * columns + xLines.indexOf(x);

  const startNode = nodeAt(routeStart.x, routeStart.y);
  const goalNode = nodeAt(routeGoal.x, routeGoal.y);
  if (pointBlocked(nodeX(startNode), nodeY(startNode), obstacles)) return null;
  if (pointBlocked(nodeX(goalNode), nodeY(goalNode), obstacles)) return null;

  // State = grid node × incoming direction (Dir.None only for the start).
  const stateCount = nodeCount * DIR_COUNT;
  const gScore = new Float64Array(stateCount).fill(Number.POSITIVE_INFINITY);
  const parent = new Int32Array(stateCount).fill(-1);
  const closed = new Uint8Array(stateCount);

  const heuristic = (node: number): number => Math.abs(nodeX(node) - routeGoal.x) + Math.abs(nodeY(node) - routeGoal.y);
  const stateId = (node: number, dir: Dir): number => node * DIR_COUNT + dir;

  const open = new MinHeap();
  const startState = stateId(startNode, startDir);
  gScore[startState] = 0;
  open.push(heuristic(startNode), startState);

  let goalState = -1;
  while (open.size > 0 && goalState === -1) {
    const current = open.pop();
    if (closed[current]) continue;
    closed[current] = 1;

    const node = Math.floor(current / DIR_COUNT);
    const incoming = (current % DIR_COUNT) as Dir;
    if (node === goalNode && (forbiddenIncoming === Dir.None || incoming !== forbiddenIncoming)) {
      goalState = current;
      break;
    }

    const cx = nodeX(node);
    const cy = nodeY(node);
    const candidates: readonly [Dir, number][] = [
      [Dir.Left, node - 1],
      [Dir.Right, node + 1],
      [Dir.Up, node - columns],
      [Dir.Down, node + columns],
    ];
    for (const [dir, neighbor] of candidates) {
      // Validate grid bounds: Left/Right must stay in the same row, Up/Down in the same column.
      if (dir === Dir.Left && node % columns === 0) continue;
      if (dir === Dir.Right && node % columns === columns - 1) continue;
      if (dir === Dir.Up && node < columns) continue;
      if (dir === Dir.Down && node >= (rows - 1) * columns) continue;

      const nx = nodeX(neighbor);
      const ny = nodeY(neighbor);
      if (pointBlocked(nx, ny, obstacles)) continue;
      if (spanBlocked({ x: cx, y: cy }, { x: nx, y: ny }, obstacles)) continue;

      const step = Math.abs(nx - cx) + Math.abs(ny - cy);
      const bend = incoming !== Dir.None && incoming !== dir ? bendPenalty : 0;
      const nextScore = (gScore[current] as number) + step + bend;
      const nextState = stateId(neighbor, dir);
      if (nextScore < (gScore[nextState] as number)) {
        gScore[nextState] = nextScore;
        parent[nextState] = current;
        open.push(nextScore + heuristic(neighbor), nextState);
      }
    }
  }

  if (goalState === -1) return null;

  const nodes: number[] = [];
  for (let state = goalState; state !== -1; state = parent[state] as number) {
    nodes.push(Math.floor(state / DIR_COUNT));
  }
  nodes.reverse();

  // Collapse collinear runs so the polyline carries waypoints only at bends.
  const collapsed: Point[] = nodes
    .filter((node, i) => {
      if (i === 0 || i === nodes.length - 1) return true;
      const prev = nodes[i - 1] as number;
      const next = nodes[i + 1] as number;
      const collinear =
        (nodeX(prev) === nodeX(node) && nodeX(node) === nodeX(next)) ||
        (nodeY(prev) === nodeY(node) && nodeY(node) === nodeY(next));
      return !collinear;
    })
    .map((node) => ({ x: nodeX(node), y: nodeY(node) }));

  // Re-attach the exact ports outside the stub tips, then drop stub tips that are
  // collinear with their neighbours so a straight-through route keeps two points.
  const points = [start, ...collapsed, goal];
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1] as Point;
    const cur = points[i] as Point;
    const next = points[i + 1] as Point;
    if ((prev.x === cur.x && cur.x === next.x) || (prev.y === cur.y && cur.y === next.y)) {
      points.splice(i, 1);
      i -= 1;
    }
  }
  return points;
}
