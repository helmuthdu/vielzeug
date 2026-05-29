import type { DepSource, TrackingCtx } from './types';

let _tracking: TrackingCtx | null = null;

export type TrackingHook = {
  get(): TrackingCtx | null;
  run<T>(ctx: TrackingCtx | null, fn: () => T): T;
};

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

/**
 * Records `source` as a dependency of the currently active tracking context.
 * Shared by `SignalImpl` and `ComputedImpl` to eliminate duplicating the discriminated-union
 * dispatch. Uses `DepSource` interface methods — no raw `Set` references are passed.
 */
export const trackSource = (source: DepSource): void => {
  const ctx = getTracking();

  if (ctx === null) return;

  if (ctx.kind === 'computed') {
    source.addComputedSub(ctx.computed);
    ctx.depCollector.push({ source, version: source.version });
  } else if (ctx.kind === 'effect') {
    const owner = ctx.effect;

    source.addEffectSub(owner);
    ctx.subscriptions.add(() => source.removeEffectSub(owner));
    ctx.depCollector?.push({ source, version: source.version });
  }
  // scope: no dep tracking
};
