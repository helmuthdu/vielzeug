import type { ComputedBase, ReactiveBase } from './reactive-base';
import type { CleanupFn, Subscriber } from './types';

// ── Global revision clock ─────────────────────────────────────────────────────
//
// Monotonically-increasing counter incremented on every signal write.
// ComputedImpl records the clock value after each successful recompute and uses
// it as an O(1) "nothing has changed globally" fast-path check in refreshIfDirty.

let globalRevision = 0;

export const tickRevision = (): number => ++globalRevision;
export const getRevision = (): number => globalRevision;

// ── Internal types ────────────────────────────────────────────────────────────

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
export type TrackingCtx =
  | {
      computed: ComputedBase<unknown>;
      depCollector: DepEntry[];
      kind: 'computed';
      sourceObserver?: SourceObserver;
    }
  | {
      cleanups: CleanupFn[];
      deps: Map<ReactiveBase<unknown>, number>;
      effect: Subscriber;
      kind: 'effect';
      sourceObserver?: SourceObserver;
      subscriptions: Set<CleanupFn>;
    };

// ── ExecutionContext ──────────────────────────────────────────────────────────
//
// Unified context replaces two separate globals (_tracking and _scopeStack).
// Both the dep-tracking context and the innermost scope's cleanup array live here.
// The SSR hook overrides the entire context per-request — fixing the prior bug
// where scope cleanups were always a process-wide singleton even with the hook.

export type ExecutionContext = {
  readonly scopeCleanups: CleanupFn[] | null;
  readonly tracking: TrackingCtx | null;
};

export type ContextHook = {
  get(): ExecutionContext;
  run<T>(ctx: ExecutionContext, fn: () => T): T;
};

let _ctx: ExecutionContext = { scopeCleanups: null, tracking: null };
let _hook: ContextHook | null = null;

const getCtx = (): ExecutionContext => (_hook !== null ? _hook.get() : _ctx);

// ── Tracking ──────────────────────────────────────────────────────────────────

export const getTracking = (): TrackingCtx | null => getCtx().tracking;

export const withTracking = <T>(tracking: TrackingCtx | null, fn: () => T): T => {
  if (_hook !== null) {
    const current = _hook.get();

    return _hook.run({ ...current, tracking }, fn);
  }

  const prev = _ctx;

  _ctx = { ..._ctx, tracking };

  try {
    return fn();
  } finally {
    _ctx = prev;
  }
};

// ── Scope cleanup ─────────────────────────────────────────────────────────────

/**
 * Pushes `cleanups` as the active scope cleanup array for the duration of `fn`.
 * Any `onCleanup()` calls inside `fn` will register into these cleanups.
 * Effects and computed values created inside `fn` are also auto-registered.
 */
export const withScopeCleanups = <T>(cleanups: CleanupFn[], fn: () => T): T => {
  if (_hook !== null) {
    const current = _hook.get();

    return _hook.run({ ...current, scopeCleanups: cleanups }, fn);
  }

  const prev = _ctx;

  _ctx = { ..._ctx, scopeCleanups: cleanups };

  try {
    return fn();
  } finally {
    _ctx = prev;
  }
};

/**
 * Returns the cleanup array of the innermost active scope, or `null` if not inside a scope.
 */
export const getScopeCleanups = (): CleanupFn[] | null => getCtx().scopeCleanups;

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

// ── Source observer ───────────────────────────────────────────────────────────
//
// Observer is now scoped to the active TrackingCtx instead of a process-wide global.
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
