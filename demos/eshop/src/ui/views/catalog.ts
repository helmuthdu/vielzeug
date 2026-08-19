import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/grid-item';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import '@vielzeug/refine/skeleton';

import '../components/model-card';

import { define, html, onCleanup, when } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import { compareModelIds } from '../../core/cart-store';
import { modelMap, modelsSignal } from '../../core/catalog';
import {
  BODY_TYPES,
  type CatalogFilters,
  DEFAULT_CATALOG_FILTERS,
  filterModels,
  filtersFromQuery,
  filtersToQuery,
  hasActiveFilters,
  POWERTRAINS,
  PRICE_BANDS,
  type PriceBand,
  type SortOrder,
  sortModels,
} from '../../core/catalog-discovery';
import { controlValue } from '../../core/control-value';
import { formatPrice } from '../../core/currency';
import { toggleCompare } from '../../core/history';
import { t } from '../../core/i18n';
import { activeRouteQuery, router } from '../../core/router';
import { modelIndex } from '../../core/search-index';
import type { BodyType, Model, Powertrain } from '../../core/types';

const FEATURED_MODEL_ID = 'v500';

const SORT_ORDERS = ['price-asc', 'price-desc', 'name-asc'] as const satisfies readonly SortOrder[];

function sortOptions(): { label: string; value: SortOrder }[] {
  return [
    { label: t('catalog.sortOptions.priceAsc'), value: 'price-asc' },
    { label: t('catalog.sortOptions.priceDesc'), value: 'price-desc' },
    { label: t('catalog.sortOptions.nameAsc'), value: 'name-asc' },
  ];
}

function isSortOrder(value: string): value is SortOrder {
  return SORT_ORDERS.some((sortOrder) => sortOrder === value);
}

type ActiveFilter =
  | { kind: 'body'; value: BodyType }
  | { kind: 'powertrain'; value: Powertrain }
  | { kind: 'price'; value: PriceBand }
  | { kind: 'query'; value: string };

function activeFilters(filters: CatalogFilters): ActiveFilter[] {
  return [
    ...filters.bodyTypes.map((value) => ({ kind: 'body' as const, value })),
    ...filters.powertrains.map((value) => ({ kind: 'powertrain' as const, value })),
    ...(filters.priceBand ? [{ kind: 'price' as const, value: filters.priceBand }] : []),
    ...(filters.query.trim() ? [{ kind: 'query' as const, value: filters.query.trim() }] : []),
  ];
}

function featureModel(): Model {
  return modelMap.value.get(FEATURED_MODEL_ID)!;
}

function bodyTypeLabel(value: BodyType): string {
  return t(`catalog.bodyTypes.${value}`);
}

function powertrainLabel(value: Powertrain): string {
  return t(`catalog.powertrains.${value}`);
}

function priceBandLabel(value: PriceBand): string {
  if (value === 'under-60000') return t('catalog.priceBands.under', { price: formatPrice('60000') });
  if (value === '60000-80000')
    return t('catalog.priceBands.between', { high: formatPrice('80000'), low: formatPrice('60000') });

  return t('catalog.priceBands.over', { price: formatPrice('80000') });
}

function filterLabel(filter: ActiveFilter): string {
  if (filter.kind === 'body') return bodyTypeLabel(filter.value);
  if (filter.kind === 'powertrain') return powertrainLabel(filter.value);
  if (filter.kind === 'price') return priceBandLabel(filter.value);

  return `“${filter.value}”`;
}

type FilterOption<T> = { count: number; value: T };

function filterLabelWithCount(label: string, count: number): string {
  return t('catalog.filterCount', { count, label });
}

function toggleValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((candidate) => candidate !== value) : [...values, value];
}

