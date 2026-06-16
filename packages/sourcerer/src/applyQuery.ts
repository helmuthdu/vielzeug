import type {
  CursorSourceQuery,
  InfiniteSourceQuery,
  LocalSource,
  RemoteSource,
  RemoteSourceQuery,
  SourceQuery,
} from './types';

// ── Unified apply helper ──────────────────────────────────────────────────────

/**
 * Applies a query patch to any source that exposes `patch()`.
 * Triggers a single fetch/recomputation for any combination of field changes.
 * No-ops when `changes` is empty or all values are unchanged.
 *
 * @example
 * ```ts
 * const q = decodeQuery(params, { defaultLimit: 20 });
 * await applyQuery(source, q);
 * ```
 */
export function applyQuery<TChanges extends Record<string, unknown>>(
  source: { patch(changes: Partial<TChanges>): Promise<void> },
  changes: Partial<TChanges>,
): Promise<void> {
  return source.patch(changes);
}

// ── Typed convenience wrappers ────────────────────────────────────────────────

/**
 * Applies a partial `SourceQuery` patch to a `LocalSource`.
 * @see applyQuery
 */
export function applyLocalQuery<T>(source: LocalSource<T>, changes: Partial<SourceQuery>): Promise<void> {
  return source.patch(changes);
}

/**
 * Applies a partial `RemoteSourceQuery` patch to a `RemoteSource`.
 * @see applyQuery
 */
export function applyRemoteQuery<T, TFilter, TSort>(
  source: RemoteSource<T, TFilter, TSort>,
  changes: Partial<RemoteSourceQuery<TFilter, TSort>>,
): Promise<void> {
  return source.patch(changes);
}

/**
 * Applies a partial `CursorSourceQuery` patch to a `CursorSource`.
 * @see applyQuery
 */
export function applyCursorQuery<TCursor>(
  source: { patch(changes: Partial<Pick<CursorSourceQuery<TCursor>, 'limit' | 'search'>>): Promise<void> },
  changes: Partial<Pick<CursorSourceQuery<TCursor>, 'limit' | 'search'>>,
): Promise<void> {
  return source.patch(changes);
}

/**
 * Applies a partial `InfiniteSourceQuery` patch to an `InfiniteSource`.
 * @see applyQuery
 */
export function applyInfiniteQuery(
  source: { patch(changes: Partial<Pick<InfiniteSourceQuery, 'limit' | 'search'>>): Promise<void> },
  changes: Partial<Pick<InfiniteSourceQuery, 'limit' | 'search'>>,
): Promise<void> {
  return source.patch(changes);
}
