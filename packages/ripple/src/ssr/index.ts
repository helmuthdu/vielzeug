/**
 * /ripple/ssr
 *
 * SSR helpers for request-scoped reactive tracking isolation. Import this sub-entry
 * **only** in server-side code — it statically imports `node:async_hooks` and must
 * not be imported in browser builds.
 *
 * `runWithProvider()` is the sole entry point: it installs the tracking hook, runs
 * `fn` inside a fresh per-request `ExecutionContext`, and restores whatever hook was
 * active before — for the duration of `fn` if it's synchronous, or until the returned
 * promise settles if it's async. There is no separate "install a persistent provider"
 * step and no module-level provider variable to leak across requests: every call is
 * self-contained, so concurrent requests never observe each other's hook installation.
 *
 * @example
 * ```ts
 * // frameworks/hono.ts
 * import { createAsyncProvider, runWithProvider } from '@vielzeug/ripple/ssr';
 *
 * const provider = createAsyncProvider();
 *
 * // Inside a request handler:
 * const html = await runWithProvider(provider, () => renderToString(App));
 * ```
 */

import { AsyncLocalStorage } from 'node:async_hooks';

import {
  _installContextHook,
  createSchedulingState,
  type ContextHook,
  type ExecutionContext,
} from '../execution-context';

/**
 * Builds a fresh, isolated starting context for one request — no tracking, no scope,
 * and its own `SchedulingState` so this request's `batch()`/flush queue never shares
 * state with a concurrently-running request. Built fresh on every `runWithProvider()`
 * call — never reused across requests.
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

/**
 * Creates a provider that uses `AsyncLocalStorage` to carry the full execution
 * context (tracking + scope cleanups) across async boundaries. Node.js only.
 */
export const createAsyncProvider = (): TrackingProvider => {
  const storage = new AsyncLocalStorage<ExecutionContext>();
  const empty = freshRequestContext();

  return {
    get: () => storage.getStore() ?? empty,
    run: <T>(ctx: ExecutionContext, fn: () => T): T => storage.run(ctx, fn),
  };
};

/**
 * Runs `fn` inside `provider` with a clean, request-scoped execution context.
 *
 * Installs the tracking hook before calling `fn`, then restores the previously active
 * hook (`null` if none was installed) once `fn` completes. If `fn` returns a promise,
 * restoration is deferred to that promise's settlement — reactive reads/writes anywhere
 * in the request's async chain keep resolving through `provider` until then. Safe to
 * call concurrently from multiple requests as long as they share the same `provider`
 * instance (its `AsyncLocalStorage` is what actually isolates them from each other).
 *
 * @example
 * ```ts
 * const html = await runWithProvider(provider, () => renderToString(App));
 * ```
 */
export const runWithProvider = <T>(provider: TrackingProvider, fn: () => T): T => {
  const hook: ContextHook = { get: () => provider.get(), run: (ctx, f) => provider.run(ctx, f) };
  const prevHook = _installContextHook(hook);
  const restore = (): void => {
    _installContextHook(prevHook);
  };

  let result: T;

  try {
    result = provider.run(freshRequestContext(), fn);
  } catch (error) {
    restore();
    throw error;
  }

  if (result instanceof Promise) {
    return result.finally(restore) as T;
  }

  restore();

  return result;
};