define('catalog-view', {
  setup() {
    const filters = signal(filtersFromQuery(activeRouteQuery.value));
    const featuredModel = computed(() => modelMap.value.get(FEATURED_MODEL_ID));
    const results = computed(() => {
      const current = filters.value;
      const searched = current.query.trim()
        ? modelIndex.search(current.query.trim(), { limit: modelsSignal.value.length }).map((result) => result.item)
        : modelsSignal.value;
      const filtered = filterModels(searched, current);

      return current.query.trim() ? filtered : sortModels(filtered, current.sortOrder);
    });
    const gridResults = computed(() =>
      hasActiveFilters(filters.value) ? results.value : results.value.filter((model) => model.id !== FEATURED_MODEL_ID),
    );
    const selectedFilters = computed(() => activeFilters(filters.value));
    const bodyTypeOptions = computed<FilterOption<BodyType>[]>(() =>
      BODY_TYPES.map((value) => ({
        count: modelsSignal.value.filter((model) => model.bodyType === value).length,
        value,
      })).filter((option) => option.count > 0),
    );
    const powertrainOptions = computed<FilterOption<Powertrain>[]>(() =>
      POWERTRAINS.map((value) => ({
        count: modelsSignal.value.filter((model) => model.powertrain === value).length,
        value,
      })).filter((option) => option.count > 0),
    );
    const priceBandOptions = computed<FilterOption<PriceBand>[]>(() =>
      PRICE_BANDS.map((value) => ({
        count: filterModels(modelsSignal.value, { ...DEFAULT_CATALOG_FILTERS, priceBand: value }).length,
        value,
      })).filter((option) => option.count > 0),
    );
    const filtersOpen = signal(hasActiveFilters(filters.value));

    const syncUrl = (next: CatalogFilters): void => {
      void router.navigate({ name: 'catalog', query: filtersToQuery(next) }, { replace: true });
    };

    const updateFilters = (update: (current: CatalogFilters) => CatalogFilters): void => {
      const next = update(filters.value);

      filters.value = next;
      syncUrl(next);
    };

    const routeWatcher = watch(activeRouteQuery, (query) => {
      filters.value = filtersFromQuery(query);
    });

    onCleanup(() => routeWatcher.dispose());

    const onSearchInput = (event: Event): void => {
      const query = controlValue(event) ?? '';

      updateFilters((current) => ({ ...current, query }));
    };

    const onSortChange = (event: Event): void => {
      const sortOrder = controlValue(event);

      if (sortOrder && isSortOrder(sortOrder)) updateFilters((current) => ({ ...current, sortOrder }));
    };

    const toggleBodyType = (bodyType: BodyType): void => {
      updateFilters((current) => ({ ...current, bodyTypes: toggleValue(current.bodyTypes, bodyType) }));
    };

    const togglePowertrain = (powertrain: Powertrain): void => {
      updateFilters((current) => ({ ...current, powertrains: toggleValue(current.powertrains, powertrain) }));
    };

    const setPriceBand = (priceBand: PriceBand): void => {
      updateFilters((current) => ({ ...current, priceBand }));
    };

    const togglePriceBand = (priceBand: PriceBand): void => {
      updateFilters((current) => ({ ...current, priceBand: current.priceBand === priceBand ? null : priceBand }));
    };

    const removeFilter = (filter: ActiveFilter): void => {
      updateFilters((current) => {
        if (filter.kind === 'body')
          return { ...current, bodyTypes: current.bodyTypes.filter((value) => value !== filter.value) };
        if (filter.kind === 'powertrain')
          return { ...current, powertrains: current.powertrains.filter((value) => value !== filter.value) };
        if (filter.kind === 'price') return { ...current, priceBand: null };

        return { ...current, query: '' };
      });
    };

    const clearFilters = (): void => {
      filters.value = { ...DEFAULT_CATALOG_FILTERS };
      syncUrl(filters.value);
    };

    const toggleFilters = (): void => {
      filtersOpen.value = !filtersOpen.value;
    };

    return html`
      <header class="catalog__intro">
        <div>
          <h1>${() => t('catalog.title')}</h1>
          <p>${() => t('catalog.intro')}</p>
        </div>
      </header>

      ${when(
        () => featuredModel.value !== undefined && !hasActiveFilters(filters.value),
        () => html`
          <section class="catalog__hero" style=${() => `--model-hue: ${featureModel().heroHue}deg`}>
            <div class="catalog__hero-media">
              <ore-skeleton striped width="100%" height="360px" aria-hidden="true"></ore-skeleton>
            </div>
            <div class="catalog__hero-content">
              <h2 class="catalog__hero-name">${() => featureModel().name}</h2>
              <p class="catalog__hero-tagline">${() => featureModel().tagline}</p>
              <p class="catalog__hero-description">${() => featureModel().description}</p>
              <div class="catalog__hero-specs">
                <div class="spec">
                  <span class="spec__label">${() => t('model.topSpeed')}</span>
                  <strong>${() => `${featureModel().topSpeedKph} km/h`}</strong>
                </div>
                <div class="spec">
                  <span class="spec__label">${() => t('model.zeroToHundred')}</span>
                  <strong>${() => `${featureModel().zeroToHundredSec}s`}</strong>
                </div>
                <div class="spec">
                  <span class="spec__label">${() => t('common.startingAt')}</span>
                  <strong>${() => formatPrice(featureModel().basePrice)}</strong>
                </div>
              </div>
              <div class="catalog__hero-actions">
                <ore-button
                  rounded
                  variant="solid"
                  color="secondary"
                  size="lg"
                  @click=${() => void router.navigate({ name: 'modelDetail', params: { slug: featureModel().slug } })}>
                  ${() => t('common.viewDetails')}
                </ore-button>
                <ore-button 
                  size="lg"
                  icon-only 
                  rounded
                  color=${() => (compareModelIds.value.includes(featureModel().id) ? 'primary' : 'secondary')}
                  variant=${() => (compareModelIds.value.includes(featureModel().id) ? 'flat' : 'outline')}
                  @click=${() => toggleCompare(featureModel().id)}>
                  
                  <ore-icon name="git-compare" size="16" aria-hidden="true"></ore-icon>
                </ore-button>
              </div>
            </div>
          </section>
        `,
      )}

      <section class="catalog__discovery" aria-label=${() => t('catalog.discoveryLabel')}>
        <div class="catalog__search-rail">
          <ore-input
            class="catalog__search"
            type="search"
            clearable
            variant="text"
            label=${() => t('catalog.searchLabel')}
            placeholder=${() => t('catalog.searchPlaceholder')}
            value=${() => filters.value.query}
            @input=${onSearchInput}></ore-input>
          <div class="catalog__rail-actions">
            <div class="catalog__sort-control">
              <ore-select
                class="catalog__sort"
                variant="text"
                label=${() => t('catalog.sortLabel')}
                options=${() => sortOptions()}
                value=${() => filters.value.sortOrder}
                ?disabled=${() => Boolean(filters.value.query.trim())}
                @change=${onSortChange}></ore-select>
              ${when(
                () => Boolean(filters.value.query.trim()),
                () => html`<p class="catalog__sort-hint">${() => t('catalog.relevanceHint')}</p>`,
              )}
            </div>
            <ore-button
              fullheight
              fullwidth
              class="catalog__filter-toggle"
              color="secondary"
              aria-controls="catalog-filter-panel"
              aria-expanded=${() => String(filtersOpen.value)}
              @click=${toggleFilters}>
              <ore-icon slot="icon" name="sliders-horizontal" size="15" aria-hidden="true"></ore-icon>
              ${() =>
                selectedFilters.value.length
                  ? t('catalog.refineWithCount', { count: selectedFilters.value.length })
                  : t('catalog.refine')}
            </ore-button>
          </div>
        </div>

        <div class="catalog__popular-filters" aria-label=${() => t('catalog.popularFiltersLabel')}>
          <span>${() => t('catalog.popularFiltersLabel')}</span>
          <div>
            <ore-chip
              class="catalog__quick-filter"
              mode="selectable"
              variant="bordered"
              rounded
              color="secondary"
              label=${() => powertrainLabel('electric')}
              value="electric"
              ?checked=${() => filters.value.powertrains.includes('electric')}
              @change=${() => togglePowertrain('electric')}>
              ${() => powertrainLabel('electric')}
            </ore-chip>
            <ore-chip
              class="catalog__quick-filter"
              mode="selectable"
              variant="bordered"
              rounded
              color="secondary"
              label=${() => bodyTypeLabel('suv')}
              value="suv"
              ?checked=${() => filters.value.bodyTypes.includes('suv')}
              @change=${() => toggleBodyType('suv')}>
              ${() => bodyTypeLabel('suv')}
            </ore-chip>
            <ore-chip
              class="catalog__quick-filter"
              mode="selectable"
              variant="bordered"
              rounded
              color="secondary"
              label=${() => priceBandLabel('under-60000')}
              value="under-60000"
              ?checked=${() => filters.value.priceBand === 'under-60000'}
              @change=${() => togglePriceBand('under-60000')}>
              ${() => priceBandLabel('under-60000')}
            </ore-chip>
          </div>
          <p class="catalog__count" role="status" aria-live="polite" aria-atomic="true">
            ${() => t('catalog.resultCount', { count: results.value.length })}
          </p>
        </div>

        ${when(
          () => selectedFilters.value.length > 0,
          () => html`
            <div class="catalog__active-filters" aria-label=${() => t('catalog.activeFiltersLabel')}>
              <span>${() => t('catalog.activeFiltersLabel')}</span>
              <div>
                ${selectedFilters.value.map(
                  (filter) => html`
                    <ore-chip
                      mode="removable"
                      variant="flat"
                      color="primary"
                      label=${() => filterLabel(filter)}
                      value=${() => filterLabel(filter)}
                      @remove=${() => removeFilter(filter)}>
                      ${() => filterLabel(filter)}
                    </ore-chip>
                  `,
                )}
                <ore-button variant="ghost" @click=${clearFilters}>${() => t('catalog.clearFilters')}</ore-button>
              </div>
            </div>
          `,
        )}

        ${when(
          () => filtersOpen.value,
          () => html`
            <div class="catalog__filter-panel" id="catalog-filter-panel">
              <fieldset class="catalog__filter-group">
                <legend>${() => t('catalog.bodyTypeLabel')}</legend>
                <div class="catalog__filter-options">
                  ${() =>
                    bodyTypeOptions.value.map(
                      (option) => html`
                        <ore-chip
                          rounded
                          mode="selectable"
                          variant="outline"
                          color="secondary"
                          label=${() => filterLabelWithCount(bodyTypeLabel(option.value), option.count)}
                          value=${option.value}
                          ?checked=${() => filters.value.bodyTypes.includes(option.value)}
                          @change=${() => toggleBodyType(option.value)}>
                          ${() => filterLabelWithCount(bodyTypeLabel(option.value), option.count)}
                        </ore-chip>
                      `,
                    )}
                </div>
              </fieldset>
              <fieldset class="catalog__filter-group">
                <legend>${() => t('catalog.powertrainLabel')}</legend>
                <div class="catalog__filter-options">
                  ${() =>
                    powertrainOptions.value.map(
                      (option) => html`
                        <ore-chip
                          rounded
                          mode="selectable"
                          variant=${() => (filters.value.powertrains.includes(option.value) ? 'solid' : 'outline')}
                          color="secondary"
                          label=${() => filterLabelWithCount(powertrainLabel(option.value), option.count)}
                          value=${option.value}
                          ?checked=${() => filters.value.powertrains.includes(option.value)}
                          @change=${() => togglePowertrain(option.value)}>
                          ${() => filterLabelWithCount(powertrainLabel(option.value), option.count)}
                        </ore-chip>
                      `,
                    )}
                </div>
              </fieldset>
              <fieldset class="catalog__filter-group">
                <legend>${() => t('catalog.priceLabel')}</legend>
                <div class="catalog__filter-options">
                  <label class="catalog__price-option">
                    <input
                      type="radio"
                      name="catalog-price"
                      value=""
                      ?checked=${() => filters.value.priceBand === null}
                      @change=${() => updateFilters((current) => ({ ...current, priceBand: null }))} />
                    <span>${() => t('catalog.anyPrice')}</span>
                  </label>
                  ${() =>
                    priceBandOptions.value.map(
                      (option) => html`
                        <label class="catalog__price-option">
                          <input
                            type="radio"
                            name="catalog-price"
                            value=${option.value}
                            ?checked=${() => filters.value.priceBand === option.value}
                            @change=${() => setPriceBand(option.value)} />
                          <span>${() => filterLabelWithCount(priceBandLabel(option.value), option.count)}</span>
                        </label>
                      `,
                    )}
                </div>
              </fieldset>
            </div>
          `,
        )}
      </section>

      ${when(
        () => results.value.length === 0,
        () => html`
          <section class="catalog__empty" aria-labelledby="catalog-empty-title">
            <h2 id="catalog-empty-title">${() => t('catalog.emptyTitle')}</h2>
            <p>${() => t('catalog.emptyDescription', { query: filters.value.query.trim() })}</p>
            <ore-button variant="outline" @click=${clearFilters}>${() => t('catalog.clearFilters')}</ore-button>
          </section>
        `,
        () => html`
          <ore-grid cols="1" cols-sm="2" cols-lg="3" gap="lg" fullwidth>
            ${gridResults.value.map(
              (model) => html`
                <ore-grid-item>
                  <model-card
                    model=${model}
                    in-compare=${() => compareModelIds.value.includes(model.id)}
                    @toggle-compare=${() => toggleCompare(model.id)}
                    @view=${() => void router.navigate({ name: 'modelDetail', params: { slug: model.slug } })}></model-card>
                </ore-grid-item>
              `,
            )}
          </ore-grid>
        `,
      )}
    `;
  },
  shadow: false,
});

export function createCatalogView(): HTMLElement {
  const el = document.createElement('catalog-view');

  el.className = 'catalog';

  return el;
}
