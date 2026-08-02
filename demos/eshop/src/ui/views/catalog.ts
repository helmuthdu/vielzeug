import '@vielzeug/refine/grid';
import '@vielzeug/refine/grid-item';
import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import '@vielzeug/refine/button';

import '../components/model-card';
import '../components/car-silhouette';

import { define, each, html, when } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';

import type { Model } from '../../core/types';

import { compareModelIds } from '../../core/cart-store';
import { modelMap, modelsSignal } from '../../core/catalog';
import { formatPrice } from '../../core/currency';
import { toggleCompare } from '../../core/history';
import { t } from '../../core/i18n';
import { router } from '../../core/router';
import { modelIndex } from '../../core/search-index';

/**
 * The flagship shown above the filterable grid — real OEM configurator sites (this app's own
 * design brief cites Mercedes-Benz Store, BMW's Neuwagensuche) keep a fixed hero banner
 * regardless of search/sort state; it's set dressing for the lineup, not a search result. Picked
 * by id rather than by price/segment so which model is "the flagship" is an explicit editorial
 * choice, matching V500's own catalog description ("The Vielzeug flagship").
 */
const FEATURED_MODEL_ID = 'v500';

type SortOrder = 'name-asc' | 'price-asc' | 'price-desc';

/** Mirrors the reference sites' own default: both the Mercedes-Benz Store and BMW's
 * Neuwagensuche search results linked in this app's design brief load sorted by price,
 * ascending. */
const SORT_OPTIONS: { label: string; value: SortOrder }[] = [
  { label: 'Price: low to high', value: 'price-asc' },
  { label: 'Price: high to low', value: 'price-desc' },
  { label: 'Name: A–Z', value: 'name-asc' },
];

function sortModels(models: Model[], order: SortOrder): Model[] {
  const sorted = [...models];

  if (order === 'price-asc') sorted.sort((a, b) => Number.parseFloat(a.basePrice) - Number.parseFloat(b.basePrice));
  else if (order === 'price-desc')
    sorted.sort((a, b) => Number.parseFloat(b.basePrice) - Number.parseFloat(a.basePrice));
  else sorted.sort((a, b) => a.name.localeCompare(b.name));

  return sorted;
}

function filteredModels(query: string): Model[] {
  const q = query.trim();

  if (!q) return modelsSignal.value;

  return modelIndex.search(q, { limit: modelsSignal.value.length }).map((r) => r.item);
}

define('catalog-view', {
  setup() {
    const query = signal('');
    const sortOrder = signal<SortOrder>('price-asc');
    const results = computed(() => sortModels(filteredModels(query.value), sortOrder.value));
    const featuredModel = computed(() => modelMap.value.get(FEATURED_MODEL_ID));

    const onSearchInput = (e: Event): void => {
      query.value = (e.currentTarget as HTMLElementTagNameMap['ore-input']).value ?? '';
    };

    const onSortChange = (e: Event): void => {
      const next = (e.currentTarget as HTMLElementTagNameMap['ore-select']).value;

      if (next) sortOrder.value = next as SortOrder;
    };

    return html`
      ${when(
        () => featuredModel.value !== undefined,
        () => html`
          <section class="catalog__hero">
            <div class="catalog__hero-media">
              <car-silhouette
                body-type=${() => featuredModel.value!.bodyType}
                color-hex=${() => featuredModel.value!.colors[0]?.hex ?? '#c7ccd1'}
                color-name=${() => featuredModel.value!.colors[0]?.name ?? ''}
                hero-hue=${() => featuredModel.value!.heroHue}></car-silhouette>
            </div>
            <div class="catalog__hero-content">
              <p class="catalog__hero-segment">
                ${() => `${featuredModel.value!.segment} — ${t('catalog.featuredLabel')}`}
              </p>
              <h2 class="catalog__hero-name">${() => featuredModel.value!.name}</h2>
              <p class="catalog__hero-tagline">${() => featuredModel.value!.tagline}</p>
              <div class="catalog__hero-specs">
                <div class="spec">
                  <span class="spec__label">${() => t('model.topSpeed')}</span>
                  <strong>${() => `${featuredModel.value!.topSpeedKph} km/h`}</strong>
                </div>
                <div class="spec">
                  <span class="spec__label">${() => t('model.zeroToHundred')}</span>
                  <strong>${() => `${featuredModel.value!.zeroToHundredSec}s`}</strong>
                </div>
                <div class="spec">
                  <span class="spec__label">${() => t('common.startingAt')}</span>
                  <strong>${() => formatPrice(featuredModel.value!.basePrice)}</strong>
                </div>
              </div>
              <div class="catalog__hero-actions">
                <ore-button
                  rounded
                  variant="solid"
                  color="primary"
                  @click=${() =>
                    void router.navigate({ name: 'modelDetail', params: { slug: featuredModel.value!.slug } })}>
                  ${() => t('common.viewDetails')}
                </ore-button>
                <ore-button rounded variant="ghost" @click=${() => toggleCompare(featuredModel.value!.id)}>
                  ${() =>
                    compareModelIds.value.includes(featuredModel.value!.id)
                      ? t('common.removeFromCompare')
                      : t('common.addToCompare')}
                </ore-button>
              </div>
            </div>
          </section>
        `,
      )}

      <div class="catalog__header">
        <div>
          <h1>${() => t('nav.catalog')}</h1>
          <p class="catalog__count">${() => t('catalog.resultCount', { count: results.value.length })}</p>
        </div>
        <div class="catalog__toolbar">
          <ore-input
            class="catalog__search"
            type="search"
            clearable
            placeholder=${() => t('common.search')}
            @input=${onSearchInput}></ore-input>
          <ore-select
            class="catalog__sort"
            options=${SORT_OPTIONS}
            value=${() => sortOrder.value}
            @change=${onSortChange}></ore-select>
        </div>
      </div>

      <ore-grid cols="1" cols-sm="2" cols-lg="3" gap="lg" fullwidth>
        ${each(
          results,
          (m) => m.id,
          (m) => html`
            <ore-grid-item>
              <model-card
                model=${() => m.value}
                in-compare=${() => compareModelIds.value.includes(m.value.id)}
                @toggle-compare=${() => toggleCompare(m.value.id)}
                @view=${() => void router.navigate({ name: 'modelDetail', params: { slug: m.value.slug } })}></model-card>
            </ore-grid-item>
          `,
        )}
      </ore-grid>
    `;
  },
  shadow: false,
});

export function createCatalogView(): HTMLElement {
  const el = document.createElement('catalog-view');

  el.className = 'catalog';

  return el;
}
