import type { RemoteConfig, RemoteSource, SourceSnapshot } from './types';

import { createRemoteSource } from './remoteSource';

type PrefetchConfig<T, TFilter, TSort> = Omit<RemoteConfig<T, TFilter, TSort>, 'autoFetch' | 'refreshInterval'>;

const buildSnapshot = <T, TFilter, TSort>(source: RemoteSource<T, TFilter, TSort>): SourceSnapshot<T> => {
  const q = source.query;

  return {
    items: source.current,
    ...(q.search && { search: q.search }),
    page: source.meta.pageNumber,
    total: source.meta.totalItems,
  };
};

/**
 * Fetches a single page of data and returns a serialisable `SourceSnapshot`.
 * The underlying source is created, fetched, then immediately disposed.
 * Use for SSR / static-generation where you only need the data, not a live source.
 *
 * @example
 * ```ts
 * const snapshot = await prefetchSource({ fetch: fetchUsers, limit: 20 });
 * ```
 */
export async function prefetchSource<T, TFilter = unknown, TSort = unknown>(
  cfg: PrefetchConfig<T, TFilter, TSort>,
): Promise<SourceSnapshot<T>> {
  const source = createRemoteSource<T, TFilter, TSort>({ ...cfg, autoFetch: false });

  try {
    await source.refresh();

    if (source.meta.error) throw source.meta.error;

    return buildSnapshot(source);
  } finally {
    source.dispose();
  }
}

/**
 * Fetches a single page of data and returns both a serialisable `SourceSnapshot` and the
 * still-live `RemoteSource`. Useful when you need the snapshot for SSR serialisation
 * **and** the live source for subsequent client-side updates without a double-fetch.
 *
 * **The caller is responsible for disposing the returned source.**
 *
 * @example
 * ```ts
 * const { snapshot, source } = await prefetchSourceAndKeep({ fetch: fetchUsers, limit: 20 });
 * // hydrate HTML with snapshot, pass source to client
 * ```
 */
export async function prefetchSourceAndKeep<T, TFilter = unknown, TSort = unknown>(
  cfg: PrefetchConfig<T, TFilter, TSort>,
): Promise<{ snapshot: SourceSnapshot<T>; source: RemoteSource<T, TFilter, TSort> }> {
  const source = createRemoteSource<T, TFilter, TSort>({ ...cfg, autoFetch: false });

  await source.refresh();

  if (source.meta.error) {
    source.dispose();
    throw source.meta.error;
  }

  return { snapshot: buildSnapshot(source), source };
}
