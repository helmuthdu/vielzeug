import { WireConfigError } from './errors.js';
import type { Point, PortPoint, PortSide, Rect } from './types.js';

/** Configuration for `orthogonalRoute()`. */
export interface OrthogonalRouteOptions {
  /** Cost added per bend, on top of path length. Defaults to 12. */
  bendPenalty?: number;
  /** Rectangles the route must not cross, typically node boxes inflated by the caller. */
  obstacles?: readonly Rect[];
  /** Distance obstacles are inflated by; routes may travel along the inflated boundary. Defaults to 8. */
  padding?: number;
  /**
   * Distance the route stubs straight out of a port that names a `side` before it may
   * bend, and straight into the target port. Defaults to 16; `0` disables stubs.
   */
  stub?: number;
}

/** Grid movement directions; 0 marks the start state with no incoming direction. */
const Dir = { Down: 4, Left: 1, None: 0, Right: 2, Up: 3 } as const;
type Dir = (typeof Dir)[keyof typeof Dir];

const DELTA: Readonly<Record<Exclude<Dir, 0>, Point>> = {
  [Dir.Left]: { x: -1, y: 0 },
  [Dir.Right]: { x: 1, y: 0 },
  [Dir.Up]: { x: 0, y: -1 },
  [Dir.Down]: { x: 0, y: 1 },
};

/** Outward direction a port on the given side faces. */
const SIDE_DIR: Readonly<Record<PortSide, Exclude<Dir, 0>>> = {
  bottom: Dir.Down,
  left: Dir.Left,
  right: Dir.Right,
  top: Dir.Up,
};

const OPPOSITE: Readonly<Record<Exclude<Dir, 0>, Exclude<Dir, 0>>> = {
  [Dir.Down]: Dir.Up,
  [Dir.Left]: Dir.Right,
  [Dir.Right]: Dir.Left,
  [Dir.Up]: Dir.Down,
};

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

/** Binary heap ordered by (f, then state id) so expansion is fully deterministic. */
class OpenSet {
  private readonly items: { f: number; state: number }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(f: number, state: number): void {
    const items = this.items;
    items.push({ f, state });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent]!.f <= items[i]!.f) break;
      [items[parent], items[i]] = [
        items[i] as { f: number; state: number },
        items[parent] as { f: number; state: number },
      ];
      i = parent;
    }
  }

  pop(): number {
    const items = this.items;
    const top = items[0] as { f: number; state: number };
    const last = items.pop() as { f: number; state: number };
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < items.length && items[left]!.f < items[smallest]!.f) smallest = left;
        if (right < items.length && items[right]!.f < items[smallest]!.f) smallest = right;
        if (smallest === i) break;
        [items[i], items[smallest]] = [
          items[smallest] as { f: number; state: number },
          items[i] as { f: number; state: number },
        ];
        i = smallest;
      }
    }
    return top.state;
  }
}

/**
 * Routes a Manhattan (axis-aligned) polyline between two ports over a visibility grid
 * built from the obstacle corners, using A* with a per-bend penalty.
 *
 * Returns the waypoint polyline with `from` first and `to` last, or `null` when every
 * route is blocked. Cost is path length plus `bendPenalty` per bend, so among equal
 * length routes the one with fewer bends wins. Expansion order is fully deterministic.
 */
export function orthogonalRoute(from: PortPoint, to: PortPoint, options: OrthogonalRouteOptions = {}): Point[] | null {
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

  // Port stubs: the route leaves the source port straight along its side and enters
  // the target port along that side, so wires never peel off a port sideways.
  const fromDir = stub > 0 && from.side ? SIDE_DIR[from.side] : Dir.None;
  const toDir = stub > 0 && to.side ? SIDE_DIR[to.side] : Dir.None;

  // Straight shot: when the direct segment agrees with both port sides and is clear,
  // it is optimal by construction (also covers facing ports closer than two stubs).
  if (start.x === goal.x || start.y === goal.y) {
    const dir: Dir =
      start.x !== goal.x ? (goal.x > start.x ? Dir.Right : Dir.Left) : goal.y > start.y ? Dir.Down : Dir.Up;
    const agreesWithStart = fromDir === Dir.None || fromDir === dir;
    const agreesWithGoal = toDir === Dir.None || (OPPOSITE[toDir as Exclude<Dir, 0>] as Dir) === dir;
    if (agreesWithStart && agreesWithGoal && !spanBlocked(start, goal, obstacles)) return [start, goal];
  }

  const stubPoint = (point: Point, dir: Dir): Point => {
    if (dir === Dir.None) return point;
    const delta = DELTA[dir as Exclude<Dir, 0>];
    return { x: point.x + delta.x * stub, y: point.y + delta.y * stub };
  };
  const fromStub = stubPoint(start, fromDir);
  const toStub = stubPoint(goal, toDir);
  // A stub that runs into an obstacle (or a blocked stub tip) cannot be honored;
  // route without stubs instead of failing.
  const stubsUsable =
    (fromDir === Dir.None || !spanBlocked(start, fromStub, obstacles)) &&
    (toDir === Dir.None || !spanBlocked(goal, toStub, obstacles));

  const routeStart = stubsUsable ? fromStub : start;
  const routeGoal = stubsUsable ? toStub : goal;
  const startDir = stubsUsable ? fromDir : Dir.None;
  // The route must not arrive at the goal stub moving along the port's outward
  // direction (that would overshoot the port and double back); any other incoming
  // direction continues smoothly into the final stub segment.
  const forbiddenIncoming = stubsUsable && toDir !== Dir.None ? (toDir as Dir) : (Dir.None as Dir);

  // Grid lines: every obstacle edge plus the endpoints' own rows and columns.
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
  const stateCount = nodeCount * 5;
  const gScore = new Float64Array(stateCount).fill(Number.POSITIVE_INFINITY);
  const parent = new Int32Array(stateCount).fill(-1);
  const closed = new Uint8Array(stateCount);

  const heuristic = (node: number): number => Math.abs(nodeX(node) - routeGoal.x) + Math.abs(nodeY(node) - routeGoal.y);
  const stateId = (node: number, dir: Dir): number => node * 5 + dir;

  const open = new OpenSet();
  const startState = stateId(startNode, startDir);
  gScore[startState] = 0;
  open.push(heuristic(startNode), startState);

  let goalState = -1;
  while (open.size > 0 && goalState === -1) {
    const current = open.pop();
    if (closed[current]) continue;
    closed[current] = 1;

    const node = Math.floor(current / 5);
    const incoming = (current % 5) as Dir;
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
      const delta = DELTA[dir as Exclude<Dir, 0>];
      const fromPoint: Point = { x: cx + delta.x * 0, y: cy + delta.y * 0 };
      const toPoint: Point = { x: nx, y: ny };
      if (spanBlocked(fromPoint, toPoint, obstacles)) continue;

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
    nodes.push(Math.floor(state / 5));
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
