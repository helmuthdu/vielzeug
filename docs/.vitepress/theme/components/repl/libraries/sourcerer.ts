export const description = 'Reactive query sources with pagination and URL state sync.';

export const loader = () => import('@vielzeug/sourcerer');

export const apiExports = [
  'createLocalSource',
  'createRemoteSource',
  'subscribeSelector',
  'decodeLocalQueryParams',
  'encodeLocalQueryParams',
  'decodeRemoteQueryParams',
  'decodeRemoteQueryParamsStrict',
  'encodeRemoteQueryParams',
  'filterContains',
  'filterEquals',
  'filterRange',
  'sortBy',
] as const;
