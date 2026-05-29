import type { QueryParams, QueryParamsInput, RemoteSourceQuery, SourceQuery } from './types';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

export type DecodeQueryOptions = {
  defaultLimit?: number;
  strict?: boolean;
};

/**
 * Decodes URL query parameters into a partial source query object.
 * Handles both local (page/limit/search) and remote (+ filter/sort) params.
 * When `strict` is true, malformed filter/sort JSON params throw instead of being silently dropped.
 */
export const decodeQuery = <TFilter = unknown, TSort = unknown>(
  params: QueryParamsInput,
  options: DecodeQueryOptions = {},
): Partial<RemoteSourceQuery<TFilter, TSort>> => {
  const { defaultLimit = 10, strict = false } = options;

  const rawPage = typeof params.page === 'string' ? params.page : undefined;
  const rawLimit = typeof params.limit === 'string' ? params.limit : undefined;
  const rawSearch = typeof params.search === 'string' ? params.search : undefined;
  const rawFilter = typeof params.filter === 'string' ? params.filter : undefined;
  const rawSort = typeof params.sort === 'string' ? params.sort : undefined;

  let filter: TFilter | undefined;
  let sort: TSort | undefined;
  let hasFilter = false;
  let hasSort = false;

  if (rawFilter !== undefined) {
    try {
      filter = JSON.parse(rawFilter) as TFilter;
      hasFilter = true;
    } catch (error) {
      if (strict) {
        throw new Error(`Invalid query param "filter": ${String(error)}`, { cause: error });
      }
    }
  }

  if (rawSort !== undefined) {
    try {
      sort = JSON.parse(rawSort) as TSort;
      hasSort = true;
    } catch (error) {
      if (strict) {
        throw new Error(`Invalid query param "sort": ${String(error)}`, { cause: error });
      }
    }
  }

  return {
    ...(hasFilter && { filter }),
    ...(hasSort && { sort }),
    limit: parsePositiveInt(rawLimit, defaultLimit),
    page: parsePositiveInt(rawPage, 1),
    search: rawSearch ?? '',
  };
};

/**
 * Encodes a source query into URL query parameters.
 * Omits empty search. Serializes filter/sort as JSON when present.
 */
export const encodeQuery = <TFilter = unknown, TSort = unknown>(
  query: SourceQuery | RemoteSourceQuery<TFilter, TSort>,
): QueryParams => {
  const base: QueryParams = {
    ...(query.search && { search: query.search }),
    limit: String(query.limit),
    page: String(query.page),
  };

  const remote = query as RemoteSourceQuery<TFilter, TSort>;

  if (remote.filter !== undefined) {
    base.filter = JSON.stringify(remote.filter);
  }

  if (remote.sort !== undefined) {
    base.sort = JSON.stringify(remote.sort);
  }

  return base;
};
