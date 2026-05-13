import type { QueryParams, QueryParamsInput, RemoteSourceSnapshot, SourceSnapshot } from './types';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

export const decodeLocalQueryParams = (params: QueryParamsInput, defaultLimit = 10): Partial<SourceSnapshot> => {
  const rawPage = typeof params.page === 'string' ? params.page : undefined;
  const rawLimit = typeof params.limit === 'string' ? params.limit : undefined;
  const rawSearch = typeof params.search === 'string' ? params.search : undefined;

  return {
    limit: parsePositiveInt(rawLimit, defaultLimit),
    page: parsePositiveInt(rawPage, 1),
    search: rawSearch ?? '',
  };
};

export const encodeLocalQueryParams = (snapshot: SourceSnapshot): QueryParams => ({
  ...(snapshot.search && { search: snapshot.search }),
  limit: String(snapshot.limit),
  page: String(snapshot.page),
});

const parseRemoteState = <TFilter, TSort>(
  params: QueryParamsInput,
  defaultLimit: number,
  strict: boolean,
): Partial<RemoteSourceSnapshot<TFilter, TSort>> => {
  const rawPage = typeof params.page === 'string' ? params.page : undefined;
  const rawLimit = typeof params.limit === 'string' ? params.limit : undefined;
  const rawSearch = typeof params.search === 'string' ? params.search : undefined;
  const rawFilter = typeof params.filter === 'string' ? params.filter : undefined;
  const rawSort = typeof params.sort === 'string' ? params.sort : undefined;

  let filter: TFilter | undefined;
  let sort: TSort | undefined;

  if (rawFilter) {
    try {
      filter = JSON.parse(rawFilter) as TFilter;
    } catch (error) {
      if (strict) {
        throw new Error(`Invalid query param "filter": ${String(error)}`, { cause: error });
      }
    }
  }

  if (rawSort) {
    try {
      sort = JSON.parse(rawSort) as TSort;
    } catch (error) {
      if (strict) {
        throw new Error(`Invalid query param "sort": ${String(error)}`, { cause: error });
      }
    }
  }

  return {
    filter,
    limit: parsePositiveInt(rawLimit, defaultLimit),
    page: parsePositiveInt(rawPage, 1),
    search: rawSearch ?? '',
    sort,
  };
};

export const decodeRemoteQueryParams = <TFilter = unknown, TSort = unknown>(
  params: QueryParamsInput,
  defaultLimit = 10,
): Partial<RemoteSourceSnapshot<TFilter, TSort>> => {
  return parseRemoteState<TFilter, TSort>(params, defaultLimit, false);
};

export const decodeRemoteQueryParamsStrict = <TFilter = unknown, TSort = unknown>(
  params: QueryParamsInput,
  defaultLimit = 10,
): Partial<RemoteSourceSnapshot<TFilter, TSort>> => {
  return parseRemoteState<TFilter, TSort>(params, defaultLimit, true);
};

export const encodeRemoteQueryParams = <TFilter = unknown, TSort = unknown>(
  snapshot: RemoteSourceSnapshot<TFilter, TSort>,
): QueryParams => ({
  ...(snapshot.search && { search: snapshot.search }),
  limit: String(snapshot.limit),
  page: String(snapshot.page),
  ...(snapshot.filter !== undefined && { filter: JSON.stringify(snapshot.filter) }),
  ...(snapshot.sort !== undefined && { sort: JSON.stringify(snapshot.sort) }),
});
