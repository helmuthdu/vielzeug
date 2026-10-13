import { createAsyncSource } from './asyncSource';
import { SourcererDisposedError } from './errors';
import type { Resource, ResourceConfig, ResourceState } from './types';

const initialResourceState = <T>(start: boolean): ResourceState<T> => ({
  data: undefined,
  error: null,
  loading: start,
});

/**
 * Fetch one value, reactively. `load` receives a signal that aborts on disposal and on
 * the next `reload`, so a superseded response can never commit over a newer one.
 *
 * Unlike the paginated sources, a resource starts loading during construction — it
 * models a value that must exist rather than a window into a collection. Pass
 * `start: false` to trigger the first `reload()` yourself. A failed initial load is
 * reported through `state.error` rather than as an unhandled rejection; later `reload()`
 * calls reject so callers can await them directly.
 */
export function createResource<T>(config: ResourceConfig<T>): Resource<T> {
  const start = config.start ?? true;
  const asyncSource = createAsyncSource<ResourceState<T>>(initialResourceState<T>(start));

  const fetchResource = (): Promise<void> =>
    asyncSource.fetch({
      failure: (previous, error) => ({ ...previous, error, loading: false }),
      load: (signal) => config.load({ signal }),
      pending: (previous) => ({ ...previous, error: null, loading: true }),
      success: (data) => ({ data, error: null, loading: false }),
    });

  const source: Resource<T> = {
    get disposalSignal() {
      return asyncSource.disposalSignal;
    },

    dispose: asyncSource.dispose,

    get disposed() {
      return asyncSource.disposed;
    },

    reload() {
      if (asyncSource.disposed) return Promise.reject(new SourcererDisposedError());

      return fetchResource();
    },

    get state() {
      return asyncSource.state;
    },

    subscribe: asyncSource.subscribe,

    [Symbol.dispose]() {
      source.dispose();
    },
  };

  if (start) {
    // The initial load has no caller to reject to: failures surface via state.error.
    void fetchResource().catch(() => undefined);
  }

  return source;
}
