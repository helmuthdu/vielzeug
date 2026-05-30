import type { RemoteConfig, RemoteSource, SourceSnapshot } from './types';

import { createRemoteSource } from './remoteSource';

/**
 * Creates a remote source, waits for the first fetch to complete, and returns a
 * serializable snapshot of the loaded state. The source is disposed automatically.
 *
 * Designed for server-side rendering: run `prefetchSource` on the server, embed
 * the snapshot in the page, then hydrate on the client by passing `snapshot` to
 * `createRemoteSource` — the client starts in a loaded state with no loading flash.
 *
 * @example
 * ```ts
 * // --- Server ---
 * const snapshot = await prefetchSource({ fetch: fetchUsers, limit: 20 });
 * const html = renderToString(App) +
 *   `<script>window.__SNAP__ = ${JSON.stringify(snapshot)}</script>`;
 *
 * // --- Client ---
 * const source = createRemoteSource({
 *   fetch: fetchUsers,
 *   limit: 20,
 *   snapshot: window.__SNAP__,
 *   autoFetch: false, // snapshot is fresh — skip background re-fetch
 * });
 * // source.current and source.meta are populated immediately.
 * ```
 */
export async function prefetchSource<T, TFilter = unknown, TSort = unknown>(
  cfg: RemoteConfig<T, TFilter, TSort>,
): Promise<SourceSnapshot<T>> {
  const source = createRemoteSource({ ...cfg, autoFetch: true });

  await source.ready();

  const query = source.toQuery();
  const snapshot: SourceSnapshot<T> = {
    items: [...source.current],
    page: query.page,
    search: query.search || undefined,
    total: source.meta.totalItems,
  };

  source.dispose();

  return snapshot;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace prefetchSource {
  /**
   * Like `prefetchSource`, but also returns the live source after prefetching.
   * The caller is responsible for calling `source.dispose()` when done.
   *
   * Use this when you need both the snapshot (for serialization) and the live source
   * (for continuing to use after SSR hand-off).
   */
  export async function withSource<T, TFilter = unknown, TSort = unknown>(
    cfg: RemoteConfig<T, TFilter, TSort>,
  ): Promise<{ snapshot: SourceSnapshot<T>; source: RemoteSource<T, TFilter, TSort> }> {
    const source = createRemoteSource({ ...cfg, autoFetch: true });

    await source.ready();

    const query = source.toQuery();
    const snapshot: SourceSnapshot<T> = {
      items: [...source.current],
      page: query.page,
      search: query.search || undefined,
      total: source.meta.totalItems,
    };

    return { snapshot, source };
  }
}
