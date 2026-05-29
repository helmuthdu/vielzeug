import type { QueryParams, QueryParamsInput, RemoteSourceQuery, SourceQuery } from './types';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

export const decodeLocalQueryParams = (params: QueryParamsInput, defaultLimit = 10): Partial<SourceQuery> => {
  const rawPage = typeof params.page === 'string' ? params.page : undefined;
  const rawLimit = typeof params.limit === 'string' ? params.limit : undefined;
  const rawSearch = typeof params.search === 'string' ? params.search : undefined;

  return {
    limit: parsePositiveInt(rawLimit, defaultLimit),
    page: parsePositiveInt(rawPage, 1),
    search: rawSearch ?? '',
  };
};

export const encodeLocalQueryParams = (query: SourceQuery): QueryParams => ({
  ...(query.search && { search: query.search }),
  limit: String(query.limit),
  page: String(query.page),
});

const parseRemoteQuery = <TFilter, TSort>(
  params: QueryParamsInput,
  defaultLimit: number,
  strict: boolean,
): Partial<RemoteSourceQuery<TFilter, TSort>> => {
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

export const decodeRemoteQueryParams = <TFilter = unknown, TSort = unknown>(
  params: QueryParamsInput,
  defaultLimit = 10,
): Partial<RemoteSourceQuery<TFilter, TSort>> => {
  return parseRemoteQuery<TFilter, TSort>(params, defaultLimit, false);
};

export const decodeRemoteQueryParamsStrict = <TFilter = unknown, TSort = unknown>(
  params: QueryParamsInput,
  defaultLimit = 10,
): Partial<RemoteSourceQuery<TFilter, TSort>> => {
  return parseRemoteQuery<TFilter, TSort>(params, defaultLimit, true);
};

export const encodeRemoteQueryParams = <TFilter = unknown, TSort = unknown>(
  query: RemoteSourceQuery<TFilter, TSort>,
): QueryParams => ({
  ...(query.search && { search: query.search }),
  limit: String(query.limit),
  page: String(query.page),
  ...(query.filter !== undefined && { filter: JSON.stringify(query.filter) }),
  ...(query.sort !== undefined && { sort: JSON.stringify(query.sort) }),
});
