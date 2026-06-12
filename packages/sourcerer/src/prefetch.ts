import type { RemoteConfig, RemoteSource, SourceSnapshot } from './types';

import { createRemoteSource } from './remoteSource';

/**
 * Fetches a single page of data and returns a serialisable `SourceSnapshot`.
 * The underlying source is created, fetched, then immediately disposed.
 *
 * Ideal for SSR: embed the result in HTML and pass it to `createRemoteSource({ snapshot })`.
 *
 * @example
 * ```ts
 * // server.ts
 * const snapshot = await prefetchSource({ fetch: fetchUsers, limit: 20 });
 * // client.ts
 * const source = createRemoteSource({ fetch: fetchUsers, snapshot });
 * ```
 */
export async function prefetchSource<T, TFilter = unknown, TSort = unknown>(
  cfg: Omit<RemoteConfig<T, TFilter, TSort>, 'autoFetch' | 'refreshInterval' | 'snapshot'>,
): Promise<SourceSnapshot<T>> {
  const source = createRemoteSource<T, TFilter, TSort>({ ...cfg, autoFetch: false });

  try {
    await source.refresh();

    if (source.meta.error) throw source.meta.error;

    const q = source.toQuery();

    return {
      items: source.current,
      ...(q.search && { search: q.search }),
      page: source.meta.pageNumber,
      total: source.meta.totalItems,
    };
  } finally {
    source.dispose();
  }
}

/**
 * Like `prefetchSource`, but returns both the snapshot and the still-live source.
 * The **caller** is responsible for disposing the source.
 *
 * Use this when you need the snapshot for SSR serialisation **and** the live source
 * for subsequent client-side updates — avoiding a double-fetch.
 *
 * @example
 * ```ts
 * const { snapshot, source } = await prefetchSourceWithSource({ fetch: fetchUsers, limit: 20 });
 * // Embed snapshot in HTML for hydration, keep source for reactivity.
 * ```
 */
export async function prefetchSourceWithSource<T, TFilter = unknown, TSort = unknown>(
  cfg: Omit<RemoteConfig<T, TFilter, TSort>, 'autoFetch' | 'refreshInterval' | 'snapshot'>,
): Promise<{ snapshot: SourceSnapshot<T>; source: RemoteSource<T, TFilter, TSort> }> {
  const source = createRemoteSource<T, TFilter, TSort>({ ...cfg, autoFetch: false });

  await source.refresh();

  if (source.meta.error) {
    source.dispose();
    throw source.meta.error;
  }

  const q = source.toQuery();
  const snapshot: SourceSnapshot<T> = {
    items: source.current,
    ...(q.search && { search: q.search }),
    page: source.meta.pageNumber,
    total: source.meta.totalItems,
  };

  return { snapshot, source };
}
