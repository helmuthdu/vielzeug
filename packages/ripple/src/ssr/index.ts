/**
 * /ripple/ssr
 *
 * SSR helpers for installing a custom tracking context provider.
 * Import this sub-entry **only** in server-side code — it is not needed for browser builds.
 *
 * @example
 * ```ts
 * // frameworks/hono.ts
 * import { createAsyncProvider, setTrackingProvider } from '@vielzeug/ripple/ssr';
 *
 * const provider = createAsyncProvider();
 * setTrackingProvider(provider);
 *
 * // Inside a request handler:
 * await runWithProvider(provider, () => renderToString(App));
 * ```
 */

import { type TrackingHook, _installTrackingHook } from '../tracking';

interface AsyncLocalStorageType<T> {
  getStore(): T | undefined;
  run<R>(store: T, callback: () => R): R;
}

type TrackingContext = import('../tracking').TrackingCtx;

// ── Public interfaces ─────────────────────────────────────────────────────────

export interface TrackingProvider {
  get(): TrackingContext | null;
  run<T>(ctx: TrackingContext | null, fn: () => T): T;
}

// ── Sync provider (simple stack-based) ───────────────────────────────────────

let _currentProvider: TrackingProvider | null = null;

const syncHook: TrackingHook = {
  get: () => _currentProvider?.get() ?? null,
  run: <T>(ctx: TrackingContext | null, fn: () => T): T => {
    if (_currentProvider) return _currentProvider.run(ctx, fn);

    return fn();
  },
};

export const setTrackingProvider = (provider: TrackingProvider | null): void => {
  _currentProvider = provider;
  _installTrackingHook(provider !== null ? syncHook : null);
};

// ── Async provider (AsyncLocalStorage-based) ─────────────────────────────────

/**
 * Creates a provider that uses `AsyncLocalStorage` to carry the tracking context
 * across async boundaries. Requires Node.js 16+ or a compatible runtime.
 *
 * @example
 * ```ts
 * const provider = createAsyncProvider();
 * setTrackingProvider(provider);
 *
 * // In a request handler:
 * await runWithProvider(provider, requestHandler);
 * ```
 */
export const createAsyncProvider = (): TrackingProvider => {
  // Dynamic import so this module can be bundled for environments without AsyncLocalStorage.
  // In browser builds, this code path should never be reached.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AsyncLocalStorage } = require('async_hooks') as { AsyncLocalStorage: new <T>() => AsyncLocalStorageType<T> };
  const storage = new AsyncLocalStorage<TrackingContext | null>();

  return {
    get: () => storage.getStore() ?? null,
    run: <T>(ctx: TrackingContext | null, fn: () => T): T => storage.run(ctx, fn),
  };
};

/**
 * Runs `fn` inside the given provider's tracking context set to `null`.
 * Signals read inside `fn` will not register any tracking deps — this is the
 * equivalent of starting a clean reactive root for each request.
 *
 * @example
 * ```ts
 * const html = await runWithProvider(provider, () => renderToString(App));
 * ```
 */
export const runWithProvider = <T>(provider: TrackingProvider, fn: () => T): T => provider.run(null, fn);

// ── Convenience: run once without installing a persistent provider ─────────────

/**
 * Temporarily installs a provider, runs `fn`, then restores the previous provider.
 * Useful for one-off server renders without modifying global state.
 */
export const withProvider = <T>(provider: TrackingProvider, fn: () => T): T => {
  const prevProvider = _currentProvider;
  const hadHook = prevProvider !== null;

  _currentProvider = provider;
  _installTrackingHook(syncHook);

  try {
    return provider.run(null, fn);
  } finally {
    _currentProvider = prevProvider;
    _installTrackingHook(hadHook ? syncHook : null);
  }
};
