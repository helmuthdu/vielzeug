import type { ComputedBase, ReactiveBase } from './reactive-base';
import type { Subscriber } from './types';

import { runAll } from './_error-utils';
import { warn } from './_warn';
import { RippleInfiniteLoopError } from './errors';
import { getSchedulingState, hasContextHook, type SchedulingState } from './tracking';

export const DEFAULT_MAX_ITERATIONS = 100;

// batchDepth, pendingSubscribers, and the dirty-computed sets live in `SchedulingState`
// (see tracking.ts) rather than as module-level variables — this lets the /ripple/ssr
// sub-path isolate the flush queue per request (via the same AsyncLocalStorage-backed
// context hook that already isolates tracking), closing the gap where concurrent SSR
// requests previously shared one flush queue. Outside SSR (no hook installed), this is
// a single module-level singleton with identical behavior and cost to before.
let ssrWarnFired = false;

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

// Module-level scratch state — safe to share even under SSR isolation. Both are only
// touched within a single synchronous call stack (no `await` inside propagateDirty /
// recomputeWithEffectSubs / flushEffects), which JS's run-to-completion model already
// isolates; they never carry information across two separate top-level signal writes.
let _propEpoch = 0;
const _propagateStack: ComputedBase<unknown>[] = [];

/** Returns (and possibly swaps) the currently-active dirty-with-effect-subs set. */
const activeDirtySet = (s: SchedulingState): Set<ComputedBase<unknown>> =>
  s.activeDirty === 'a' ? s.dirtyWithEffectSubsA : s.dirtyWithEffectSubsB;

const propagateDirty = (
  s: SchedulingState,
  node: {
    computedSubs(): Generator<ComputedBase<unknown>>;
    effectSubs(): ReadonlySet<Subscriber>;
  },
): void => {
  const epoch = ++_propEpoch;

  // Queue direct effect subs of the changed node
  for (const sub of node.effectSubs()) {
    s.pendingSubscribers.add(sub);
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
        activeDirtySet(s).add(c);
      }

      for (const downstream of c.computedSubs()) {
        _propagateStack.push(downstream);
      }
    }
  } finally {
    _propagateStack.length = 0;
  }
};

const recomputeWithEffectSubs = (s: SchedulingState): void => {
  // Iterate until stable — recomputing one computed may dirty others.
  // Set-swap pattern: swap active/idle sets each pass so new dirty nodes accumulate
  // in the idle set while we iterate the current batch — zero array allocations.
  while (activeDirtySet(s).size > 0) {
    const toProcess = activeDirtySet(s);

    // Swap: new dirty nodes from this iteration go into the other set
    s.activeDirty = s.activeDirty === 'a' ? 'b' : 'a';
    activeDirtySet(s).clear();

    for (const c of toProcess) {
      if (!c.hasSubscribers()) continue;

      const changed = c.refreshIfDirty();

      if (!changed) continue;

      // Value changed — queue effect subs
      for (const sub of c.effectSubs()) {
        s.pendingSubscribers.add(sub);
      }

      // Downstream computeds may now need recomputing too
      for (const downstream of c.computedSubs()) {
        if (downstream.markDirty() && downstream.effectSubs().size > 0) {
          activeDirtySet(s).add(downstream);
        }
      }
    }

    toProcess.clear();
  }
};

const flushEffects = (s: SchedulingState): void => {
  let iterations = 0;

  while (s.pendingSubscribers.size > 0 || activeDirtySet(s).size > 0) {
    if (++iterations > DEFAULT_MAX_ITERATIONS) {
      throw new RippleInfiniteLoopError(`infinite flush loop (> ${DEFAULT_MAX_ITERATIONS} iterations)`);
    }

    if (activeDirtySet(s).size > 0) recomputeWithEffectSubs(s);

    if (s.pendingSubscribers.size === 0) continue;

    const subscribersToRun = [...s.pendingSubscribers];

    s.pendingSubscribers.clear();
    runAll(subscribersToRun, 'subscriber errors');
  }
};

// Fire the warning once per module load in environments that look like Node.js,
// and only when no SSR context hook is installed (once installed, the flush queue
// is genuinely request-isolated via SchedulingState — see tracking.ts).
// window-check is unreliable (jsdom sets window in tests); check for process.versions instead.
// Access entirely via globalThis to avoid requiring @types/node in downstream tsconfigs.
const isNodeLike = (globalThis as { process?: { versions?: unknown } }).process?.versions != null;

export const notifyNodeChange = (node: ReactiveBase<unknown>): void => {
  if (!node.hasSubscribers()) return;

  if (!ssrWarnFired && isNodeLike && !hasContextHook()) {
    ssrWarnFired = true;
    warn(
      'Signal updated in a Node.js-like environment. The module-level flush queue is shared across concurrent requests ' +
        '— use per-request worker isolation or the @vielzeug/ripple/ssr sub-path for request-isolated scheduling.',
    );
  }

  const s = getSchedulingState();

  propagateDirty(s, node);

  if (s.batchDepth === 0) flushEffects(s);
};

export const batch = <T>(fn: () => T): T => {
  const s = getSchedulingState();

  s.batchDepth++;

  let result: T;

  try {
    result = fn();
  } catch (e) {
    s.batchDepth--;

    // Outermost batch: clear the pending flush queue on body error.
    // Leaving stale subscribers in the queue would flush them on the next unrelated
    // signal write, surfacing errors in unexpected contexts.
    if (s.batchDepth === 0) {
      s.pendingSubscribers.clear();
      s.dirtyWithEffectSubsA.clear();
      s.dirtyWithEffectSubsB.clear();
    }

    throw e;
  }

  s.batchDepth--;

  if (s.batchDepth === 0) flushEffects(s);

  return result;
};
