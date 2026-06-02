import type { ComputedBase, ReactiveBase } from './reactive-base';
import type { BatchOptions, Subscriber } from './types';

import { ensureError, runAll, StateError } from './error';
import { _NONE } from './symbols';

export const DEFAULT_MAX_ITERATIONS = 100;

let batchDepth = 0;
const pendingSubscribers = new Set<Subscriber>();
const dirtyWithEffectSubs = new Set<ComputedBase<unknown>>();

// ── F1: Simplified flush — no topological sort ─────────────────────────────
//
// Push phase (propagateDirty):
//   Mark all downstream computeds dirty in a BFS pass.
//   Directly collect effect subscribers of the changed signal.
//   For computeds with direct effect subscribers, defer to the pull phase.
//
// Pull phase (recomputeWithEffectSubs):
//   For each dirty computed that has direct effect subscribers, recompute it.
//   If the value changed, queue its effect subscribers.
//   Any further downstream dirty computeds with effect subs are handled in the
//   same loop (re-queued into dirtyWithEffectSubs if they become dirty during
//   a parent recompute).
//
// Effect phase: run all queued effect subscribers.
//
// This eliminates the O(n²) topo sort while preserving the equality-suppression
// guarantee: effect subs of a computed are only notified when the computed's
// value actually changes.
//
// Computeds without direct effect subs (pure lazy nodes) are still pulled
// lazily when an effect reads them during re-run.

const propagateDirty = (node: {
  computedSubs(): Iterable<ComputedBase<unknown>>;
  effectSubs(): ReadonlySet<Subscriber>;
}): void => {
  // Queue direct effect subs of the changed node
  for (const sub of node.effectSubs()) {
    pendingSubscribers.add(sub);
  }

  const stack: ComputedBase<unknown>[] = [...node.computedSubs()];
  const seen = new Set<ComputedBase<unknown>>();

  while (stack.length > 0) {
    const c = stack.pop()!;

    if (seen.has(c)) continue;

    seen.add(c);

    if (!c.markDirty()) continue; // already dirty — already processed

    // If this computed has effect subs, defer recompute to the pull phase.
    // We cannot queue them immediately because the computed might not change.
    if (c.effectSubs().size > 0) {
      dirtyWithEffectSubs.add(c);
    }

    for (const downstream of c.computedSubs()) {
      stack.push(downstream);
    }
  }
};

const recomputeWithEffectSubs = (): void => {
  // Iterate until stable — recomputing one computed may dirty others.
  while (dirtyWithEffectSubs.size > 0) {
    const batch = [...dirtyWithEffectSubs];

    dirtyWithEffectSubs.clear();

    for (const c of batch) {
      if (!c.hasSubscribers()) continue;

      const changed = c.refreshIfDirty();

      if (!changed) continue;

      // Value changed — queue effect subs
      for (const sub of c.effectSubs()) {
        pendingSubscribers.add(sub);
      }

      // Downstream computeds may now need recomputing too
      for (const downstream of c.computedSubs()) {
        if (downstream.markDirty() && downstream.effectSubs().size > 0) {
          dirtyWithEffectSubs.add(downstream);
        }
      }
    }
  }
};

const flushEffects = (maxIterations: number): void => {
  let iterations = 0;

  while (pendingSubscribers.size > 0 || dirtyWithEffectSubs.size > 0) {
    if (++iterations > maxIterations) {
      throw new StateError('INFINITE_LOOP', `infinite flush loop (> ${maxIterations} iterations)`);
    }

    if (dirtyWithEffectSubs.size > 0) recomputeWithEffectSubs();

    if (pendingSubscribers.size === 0) continue;

    const subscribersToRun = [...pendingSubscribers];

    pendingSubscribers.clear();
    runAll(subscribersToRun, 'subscriber errors');
  }
};

export const notifyNodeChange = (node: ReactiveBase<unknown>): void => {
  if (!node.hasSubscribers()) return;

  propagateDirty(node);

  if (batchDepth === 0) flushEffects(DEFAULT_MAX_ITERATIONS);
};

export const batch = <T>(fn: () => T, options?: BatchOptions): T => {
  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITERATIONS;

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
