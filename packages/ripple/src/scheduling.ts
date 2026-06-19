import type { ComputedBase, ReactiveBase } from './reactive-base';
import type { Subscriber } from './types';

import { warn } from './_warn';
import { runAll, StateError } from './error';

export const DEFAULT_MAX_ITERATIONS = 100;

// NOTE: These are module-level singletons. In SSR environments with concurrent requests,
// signal writes from different requests share the same flush queue. The /ripple/ssr
// sub-path isolates reactive *tracking* per request via AsyncLocalStorage, but does NOT
// isolate the flush queue. Use one Node.js worker (or isolate) per concurrent request.
let batchDepth = 0;
let ssrWarnFired = false;
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

// Hoisted to module level to avoid allocations on every signal write in the hot path.
// Epoch-based visited marking — _propEpoch is incremented on each propagation call.
// Each computed node stores its lastPropEpoch_; if it matches the current epoch it was
// already visited this propagation. No Set needed — no cleanup required, no corruption
// risk if an exception interrupts mid-traversal.
let _propEpoch = 0;
const _propagateStack: ComputedBase<unknown>[] = [];

const propagateDirty = (node: {
  computedSubs(): Generator<ComputedBase<unknown>>;
  effectSubs(): ReadonlySet<Subscriber>;
}): void => {
  const epoch = ++_propEpoch;

  // Queue direct effect subs of the changed node
  for (const sub of node.effectSubs()) {
    pendingSubscribers.add(sub);
  }

  for (const c of node.computedSubs()) {
    _propagateStack.push(c);
  }

  try {
    while (_propagateStack.length > 0) {
      const c = _propagateStack.pop()!;

      if (c.lastPropEpoch_ === epoch) continue;

      c.lastPropEpoch_ = epoch;

      if (!c.markDirty()) continue; // already dirty — already processed

      // If this computed has effect subs, defer recompute to the pull phase.
      // We cannot queue them immediately because the computed might not change.
      if (c.effectSubs().size > 0) {
        dirtyWithEffectSubs.add(c);
      }

      for (const downstream of c.computedSubs()) {
        _propagateStack.push(downstream);
      }
    }
  } finally {
    _propagateStack.length = 0;
  }
};

const recomputeWithEffectSubs = (): void => {
  // Iterate until stable — recomputing one computed may dirty others.
  while (dirtyWithEffectSubs.size > 0) {
    const toProcess = [...dirtyWithEffectSubs];

    dirtyWithEffectSubs.clear();

    for (const c of toProcess) {
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

const flushEffects = (): void => {
  let iterations = 0;

  while (pendingSubscribers.size > 0 || dirtyWithEffectSubs.size > 0) {
    if (++iterations > DEFAULT_MAX_ITERATIONS) {
      throw new StateError('INFINITE_LOOP', `infinite flush loop (> ${DEFAULT_MAX_ITERATIONS} iterations)`);
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

  if (!ssrWarnFired && typeof window === 'undefined') {
    ssrWarnFired = true;
    warn(
      'Signal updated in a server environment. The module-level flush queue is shared across concurrent requests ' +
        '— use per-request worker isolation or the @vielzeug/ripple/ssr sub-path for tracking isolation.',
    );
  }

  propagateDirty(node);

  if (batchDepth === 0) flushEffects();
};

export const batch = <T>(fn: () => T): T => {
  batchDepth++;

  let result: T;

  try {
    result = fn();
  } catch (e) {
    batchDepth--;

    // Outermost batch: clear the pending flush queue on body error.
    // Leaving stale subscribers in the queue would flush them on the next unrelated
    // signal write, surfacing errors in unexpected contexts.
    if (batchDepth === 0) {
      pendingSubscribers.clear();
      dirtyWithEffectSubs.clear();
    }

    throw e;
  }

  batchDepth--;

  if (batchDepth === 0) flushEffects();

  return result;
};
