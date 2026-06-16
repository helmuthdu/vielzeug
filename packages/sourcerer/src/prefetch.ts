import type { RemoteConfig, RemoteSource, SourceSnapshot } from './types';

import { createRemoteSource } from './remoteSource';

/**
 * Fetches a single page of data and returns a serialisable `SourceSnapshot`.
 * The underlying source is created, fetched, then immediately disposed.
 *
 * Pass `{ keepSource: true }` to also return the still-live source — useful when you need
 * the snapshot for SSR serialisation **and** the live source for subsequent client-side
 * updates without a double-fetch. The **caller** is then responsible for disposing the source.
 *
 * @example
 * ```ts
 * // SSR — snapshot only:
 * const snapshot = await prefetchSource({ fetch: fetchUsers, limit: 20 });
 *
 * // SSR + keep live source:
 * const { snapshot, source } = await prefetchSource({ fetch: fetchUsers, limit: 20 }, { keepSource: true });
 * ```
 */
export async function prefetchSource<T, TFilter = unknown, TSort = unknown>(
  cfg: Omit<RemoteConfig<T, TFilter, TSort>, 'autoFetch' | 'refreshInterval'>,
  opts?: { keepSource?: false },
): Promise<SourceSnapshot<T>>;
export async function prefetchSource<T, TFilter = unknown, TSort = unknown>(
  cfg: Omit<RemoteConfig<T, TFilter, TSort>, 'autoFetch' | 'refreshInterval'>,
  opts: { keepSource: true },
): Promise<{ snapshot: SourceSnapshot<T>; source: RemoteSource<T, TFilter, TSort> }>;
export async function prefetchSource<T, TFilter = unknown, TSort = unknown>(
  cfg: Omit<RemoteConfig<T, TFilter, TSort>, 'autoFetch' | 'refreshInterval'>,
  opts?: { keepSource?: boolean },
): Promise<SourceSnapshot<T> | { snapshot: SourceSnapshot<T>; source: RemoteSource<T, TFilter, TSort> }> {
  const source = createRemoteSource<T, TFilter, TSort>({ ...cfg, autoFetch: false });

  const buildSnapshot = (): SourceSnapshot<T> => {
    const q = source.toQuery();

    return {
      items: source.current,
      ...(q.search && { search: q.search }),
      page: source.meta.pageNumber,
      total: source.meta.totalItems,
    };
  };

  if (opts?.keepSource) {
    await source.refresh();

    if (source.meta.error) {
      source.dispose();
      throw source.meta.error;
    }

    return { snapshot: buildSnapshot(), source };
  }

  try {
    await source.refresh();

    if (source.meta.error) throw source.meta.error;

    return buildSnapshot();
  } finally {
    source.dispose();
  }
}
