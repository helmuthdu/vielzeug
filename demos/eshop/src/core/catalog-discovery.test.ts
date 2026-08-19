import { describe, expect, it } from 'vitest';

import {
  type CatalogFilters,
  DEFAULT_CATALOG_FILTERS,
  filterModels,
  filtersFromQuery,
  filtersToQuery,
  hasActiveFilters,
  sortModels,
} from './catalog-discovery';
import { models as seedModels } from './seed-data';
import type { Model } from './types';

const models = [
  { basePrice: '52000', bodyType: 'suv', id: 'x300', name: 'Vielzeug X300', powertrain: 'petrol' },
  { basePrice: '71900', bodyType: 'sedan', id: 'av400', name: 'Vielzeug AV400', powertrain: 'electric' },
  { basePrice: '89900', bodyType: 'suv', id: 'x600-as', name: 'Vielzeug X600 AS', powertrain: 'petrol' },
] as Model[];

describe('catalog discovery', () => {
  it('round-trips valid filter state through URL query parameters', () => {
    const filters: CatalogFilters = {
      bodyTypes: ['suv'],
      powertrains: ['electric', 'petrol'],
      priceBand: '60000-80000',
      query: '  volt  ',
      sortOrder: 'name-asc',
    };

    expect(filtersFromQuery(filtersToQuery(filters))).toEqual({
      bodyTypes: ['suv'],
      powertrains: ['electric', 'petrol'],
      priceBand: '60000-80000',
      query: 'volt',
      sortOrder: 'name-asc',
    });
  });

  it('drops invalid query values while retaining known filter values', () => {
    expect(
      filtersFromQuery({ body: 'suv,coupe,truck', powertrain: 'electric,hydrogen', price: 'cheap', sort: 'random' }),
    ).toEqual({ ...DEFAULT_CATALOG_FILTERS, bodyTypes: ['suv'], powertrains: ['electric'] });
  });

  it('filters multiple discovery dimensions together', () => {
    const filters: CatalogFilters = {
      ...DEFAULT_CATALOG_FILTERS,
      bodyTypes: ['suv'],
      powertrains: ['petrol'],
      priceBand: 'under-60000',
    };

    expect(filterModels(models, filters).map((model) => model.id)).toEqual(['x300']);
  });

  it('sorts a copy without mutating the matching search results', () => {
    const result = sortModels(models, 'price-desc');

    expect(result.map((model) => model.id)).toEqual(['x600-as', 'av400', 'x300']);
    expect(models.map((model) => model.id)).toEqual(['x300', 'av400', 'x600-as']);
  });

  it('treats text search as an active filter', () => {
    expect(hasActiveFilters({ ...DEFAULT_CATALOG_FILTERS, query: 'av400' })).toBe(true);
    expect(hasActiveFilters(DEFAULT_CATALOG_FILTERS)).toBe(false);
  });

  it('starts the lineup with varied model paints', () => {
    expect(seedModels.map((model) => model.colors[0].id)).toEqual([
      'polar-white',
      'crimson-red',
      'obsidian-black',
      'sapphire-blue',
      'graphite-grey',
      'glacier-silver',
    ]);
  });
});
