import type { ComputedBase } from './reactive-base';
import type { BatchOptions, Subscriber } from './types';

import { StateError } from './error';
import { ensureError, runAll } from './errors';
import { _NONE } from './symbols';

export const DEFAULT_MAX_ITERATIONS = 100;

let batchDepth = 0;
const pendingSubscribers = new Set<Subscriber>();
const dirtyQueue = new Set<ComputedBase<unknown>>();

/**
 * Topological sort of dirty computeds so upstream computeds refresh before downstream ones.
 * Uses index-based iteration (O(n)) instead of queue.shift() (O(n²)).
 */
const topoSort = (dirtyComputeds: readonly ComputedBase<unknown>[]): ComputedBase<unknown>[] => {
  if (dirtyComputeds.length <= 1) return [...dirtyComputeds];

  const pendingSet = new Set(dirtyComputeds);
  const indegree = new Map<ComputedBase<unknown>, number>();

  for (const c of dirtyComputeds) {
    indegree.set(c, 0);
  }

  for (const c of dirtyComputeds) {
    for (const downstream of c.computedSubs()) {
      if (!pendingSet.has(downstream)) continue;

      indegree.set(downstream, (indegree.get(downstream) ?? 0) + 1);
    }
  }

  const queue: ComputedBase<unknown>[] = [];

  for (const c of dirtyComputeds) {
    if ((indegree.get(c) ?? 0) === 0) queue.push(c);
  }

  const ordered: ComputedBase<unknown>[] = [];
  let i = 0;

  while (i < queue.length) {
    const c = queue[i++];

    ordered.push(c);

    for (const downstream of c.computedSubs()) {
      if (!pendingSet.has(downstream)) continue;

      const next = (indegree.get(downstream) ?? 0) - 1;

      indegree.set(downstream, next);

      if (next === 0) queue.push(downstream);
    }
  }

  // Cycle fallback: append remaining in insertion order so the cycle error is caught during recompute.
  if (ordered.length < dirtyComputeds.length) {
    const orderedSet = new Set(ordered);

    for (const c of dirtyComputeds) {
      if (!orderedSet.has(c)) ordered.push(c);
    }
  }

  return ordered;
};

const queueNode = (node: {
  computedSubs(): Iterable<ComputedBase<unknown>>;
  effectSubs(): ReadonlySet<Subscriber>;
}): void => {
  const dirtyComputeds: ComputedBase<unknown>[] = [...node.computedSubs()];
  const seenComputeds = new Set<ComputedBase<unknown>>();

  for (const subscriber of node.effectSubs()) {
    pendingSubscribers.add(subscriber);
  }

  while (dirtyComputeds.length > 0) {
    const computed = dirtyComputeds.pop()!;

    if (seenComputeds.has(computed)) continue;

    seenComputeds.add(computed);

    if (!computed.markDirty()) continue;

    dirtyQueue.add(computed);

    for (const downstream of computed.computedSubs()) {
      dirtyComputeds.push(downstream);
    }
  }
};

const flushDirtyComputeds = (): void => {
  while (dirtyQueue.size > 0) {
    const dirtyComputeds = topoSort([...dirtyQueue]);

    dirtyQueue.clear();

    for (const computed of dirtyComputeds) {
      if (!computed.hasSubscribers()) continue;

      const changed = computed.refreshIfDirty();

      if (!changed) continue;

      for (const subscriber of computed.effectSubs()) {
        pendingSubscribers.add(subscriber);
      }

      for (const downstream of computed.computedSubs()) {
        if (downstream.markDirty()) dirtyQueue.add(downstream);
      }
    }
  }
};

const flushEffects = (maxIterations: number): void => {
  let iterations = 0;

  while (pendingSubscribers.size > 0 || dirtyQueue.size > 0) {
    if (++iterations > maxIterations) {
      throw new StateError('INFINITE_LOOP', `infinite flush loop (> ${maxIterations} iterations)`);
    }

    if (dirtyQueue.size > 0) flushDirtyComputeds();

    if (pendingSubscribers.size === 0) continue;

    const subscribersToRun = [...pendingSubscribers];

    pendingSubscribers.clear();
    runAll(subscribersToRun, 'subscriber errors');
  }
};

export const notifyNodeChange = (node: {
  computedSubs(): Iterable<ComputedBase<unknown>>;
  effectSubs(): ReadonlySet<Subscriber>;
  hasSubscribers(): boolean;
}): void => {
  if (!node.hasSubscribers()) return;

  queueNode(node);

  if (batchDepth === 0) flushEffects(DEFAULT_MAX_ITERATIONS);
};

export const batch = <T>(fn: () => T, options?: BatchOptions): T => {
  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  // In nested batch() calls, only the outermost call triggers flushEffects (when batchDepth
  // reaches zero). The inner call's maxIterations is therefore ignored — the outermost
  // call's limit applies to the full flush.

  batchDepth++;

  let result: T | undefined;
  let bodyError: unknown = _NONE;

  try {
    result = fn();
  } catch (e) {
    bodyError = e;
  }

  batchDepth--;

  if (batchDepth === 0) {
    try {
      flushEffects(maxIterations);
    } catch (flushError) {
      if (bodyError !== _NONE) {
        throw new AggregateError([bodyError, flushError], '[ripple] batch error with flush errors', {
          cause: flushError,
        });
      }

      throw ensureError(flushError);
    }
  }

  if (bodyError !== _NONE) throw bodyError;

  return result as T;
};
