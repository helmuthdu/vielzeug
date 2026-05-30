import type { ComputedBase, ReactiveBase } from './reactive-base';
import type { CleanupFn, Subscriber } from './types';

// ── Global revision clock (F1) ────────────────────────────────────────────────
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

// R1: computed variant no longer carries `cleanups` — computeds do not support
// onCleanup() (it throws immediately), so allocating a CleanupFn[] per recompute
// was dead overhead.
export type TrackingCtx =
  | {
      computed: ComputedBase<unknown>;
      depCollector: DepEntry[];
      kind: 'computed';
    }
  | {
      cleanups: CleanupFn[];
      effect: Subscriber;
      kind: 'effect';
      subscriptions: Set<CleanupFn>;
    }
  | {
      cleanups: CleanupFn[];
      kind: 'scope';
    };

/** Called by withSourceObserver to observe each reactive source accessed during a tracked run. */
export type SourceObserver = (source: ReactiveBase<unknown>) => void;

// ── Tracking hook (for SSR) ───────────────────────────────────────────────────

export type TrackingHook = {
  get(): TrackingCtx | null;
  run<T>(ctx: TrackingCtx | null, fn: () => T): T;
};

let _tracking: TrackingCtx | null = null;
let _hook: TrackingHook | null = null;

export const getTracking = (): TrackingCtx | null => (_hook !== null ? _hook.get() : _tracking);

export const withTracking = <T>(ctx: TrackingCtx | null, fn: () => T): T => {
  if (_hook !== null) return _hook.run(ctx, fn);

  const prev = _tracking;

  _tracking = ctx;

  try {
    return fn();
  } finally {
    _tracking = prev;
  }
};

/**
 * @internal Used only by `/ripple/ssr`.
 * Installs a custom tracking hook and returns the previous one.
 */
export const _installTrackingHook = (hook: TrackingHook | null): TrackingHook | null => {
  const prev = _hook;

  _hook = hook;

  return prev;
};

// ── Source observer ───────────────────────────────────────────────────────────
//
// Allows traceEffect to intercept each reactive source read during an effect run
// without coupling the trace logic into effect() itself.
//
// R2: effect() no longer checks getSourceObserver(). traceEffect wraps its fn
// with withSourceObserver before passing it to effect(), so the observer is
// already installed by the time fn() runs.

let _sourceObserver: SourceObserver | null = null;

/**
 * Runs `fn` while calling `observer` for every reactive source that is accessed.
 * Used by `traceEffect` to detect which sources changed between runs.
 */
export const withSourceObserver = <T>(observer: SourceObserver, fn: () => T): T => {
  const prev = _sourceObserver;

  _sourceObserver = observer;

  try {
    return fn();
  } finally {
    _sourceObserver = prev;
  }
};

// ── trackSource ───────────────────────────────────────────────────────────────
//
// Records `source` as a dependency of the currently active tracking context.
// For computed contexts: only records the dep entry — addComputedSub is called
// later by updateDeps() in computed.ts (only for genuinely NEW deps, preventing
// duplicate WeakRef entries).
// For effect contexts: immediately subscribes the effect to the source.

export const trackSource = (source: ReactiveBase<unknown>): void => {
  _sourceObserver?.(source);

  const ctx = getTracking();

  if (ctx === null) return;

  if (ctx.kind === 'computed') {
    ctx.depCollector.push({ source, version: source.version });
  } else if (ctx.kind === 'effect') {
    const owner = ctx.effect;

    source.addEffectSub(owner);
    ctx.subscriptions.add(() => source.removeEffectSub(owner));
  }
  // scope: no dep tracking
};
