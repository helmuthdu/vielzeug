// ── Dependency tracking ────────────────────────────────────────────────────────
//
// Owns what a TrackingCtx *means* and how reactive reads (trackSource) record
// themselves into one. Where the active TrackingCtx is stored/swapped for the
// duration of a call lives in execution-context.ts — this file only knows how
// to read and replace the `tracking` field of whatever context that module hands
// back, via getExecutionContext()/runInContext().

import type { ComputedBase, ReactiveBase } from './reactive-base';
import type { CleanupFn, Subscriber } from './types';

import { getExecutionContext, getScopeCleanups, runInContext } from './execution-context';

// ── Global revision clock ─────────────────────────────────────────────────────
//
// Monotonically-increasing counter incremented on every signal write.
// ComputedImpl records the clock value after each successful recompute and uses
// it as an O(1) "nothing has changed globally" fast-path check in refreshIfDirty.

let globalRevision = 0;

export const tickRevision = (): number => ++globalRevision;
export const getRevision = (): number => globalRevision;

// ── TrackingCtx ────────────────────────────────────────────────────────────────

export type DepEntry = {
  source: ReactiveBase<unknown>;
  version: number;
};

/** Called by trackSource to observe each reactive source accessed during a tracked run. */
export type SourceObserver = (source: ReactiveBase<unknown>) => void;

// TrackingCtx carries both dep-collection state AND an optional sourceObserver.
// Putting the observer inside the context (R12) scopes it to the specific effect/computed
// run rather than making it a process-wide global — nested computed recomputes use their
// own context (no observer), so the debugEffect pattern works without identity checks.
// sourceObserver is shared across both branches and lives outside the discriminant union.
export type TrackingCtx = {
  sourceObserver?: SourceObserver;
} & (
  | {
      computed: ComputedBase<unknown>;
      depCollector: DepEntry[];
      kind: 'computed';
    }
  | {
      cleanups: CleanupFn[];
      deps: Map<ReactiveBase<unknown>, number>;
      effect: Subscriber;
      kind: 'effect';
      subscriptions: Set<CleanupFn>;
    }
);

export const getTracking = (): TrackingCtx | null => getExecutionContext().tracking;

export const withTracking = <T>(tracking: TrackingCtx | null, fn: () => T): T => runInContext({ tracking }, fn);

// ── Auto-disposal ───────────────────────────────────────────────────────────────
//
// Shared by every primitive that ties its own lifetime to the context it was
// created in (computed(), resource()): dispose when the enclosing effect re-runs
// or disposes, or — if not inside an effect — when the enclosing scope disposes.
// No-op if neither is active (the caller owns disposal directly).
//
// Why signal() and store() don't call this: computed()/resource() are *derived*
// computations — recreating one on every effect re-run is normal and cheap, so
// tying their lifetime to the enclosing context avoids leaking a fresh graph
// node per run. signal()/store() hold raw, caller-owned state that is typically
// created once and read across many effect re-runs; auto-disposing it on the
// first re-run would silently break any effect that reads a signal it declared
// itself. Callers who genuinely want scope-scoped state should use
// `scope.add(() => mySignal.dispose())` explicitly.

/**
 * Registers `dispose` to run when the enclosing effect re-runs/disposes, or —
 * if there is no enclosing effect — when the enclosing scope disposes.
 */
export const autoRegisterDisposal = (dispose: CleanupFn): void => {
  const ctx = getTracking();

  if (ctx?.kind === 'effect') {
    ctx.cleanups.push(dispose);
  } else {
    getScopeCleanups()?.push(dispose);
  }
};

// ── Source observer ───────────────────────────────────────────────────────────
//
// Observer is scoped to the active TrackingCtx instead of a process-wide global.
// This means it only fires for direct deps of the current effect/computed — nested
// computed recomputes use their own context (no observer) so no identity check needed.

/**
 * Runs `fn` while calling `observer` for every reactive source directly accessed.
 * Used by `debugEffect` to detect which sources changed between runs.
 * No-op if called outside an active tracking context.
 */
export const withSourceObserver = <T>(observer: SourceObserver, fn: () => T): T => {
  const current = getTracking();

  if (current === null) return fn();

  return withTracking({ ...current, sourceObserver: observer }, fn);
};

// ── untrack ───────────────────────────────────────────────────────────────────

/**
 * Runs `fn` without recording any reactive reads as dependencies of the enclosing
 * effect or computed. Useful when you need to read reactive state "silently".
 *
 * @example
 * ```ts
 * effect(() => {
 *   const a = count.value;               // tracked
 *   const b = untrack(() => name.value); // NOT tracked — no re-run when name changes
 * });
 * ```
 */
export const untrack = <T>(fn: () => T): T => withTracking(null, fn);

// ── trackSource ───────────────────────────────────────────────────────────────
//
// Records `source` as a dependency of the currently active tracking context.
// For computed contexts: only records the dep entry — addComputedSub is called
// later by updateDeps() in computed.ts (only for genuinely NEW deps, preventing
// duplicate WeakRef entries).
// For effect contexts: immediately subscribes the effect to the source and
// records the dep for getDependencies().

export const trackSource = (source: ReactiveBase<unknown>): void => {
  const ctx = getTracking();

  if (ctx === null) return;

  ctx.sourceObserver?.(source);

  if (ctx.kind === 'computed') {
    ctx.depCollector.push({ source, version: source.version });
  } else if (ctx.kind === 'effect') {
    const owner = ctx.effect;

    source.addEffectSub(owner);
    ctx.subscriptions.add(() => source.removeEffectSub(owner));
    ctx.deps.set(source, source.version);
  }
};
