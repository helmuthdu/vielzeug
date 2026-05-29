import type { ReactiveNode } from './node';
import type { DirtyComputed, Subscriber } from './types';

import { config } from './config';
import { StateError } from './error';
import { _NONE, ensureError, runAll } from './helpers';

let batchDepth = 0;
const pendingSubscribers = new Set<Subscriber>();
const dirtyQueue = new Set<DirtyComputed>();

/**
 * Topological sort of dirty computeds so upstream computeds refresh before downstream ones.
 * Uses index-based iteration (O(n)) instead of queue.shift() (O(n²)).
 */
const topoSort = (dirtyComputeds: readonly DirtyComputed[]): DirtyComputed[] => {
  if (dirtyComputeds.length <= 1) return [...dirtyComputeds];

  const pendingSet = new Set(dirtyComputeds);
  const indegree = new Map<DirtyComputed, number>();

  for (const c of dirtyComputeds) {
    indegree.set(c, 0);
  }

  for (const c of dirtyComputeds) {
    for (const downstream of c.computedSubs()) {
      if (!pendingSet.has(downstream)) continue;

      indegree.set(downstream, (indegree.get(downstream) ?? 0) + 1);
    }
  }

  const queue: DirtyComputed[] = [];

  for (const c of dirtyComputeds) {
    if ((indegree.get(c) ?? 0) === 0) queue.push(c);
  }

  const ordered: DirtyComputed[] = [];
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

const queueNode = (node: ReactiveNode): void => {
  const dirtyComputeds: DirtyComputed[] = [...node.computedSubs()];
  const seenComputeds = new Set<DirtyComputed>();

  for (const subscriber of node.subscribers()) {
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

      for (const subscriber of computed.subscribers()) {
        pendingSubscribers.add(subscriber);
      }

      for (const downstream of computed.computedSubs()) {
        if (downstream.markDirty()) dirtyQueue.add(downstream);
      }
    }
  }
};

const flushEffects = (): void => {
  let iterations = 0;

  while (pendingSubscribers.size > 0 || dirtyQueue.size > 0) {
    if (++iterations > config.maxIterations) {
      throw new StateError('INFINITE_LOOP', `infinite flush loop (> ${config.maxIterations} iterations)`);
    }

    if (dirtyQueue.size > 0) flushDirtyComputeds();

    if (pendingSubscribers.size === 0) continue;

    const subscribersToRun = [...pendingSubscribers];

    pendingSubscribers.clear();
    runAll(subscribersToRun, 'subscriber errors');
  }
};

export const notifyNodeChange = (node: ReactiveNode): void => {
  if (!node.hasSubscribers()) return;

  queueNode(node);

  if (batchDepth === 0) flushEffects();
};

export const batch = <T>(fn: () => T): T => {
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
      flushEffects();
    } catch (flushError) {
      if (bodyError !== _NONE) {
        throw new AggregateError([bodyError, flushError], '[ripple] batch error with flush errors', {
          cause: flushError,
        });
      }

      throw ensureError(flushError);
    }
  }

  if (bodyError !== _NONE) throw ensureError(bodyError);

  return result as T;
};
