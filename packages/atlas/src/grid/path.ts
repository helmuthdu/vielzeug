/**
 * Grid search generic over a {@link GridTopology}: A* between two cells and a
 * Dijkstra flood for everything reachable within a movement budget. Costs are
 * per-entry (the start cell is never charged), so a caller can model difficult
 * terrain without the search knowing what terrain is.
 */
import { AtlasConfigError } from '../errors.js';
import type { GridTopology } from './topology.js';

/** Shared options: which cells may be entered and what entering them costs. */
export interface SearchOptions<C> {
  /** Cost of entering a cell (default 1). Must be positive and finite. */
  cost?: (coord: C) => number;
  /**
   * Returns true when a cell may be entered. The start cell is queried too.
   * The search space must be finite: `passable` has to reject the cells beyond
   * the world's edge, or a search for an unreachable goal expands forever.
   */
  passable: (coord: C) => boolean;
  /** The grid's adjacency, distance, and keying. */
  topology: GridTopology<C>;
}

/** One reached cell in a {@link reachable} flood: its cost and predecessor. */
export interface ReachEntry<C> {
  cost: number;
  prev: C | null;
}

interface QueueItem<C> {
  cell: C;
  cost: number;
  f: number;
}

/** Binary min-heap on `f`. */
function createHeap<C>(): {
  pop(): QueueItem<C> | undefined;
  push(item: QueueItem<C>): void;
  readonly size: number;
} {
  const items: QueueItem<C>[] = [];
  const key = (item: QueueItem<C>): number => item.f;
  const swap = (i: number, j: number): void => {
    const tmp = items[i];
    const at = items[j];
    if (tmp === undefined || at === undefined) return;
    items[i] = at;
    items[j] = tmp;
  };
  return {
    pop() {
      const top = items[0];
      const last = items.pop();
      if (top === undefined || last === undefined) return undefined;
      if (items.length > 0) {
        items[0] = last;
        let i = 0;
        for (;;) {
          const left = 2 * i + 1;
          const right = 2 * i + 2;
          let smallest = i;
          for (const child of [left, right]) {
            const a = items[child];
            const b = items[smallest];
            if (a !== undefined && b !== undefined && key(a) < key(b)) smallest = child;
          }
          if (smallest === i) break;
          swap(i, smallest);
          i = smallest;
        }
      }
      return top;
    },
    push(item) {
      items.push(item);
      let i = items.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        const child = items[i];
        const head = items[parent];
        if (child === undefined || head === undefined || key(child) >= key(head)) break;
        swap(i, parent);
        i = parent;
      }
    },
    get size() {
      return items.length;
    },
  };
}

function assertCost(cost: number, coord: unknown): number {
  if (!(cost > 0) || !Number.isFinite(cost)) {
    throw new AtlasConfigError(`cell cost must be a positive finite number, got ${cost} at ${String(coord)}`);
  }
  return cost;
}

/**
 * Cheapest route from `start` to `goal`, or null when none exists within
 * `maxCost`. Both endpoints must be passable; the start's cost is never
 * charged. The topology distance is the heuristic, so results are optimal
 * whenever every step costs at least 1.
 */
export function findPath<C>(start: C, goal: C, options: SearchOptions<C> & Readonly<{ maxCost?: number }>): C[] | null {
  const { topology, passable } = options;
  if (options.maxCost !== undefined && !(options.maxCost >= 0)) {
    throw new AtlasConfigError(`maxCost must be non-negative, got ${String(options.maxCost)}`);
  }
  const costOf = options.cost ?? (() => 1);
  if (!passable(start) || !passable(goal)) return null;
  const startKey = topology.key(start);
  const goalKey = topology.key(goal);
  if (startKey === goalKey) return [start];
  const budget = options.maxCost ?? Number.POSITIVE_INFINITY;

  const best = new Map<string, number>([[startKey, 0]]);
  const cameFrom = new Map<string, C>();
  const open = createHeap<C>();
  open.push({ cell: start, cost: 0, f: topology.distance(start, goal) });

  while (open.size > 0) {
    const current = open.pop();
    if (current === undefined) break;
    const currentKey = topology.key(current.cell);
    const known = best.get(currentKey);
    // A stale queue entry (a cheaper path arrived after it was queued) is skipped.
    if (known === undefined || known < current.cost) continue;
    if (currentKey === goalKey) {
      const path: C[] = [current.cell];
      let cell = current.cell;
      for (;;) {
        const prev = cameFrom.get(topology.key(cell));
        if (prev === undefined) break;
        path.push(prev);
        cell = prev;
        if (topology.key(cell) === startKey) break;
      }
      return path.reverse();
    }
    for (const next of topology.neighbors(current.cell)) {
      if (!passable(next)) continue;
      const step = assertCost(costOf(next), next);
      const g = current.cost + step;
      if (g > budget) continue;
      const nextKey = topology.key(next);
      const previous = best.get(nextKey);
      if (previous !== undefined && previous <= g) continue;
      best.set(nextKey, g);
      cameFrom.set(nextKey, current.cell);
      open.push({ cell: next, cost: g, f: g + topology.distance(next, goal) });
    }
  }
  return null;
}

/**
 * Every cell reachable from `start` within `budget`, keyed by cell, each with
 * its cheapest cost and predecessor. Rebuild a route by walking `prev` back
 * from any entry. The start is included with cost 0 and `prev: null`; an
 * impassable start reaches nothing but itself.
 */
export function reachable<C>(start: C, budget: number, options: SearchOptions<C>): Map<string, ReachEntry<C>> {
  if (!(budget >= 0) || !Number.isFinite(budget)) {
    throw new AtlasConfigError(`movement budget must be a finite non-negative number, got ${budget}`);
  }
  const { topology, passable } = options;
  const costOf = options.cost ?? (() => 1);
  const out = new Map<string, ReachEntry<C>>([[topology.key(start), { cost: 0, prev: null }]]);
  if (!passable(start)) return out;
  const open = createHeap<C>();
  open.push({ cell: start, cost: 0, f: 0 });
  while (open.size > 0) {
    const current = open.pop();
    if (current === undefined) break;
    const entry = out.get(topology.key(current.cell));
    if (entry === undefined || entry.cost < current.cost) continue;
    for (const next of topology.neighbors(current.cell)) {
      if (!passable(next)) continue;
      const step = assertCost(costOf(next), next);
      const cost = current.cost + step;
      if (cost > budget) continue;
      const nextKey = topology.key(next);
      const known = out.get(nextKey);
      if (known !== undefined && known.cost <= cost) continue;
      out.set(nextKey, { cost, prev: current.cell });
      open.push({ cell: next, cost, f: cost });
    }
  }
  return out;
}
