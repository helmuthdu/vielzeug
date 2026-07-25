// ── ExecutionContext ──────────────────────────────────────────────────────────
//
// Owns the one piece of process-wide (or, once an SSR hook is installed,
// per-request) mutable state every reactive primitive reads through: the active
// scheduling bucket, the active scope's cleanup array, and the active tracking
// context. Split out of tracking.ts so this file's only job is "where does the
// current execution context live and how do you swap it" — tracking.ts owns
// what a TrackingCtx *means* (dep collection), this file owns how one gets
// installed for the duration of a call.
//
// TrackingCtx is imported type-only here (erased at compile time) so tracking.ts
// can depend on this file's runtime exports (getExecutionContext, runInContext)
// without creating an actual circular import — only one direction is real at
// runtime: tracking.ts -> execution-context.ts.

import type { ComputedBase } from './reactive-base';
import type { TrackingCtx } from './tracking';
import type { CleanupFn, Subscriber } from './types';

// ── Scheduling state ────────────────────────────────────────────────────────
//
// batchDepth, pendingSubscribers, and the dirty-computed sets live here (rather
// than as scheduling.ts module-level variables) so the /ripple/ssr sub-path can
// isolate the flush queue per request via the same context hook that isolates
// tracking — closing the gap where concurrent SSR requests would otherwise share
// one flush queue. Outside SSR (no hook installed), this is a single
// module-level singleton with identical behavior and cost to a plain global.

export type SchedulingState = {
  activeDirty: 'a' | 'b';
  batchDepth: number;
  readonly dirtyWithEffectSubsA: Set<ComputedBase<unknown>>;
  readonly dirtyWithEffectSubsB: Set<ComputedBase<unknown>>;
  readonly pendingSubscribers: Set<Subscriber>;
};

export const createSchedulingState = (): SchedulingState => ({
  activeDirty: 'a',
  batchDepth: 0,
  dirtyWithEffectSubsA: new Set(),
  dirtyWithEffectSubsB: new Set(),
  pendingSubscribers: new Set(),
});

// ── The context itself ────────────────────────────────────────────────────────

export type ExecutionContext = {
  readonly scheduling: SchedulingState;
  readonly scopeCleanups: CleanupFn[] | null;
  readonly tracking: TrackingCtx | null;
};

export type ContextHook = {
  get(): ExecutionContext;
  run<T>(ctx: ExecutionContext, fn: () => T): T;
};

let _ctx: ExecutionContext = { scheduling: createSchedulingState(), scopeCleanups: null, tracking: null };
let _hook: ContextHook | null = null;

/** Returns the active context — the installed SSR hook's, or the module-level singleton. */
export const getExecutionContext = (): ExecutionContext => (_hook !== null ? _hook.get() : _ctx);

/**
 * Runs `fn` with `patch` merged onto the active context, restoring the previous
 * context afterwards. Delegates to the SSR hook when one is installed (it owns its
 * own restore semantics, e.g. via AsyncLocalStorage); otherwise swaps the module-level
 * singleton directly. Every "run with a modified context" helper (withTracking,
 * withScopeCleanups) is a one-line call to this — there is exactly one context
 * swap/restore implementation.
 *
 * Takes a `Partial<ExecutionContext>` (merged internally), not a full replacement
 * context — a caller can only ever override the field(s) it names, so it's
 * impossible to accidentally drop `scheduling` or `scopeCleanups` by forgetting to
 * spread the current context first.
 */
export const runInContext = <T>(patch: Partial<ExecutionContext>, fn: () => T): T => {
  const ctx = { ...getExecutionContext(), ...patch };

  if (_hook !== null) return _hook.run(ctx, fn);

  const prev = _ctx;

  _ctx = ctx;

  try {
    return fn();
  } finally {
    _ctx = prev;
  }
};

/** Returns the scheduling-state bucket for the active execution context. */
export const getSchedulingState = (): SchedulingState => getExecutionContext().scheduling;

/** `true` once an SSR context hook is installed — scheduling state is then request-isolated. */
export const hasContextHook = (): boolean => _hook !== null;

// ── Scope cleanup ─────────────────────────────────────────────────────────────

/** Returns the cleanup array of the innermost active scope, or `null` if not inside a scope. */
export const getScopeCleanups = (): CleanupFn[] | null => getExecutionContext().scopeCleanups;

/**
 * Pushes `cleanups` as the active scope cleanup array for the duration of `fn`.
 * Any `onCleanup()` calls inside `fn` register into these cleanups; effects and
 * computed values created inside `fn` auto-register their disposal too.
 */
export const withScopeCleanups = <T>(cleanups: CleanupFn[], fn: () => T): T =>
  runInContext({ scopeCleanups: cleanups }, fn);

// ── Context hook (for SSR) ────────────────────────────────────────────────────

/**
 * @internal Used only by `/ripple/ssr`.
 * Installs a context hook that overrides both tracking and scope-cleanup access.
 * Returns the previous hook so callers can restore it.
 */
export const _installContextHook = (hook: ContextHook | null): ContextHook | null => {
  const prev = _hook;

  _hook = hook;

  return prev;
};
