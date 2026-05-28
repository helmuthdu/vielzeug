import type { TrackingCtx } from './types';

let _tracking: TrackingCtx | null = null;

type TrackingHook = {
  get(): TrackingCtx | null;
  run<T>(ctx: TrackingCtx | null, fn: () => T): T;
};

let _hook: TrackingHook | null = null;

export const getTracking = (): TrackingCtx | null => (_hook !== null ? (_hook.get() as TrackingCtx | null) : _tracking);

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
 * @internal Used only by `@vielzeug/stateit/ssr`.
 * Installs a custom tracking hook and returns the previous one.
 */
export const _installTrackingHook = (hook: TrackingHook | null): TrackingHook | null => {
  const prev = _hook;

  _hook = hook;

  return prev;
};
