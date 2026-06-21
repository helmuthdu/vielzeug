import type { SourceQuery } from './types';

/**
 * Generic query applicator — delegates to `source.patch(changes)`.
 * Use this with `decodeQuery()` output to restore URL state onto any source:
 *
 * @example
 * ```ts
 * const q = decodeQuery(new URL(location.href).searchParams, { defaultLimit: 20 });
 * await applyQuery(source, q);
 * ```
 */
export function applyQuery<T extends { patch(changes: Partial<SourceQuery>): Promise<void> }>(
  source: T,
  changes: Partial<SourceQuery>,
): Promise<void> {
  return source.patch(changes);
}
