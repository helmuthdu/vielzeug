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

import { RippleEnvironmentError } from '../errors';
import { _installContextHook, createSchedulingState, type ContextHook, type ExecutionContext } from '../tracking';

// eslint-disable-next-line no-var
declare var require: (id: string) => unknown;

interface AsyncLocalStorageType<T> {
  getStore(): T | undefined;
  run<R>(store: T, callback: () => R): R;
}

// ── Public interfaces ─────────────────────────────────────────────────────────

/**
 * The clean starting context used as a fallback when no request is active
 * (e.g. a signal write outside any `runWithProvider`/`withProvider` call) —
 * a single shared instance is fine here since there's no concurrent request to isolate from.
 */
const EMPTY_CTX: ExecutionContext = { scheduling: createSchedulingState(), scopeCleanups: null, tracking: null };

/**
 * Builds a fresh, isolated starting context for one request — no tracking, no scope,
 * and its own `SchedulingState` so this request's `batch()`/flush queue never shares
 * state with a concurrently-running request. Must be called anew per `run()` — reusing
 * a single context object across requests would defeat scheduling isolation.
 */
const freshRequestContext = (): ExecutionContext => ({
  scheduling: createSchedulingState(),
  scopeCleanups: null,
  tracking: null,
});

export interface TrackingProvider {
  get(): ExecutionContext;
  run<T>(ctx: ExecutionContext, fn: () => T): T;
}

// ── Sync provider (simple stack-based) ───────────────────────────────────────

let _currentProvider: TrackingProvider | null = null;

const syncHook: ContextHook = {
  get: () => _currentProvider?.get() ?? EMPTY_CTX,
  run: <T>(ctx: ExecutionContext, fn: () => T): T => {
    if (_currentProvider) return _currentProvider.run(ctx, fn);

    return fn();
  },
};

export const setTrackingProvider = (provider: TrackingProvider | null): void => {
  _currentProvider = provider;
  _installContextHook(provider !== null ? syncHook : null);
};

// ── Async provider (AsyncLocalStorage-based) ─────────────────────────────────

/**
 * Creates a provider that uses `AsyncLocalStorage` to carry the full execution
 * context (tracking + scope cleanups) across async boundaries.
 * Requires Node.js 16+ or a compatible runtime.
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
  // Dynamic require so this module can be bundled for environments without AsyncLocalStorage.
  // In browser builds, this code path should never be reached.
  if (typeof require === 'undefined') {
    throw new RippleEnvironmentError(
      'createAsyncProvider() requires Node.js (async_hooks) and cannot be used in browser environments.',
    );
  }

  const { AsyncLocalStorage } = require('async_hooks') as { AsyncLocalStorage: new <T>() => AsyncLocalStorageType<T> };
  const storage = new AsyncLocalStorage<ExecutionContext>();

  return {
    get: () => storage.getStore() ?? EMPTY_CTX,
    run: <T>(ctx: ExecutionContext, fn: () => T): T => storage.run(ctx, fn),
  };
};

/**
 * Runs `fn` inside the given provider with a clean (no tracking, no scope) context.
 * Signals read inside `fn` will not register any tracking deps — equivalent to
 * starting a clean reactive root for each request.
 *
 * @example
 * ```ts
 * const html = await runWithProvider(provider, () => renderToString(App));
 * ```
 */
export const runWithProvider = <T>(provider: TrackingProvider, fn: () => T): T =>
  provider.run(freshRequestContext(), fn);

// ── Convenience: run once without installing a persistent provider ─────────────

/**
 * Temporarily installs a provider, runs `fn`, then restores the previous provider.
 * Useful for one-off server renders without modifying global state.
 */
export const withProvider = <T>(provider: TrackingProvider, fn: () => T): T => {
  const prevProvider = _currentProvider;

  _currentProvider = provider;

  const prevHook = _installContextHook(syncHook);

  try {
    return provider.run(freshRequestContext(), fn);
  } finally {
    _currentProvider = prevProvider;
    _installContextHook(prevHook);
  }
};
