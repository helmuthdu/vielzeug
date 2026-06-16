import { hash } from '@vielzeug/arsenal';

import type { QueryParams, QueryParamsInput, RemoteSourceQuery, SourceQuery } from './types';

/**
 * Serialises a `SourceQuery` or `RemoteSourceQuery` into plain URL-safe string params.
 *
 * ⚠️ `filter` and `sort` are serialised with `hash`. Circular object references
 * will cause a stack overflow — ensure filter/sort values are plain serialisable objects.
 *
 * ⚠️ Round-trip fidelity: `page` and `limit` must be positive integers. `encodeQuery` will
 * serialise any number (including 0), but `decodeQuery` clamps non-positive values to 1/defaultLimit.
 */
export const encodeQuery = <TFilter = unknown, TSort = unknown>(
  query: RemoteSourceQuery<TFilter, TSort> | SourceQuery,
): QueryParams => {
  const base: QueryParams = {
    ...(query.search && { search: query.search }),
    limit: String(query.limit),
    page: String(query.page),
  };

  const rq = query as RemoteSourceQuery<TFilter, TSort>;

  if (rq.filter !== undefined) {
    base['filter'] = hash(rq.filter);
  }

  if (rq.sort !== undefined) {
    base['sort'] = hash(rq.sort);
  }

  return base;
};

export type DecodeQueryOptions = Readonly<{
  defaultLimit?: number;
  strict?: boolean;
}>;

/**
 * Parses URL query params into a `Partial<RemoteSourceQuery<unknown, unknown>>`.
 * Accepts either a plain `Record<string, string | string[] | undefined>` or a `URLSearchParams` instance.
 *
 * - `filter` and `sort` are JSON-parsed and typed as `unknown` — validate and narrow them
 *   with a runtime schema (e.g. Zod) before passing to `applyQuery`.
 * - `search` is omitted from the result when the param is absent (rather than defaulting to `''`).
 * - `limit` and `page` are parsed as positive integers; invalid values fall back to defaults.
 */
export const decodeQuery = (
  params: QueryParamsInput | URLSearchParams,
  options: DecodeQueryOptions = {},
): Partial<RemoteSourceQuery<unknown, unknown>> => {
  const raw: QueryParamsInput =
    params instanceof URLSearchParams ? (Object.fromEntries(params.entries()) as QueryParamsInput) : params;

  const { defaultLimit = 20, strict = false } = options;

  const parsePositiveInt = (value: string | string[] | undefined, fallback: number): number => {
    if (value === undefined) return fallback;

    const str = Array.isArray(value) ? value[0] : value;
    const n = Number(str);

    return Number.isInteger(n) && n > 0 ? n : fallback;
  };

  const parseJson = (key: string, value: string | string[] | undefined): unknown => {
    if (value === undefined) return undefined;

    const str = Array.isArray(value) ? value[0] : value;

    try {
      return JSON.parse(str) as unknown;
    } catch {
      if (strict) throw new Error(`Invalid query param "${key}": ${str}`);

      return undefined;
    }
  };

  const rawLimit = raw['limit'];
  const rawPage = raw['page'];
  const rawSearch = raw['search'];
  const rawFilter = raw['filter'];
  const rawSort = raw['sort'];

  const filter = rawFilter !== undefined ? parseJson('filter', rawFilter) : undefined;
  const sort = rawSort !== undefined ? parseJson('sort', rawSort) : undefined;

  const result: Partial<RemoteSourceQuery<unknown, unknown>> = {
    ...(filter !== undefined && { filter }),
    ...(sort !== undefined && { sort }),
    ...(rawSearch !== undefined && { search: Array.isArray(rawSearch) ? rawSearch[0] : rawSearch }),
    limit: parsePositiveInt(rawLimit, defaultLimit),
    page: parsePositiveInt(rawPage, 1),
  };

  return result;
};
