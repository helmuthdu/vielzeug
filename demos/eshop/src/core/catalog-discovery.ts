import type { BodyType, Model, Powertrain } from './types';

export type SortOrder = 'name-asc' | 'price-asc' | 'price-desc';
export type PriceBand = 'under-60000' | '60000-80000' | 'over-80000';

export type CatalogFilters = {
  bodyTypes: BodyType[];
  powertrains: Powertrain[];
  priceBand: PriceBand | null;
  query: string;
  sortOrder: SortOrder;
};

type CatalogQuery = Record<string, string | string[] | undefined>;

export const BODY_TYPES = ['sedan', 'suv'] as const satisfies readonly BodyType[];
export const POWERTRAINS = ['electric', 'hybrid', 'petrol'] as const satisfies readonly Powertrain[];
export const PRICE_BANDS = ['under-60000', '60000-80000', 'over-80000'] as const satisfies readonly PriceBand[];

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  bodyTypes: [],
  powertrains: [],
  priceBand: null,
  query: '',
  sortOrder: 'price-asc',
};

function valuesFromQuery(query: CatalogQuery, key: string, allowed: readonly string[]): string[] {
  const raw = query[key];
  const values = Array.isArray(raw) ? raw : raw ? raw.split(',') : [];

  return values.filter((value): value is string => allowed.includes(value));
}

export function filtersFromQuery(query: CatalogQuery): CatalogFilters {
  const priceBand = valuesFromQuery(query, 'price', PRICE_BANDS)[0] as PriceBand | undefined;
  const sortOrder = valuesFromQuery(query, 'sort', ['name-asc', 'price-asc', 'price-desc'])[0] as SortOrder | undefined;

  return {
    bodyTypes: valuesFromQuery(query, 'body', BODY_TYPES) as BodyType[],
    powertrains: valuesFromQuery(query, 'powertrain', POWERTRAINS) as Powertrain[],
    priceBand: priceBand ?? null,
    query: typeof query.q === 'string' ? query.q : '',
    sortOrder: sortOrder ?? DEFAULT_CATALOG_FILTERS.sortOrder,
  };
}

export function filtersToQuery(filters: CatalogFilters): Record<string, string> {
  const query: Record<string, string> = {};
  const text = filters.query.trim();

  if (text) query.q = text;
  if (filters.bodyTypes.length) query.body = filters.bodyTypes.join(',');
  if (filters.powertrains.length) query.powertrain = filters.powertrains.join(',');
  if (filters.priceBand) query.price = filters.priceBand;
  if (filters.sortOrder !== DEFAULT_CATALOG_FILTERS.sortOrder) query.sort = filters.sortOrder;

  return query;
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return Boolean(
    filters.query.trim() || filters.bodyTypes.length || filters.powertrains.length || filters.priceBand !== null,
  );
}

function isInPriceBand(model: Model, priceBand: PriceBand | null): boolean {
  if (!priceBand) return true;

  const price = Number(model.basePrice);

  if (priceBand === 'under-60000') return price < 60_000;
  if (priceBand === '60000-80000') return price >= 60_000 && price <= 80_000;

  return price > 80_000;
}

export function filterModels(models: readonly Model[], filters: CatalogFilters): Model[] {
  return models.filter(
    (model) =>
      (!filters.bodyTypes.length || filters.bodyTypes.includes(model.bodyType)) &&
      (!filters.powertrains.length || filters.powertrains.includes(model.powertrain)) &&
      isInPriceBand(model, filters.priceBand),
  );
}

export function sortModels(models: readonly Model[], sortOrder: SortOrder): Model[] {
  const sorted = [...models];

  if (sortOrder === 'price-asc') sorted.sort((a, b) => Number(a.basePrice) - Number(b.basePrice));
  else if (sortOrder === 'price-desc') sorted.sort((a, b) => Number(b.basePrice) - Number(a.basePrice));
  else sorted.sort((a, b) => a.name.localeCompare(b.name));

  return sorted;
}
