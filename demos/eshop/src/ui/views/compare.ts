import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/skeleton';
import '@vielzeug/refine/switch';

import { define, html, onCleanup, when } from '@vielzeug/ore';
import { computed, effect, signal } from '@vielzeug/ripple';
import { compareModels } from '../../core/cart-store';
import { formatPrice } from '../../core/currency';
import { bus } from '../../core/events';
import { removeFromCompare, replaceCompare } from '../../core/history';
import { t } from '../../core/i18n';
import { router } from '../../core/router';
import type { Model } from '../../core/types';

type Direction = 'max' | 'min';
type SpecKey =
  | 'basePrice'
  | 'electricRange'
  | 'fuelEconomy'
  | 'powertrain'
  | 'seats'
  | 'segment'
  | 'topSpeedKph'
  | 'zeroToHundredSec';
type SpecRow = { better?: Direction; key: SpecKey };
type SpecGroup = { key: 'efficiency' | 'overview' | 'performance'; rows: SpecRow[] };

const SPEC_GROUPS: SpecGroup[] = [
  {
    key: 'overview',
    rows: [{ key: 'segment' }, { key: 'powertrain' }, { better: 'min', key: 'basePrice' }, { key: 'seats' }],
  },
  {
    key: 'performance',
    rows: [
      { better: 'min', key: 'zeroToHundredSec' },
      { better: 'max', key: 'topSpeedKph' },
    ],
  },
  {
    key: 'efficiency',
    rows: [
      { better: 'max', key: 'electricRange' },
      { better: 'min', key: 'fuelEconomy' },
    ],
  },
];

function initialModelIds(): string[] {
  const hashQuery = location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?') + 1) : '';
  return (new URLSearchParams(location.search || hashQuery).get('models') ?? '').split(',').filter(Boolean);
}

function syncUrl(): void {
  const models = compareModels.value.map(({ id }) => id).join(',');
  const query = models ? `?models=${encodeURIComponent(models)}` : '';
  if (location.hash.startsWith('#/'))
    history.replaceState(history.state, '', `${location.pathname}${location.search}#/compare${query}`);
  else history.replaceState(history.state, '', `${location.pathname}${query}${location.hash}`);
}

function valueFor(row: SpecKey, model: Model): number | string | null {
  switch (row) {
    case 'basePrice':
      return Number(model.basePrice);
    case 'electricRange':
      return model.powertrain === 'electric' ? model.rangeKm : null;
    case 'fuelEconomy':
      return model.powertrain === 'electric' ? null : model.fuelEconomyLPer100Km;
    case 'powertrain':
      return model.powertrain;
    case 'seats':
      return model.seats;
    case 'segment':
      return model.segment;
    case 'topSpeedKph':
      return model.topSpeedKph;
    case 'zeroToHundredSec':
      return model.zeroToHundredSec;
  }
}

function formatSpec(row: SpecKey, model: Model): string {
  const value = valueFor(row, model);
  if (value === null) return '—';
  switch (row) {
    case 'basePrice':
      return formatPrice(String(value));
    case 'electricRange':
      return t('compare.valueRange', { value });
    case 'fuelEconomy':
      return t('compare.valueConsumption', { value });
    case 'powertrain':
      return t(`catalog.powertrains.${value}`);
    case 'seats':
      return t('catalog.seatCount', { count: value });
    case 'topSpeedKph':
      return t('compare.valueSpeed', { value });
    case 'zeroToHundredSec':
      return t('compare.valueAcceleration', { value });
    default:
      return String(value);
  }
}

function winnerIds(row: SpecRow, models: Model[]): Set<string> {
  if (!row.better || models.length < 2) return new Set();
  const values = models
    .map((model) => ({ id: model.id, value: valueFor(row.key, model) }))
    .filter((entry): entry is { id: string; value: number } => typeof entry.value === 'number');
  if (values.length < 2 || new Set(values.map(({ value }) => value)).size === 1) return new Set();
  const best =
    row.better === 'min'
      ? Math.min(...values.map(({ value }) => value))
      : Math.max(...values.map(({ value }) => value));
  return new Set(values.filter(({ value }) => value === best).map(({ id }) => id));
}

function isIdentical(row: SpecRow, models: Model[]): boolean {
  return new Set(models.map((model) => formatSpec(row.key, model))).size <= 1;
}

define('compare-view', {
  setup() {
    const highlightDifferences = signal(true);
    const hideIdentical = signal(false);
    const requestedIds = initialModelIds();
    if (requestedIds.length) replaceCompare(requestedIds);

    const visibleGroups = computed(() =>
      SPEC_GROUPS.map((group) => ({
        ...group,
        rows: hideIdentical.value ? group.rows.filter((row) => !isIdentical(row, compareModels.value)) : group.rows,
      })).filter(({ rows }) => rows.length > 0),
    );
    const visibleRowCount = computed(() => visibleGroups.value.reduce((count, group) => count + group.rows.length, 0));
    const urlSync = effect(() => {
      void compareModels.value;
      syncUrl();
      return undefined;
    });
    onCleanup(() => urlSync.dispose());

    const share = async (): Promise<void> => {
      try {
        await navigator.clipboard.writeText(location.href);
        bus.emit('toast:show', { message: t('compare.shareCopied'), variant: 'success' });
      } catch {
        bus.emit('toast:show', { message: t('compare.shareFailed'), variant: 'error' });
      }
    };
    const chooseModels = (): void => {
      void router.navigate({ name: 'catalog' });
    };

    return html`
      <header class="compare-view__header">
        <div>
          <span class="compare-view__eyebrow">${() => t('compare.eyebrow')}</span>
          <h1>${() => t('compare.pageTitle')}</h1>
          <p>${() => t('compare.pageHint')}</p>
        </div>
        <div class="compare-view__header-actions" ?hidden=${() => compareModels.value.length < 2}>
          <ore-button class="compare-view__action" variant="outline" @click=${chooseModels}>
            <ore-icon slot="prefix" name="plus" size="15" aria-hidden="true"></ore-icon>
            ${() => t('compare.addModel')}
          </ore-button>
          <ore-button
            class="compare-view__action"
            variant="outline"
            ?disabled=${() => compareModels.value.length < 2}
            @click=${share}>
            <ore-icon slot="prefix" name="share-2" size="15" aria-hidden="true"></ore-icon>
            ${() => t('compare.share')}
          </ore-button>
        </div>
      </header>

      ${when(
        () => compareModels.value.length === 0,
        () => html`
          <section class="compare-view__empty">
            <span><ore-icon name="git-compare" size="28" aria-hidden="true"></ore-icon></span>
            <h2>${() => t('compare.emptyTitle')}</h2>
            <p>${() => t('compare.emptyHint')}</p>
            <ore-button color="primary" @click=${chooseModels}>${() => t('compare.chooseModels')}</ore-button>
          </section>
        `,
        () => html`
          ${when(
            () => compareModels.value.length === 1,
            () => html`
              <section class="compare-one" aria-labelledby="compare-one-title">
                <div class="compare-one__heading">
                  <span class="compare-view__eyebrow">${() => t('compare.firstSelected')}</span>
                  <h2 id="compare-one-title">${() => t('compare.oneTitle')}</h2>
                  <p>${() => t('compare.oneHint')}</p>
                </div>
                <div class="compare-one__grid">
                  <article class="compare-one__model">
                    <ore-skeleton
                      striped
                      role="img"
                      radius="0"
                      aria-label=${() => t('compare.modelImage', { name: compareModels.value[0]!.name })}></ore-skeleton>
                    <div class="compare-one__model-copy">
                      <ore-badge variant="flat" color="primary">${() => t('compare.selectedModel')}</ore-badge>
                      <span>${() => compareModels.value[0]!.segment}</span>
                      <h3>${() => compareModels.value[0]!.name}</h3>
                      <dl>
                        <div class="compare-one__spec">
                          <dt>${() => t('compare.spec.powertrain')}</dt>
                          <dd>${() => formatSpec('powertrain', compareModels.value[0]!)}</dd>
                        </div>
                        <div class="compare-one__spec">
                          <dt>${() => t('compare.spec.zeroToHundredSec')}</dt>
                          <dd>${() => formatSpec('zeroToHundredSec', compareModels.value[0]!)}</dd>
                        </div>
                        <div class="compare-one__spec">
                          <dt>${() => t('compare.spec.seats')}</dt>
                          <dd>${() => formatSpec('seats', compareModels.value[0]!)}</dd>
                        </div>
                      </dl>
                      <div class="compare-one__model-actions">
                        <ore-button
                          size="sm"
                          variant="outline"
                          @click=${() => void router.navigate({ name: 'modelLanding', params: { slug: compareModels.value[0]!.slug } })}>
                          ${() => t('compare.viewModel')}
                        </ore-button>
                        <ore-button
                          size="sm"
                          variant="text"
                          @click=${() => removeFromCompare(compareModels.value[0]!.id)}>
                          ${() => t('compare.removeModel')}
                        </ore-button>
                      </div>
                    </div>
                  </article>
                  <button class="compare-one__add" type="button" @click=${chooseModels}>
                    <span><ore-icon name="plus" size="24" aria-hidden="true"></ore-icon></span>
                    <strong>${() => t('compare.addSecondTitle')}</strong>
                    <small>${() => t('compare.addSecondHint')}</small>
                    <b>${() => t('compare.addModel')}</b>
                  </button>
                </div>
              </section>
            `,
          )}

          <section
            class="compare-options"
            ?hidden=${() => compareModels.value.length < 2}
            aria-label=${() => t('compare.options')}>
            <p>${() => t('compare.baseModelNotice')}</p>
            <div>
              <label>
                <span>${() => t('compare.highlightDifferences')}</span>
                <ore-switch
                  aria-label=${() => t('compare.highlightDifferences')}
                  ?checked=${highlightDifferences}
                  @change=${(event: Event) => {
                    highlightDifferences.value = (event.currentTarget as HTMLElement & { checked: boolean }).checked;
                  }}></ore-switch>
              </label>
              <label>
                <span>${() => t('compare.hideIdentical')}</span>
                <ore-switch
                  aria-label=${() => t('compare.hideIdentical')}
                  ?checked=${hideIdentical}
                  @change=${(event: Event) => {
                    hideIdentical.value = (event.currentTarget as HTMLElement & { checked: boolean }).checked;
                  }}></ore-switch>
              </label>
            </div>
            <span class="compare-options__status" aria-live="polite">
              ${() => t('compare.rowsVisible', { count: visibleRowCount.value })}
            </span>
          </section>

          <div
            class="compare-matrix"
            ?hidden=${() => compareModels.value.length < 2}
            tabindex="0"
            role="region"
            aria-label=${() => t('compare.matrixLabel')}>
            <table>
              <caption>${() => t('compare.matrixCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">${() => t('compare.specification')}</th>
                  ${() =>
                    compareModels.value.map(
                      (model) => html`
                        <th scope="col">
                          <div class="compare-model-header">
                            <ore-skeleton striped aria-hidden="true"></ore-skeleton>
                            <span>${model.segment}</span>
                            <strong>${model.name}</strong>
                            <b>${formatPrice(model.basePrice)}</b>
                            <small>${() => t(`compare.availability.${model.availability.replace('-', '')}`)}</small>
                            <div>
                              <ore-button
                                size="sm"
                                variant="outline"
                                @click=${() => void router.navigate({ name: 'modelLanding', params: { slug: model.slug } })}>
                                ${() => t('common.viewDetails')}
                              </ore-button>
                              <ore-button
                                icon-only
                                size="sm"
                                variant="ghost"
                                label=${() => t('compare.removeNamed', { name: model.name })}
                                @click=${() => removeFromCompare(model.id)}>
                                <ore-icon name="x" size="14" aria-hidden="true"></ore-icon>
                              </ore-button>
                            </div>
                          </div>
                        </th>
                      `,
                    )}
                </tr>
              </thead>
              ${() =>
                visibleGroups.value.map(
                  (group) => html`
                    <tbody>
                      <tr class="compare-matrix__group">
                        <th
                          class="compare-matrix__group-title"
                          scope="rowgroup"
                          colspan=${compareModels.value.length + 1}>
                          ${() => t(`compare.group.${group.key}`)}
                        </th>
                      </tr>
                      ${group.rows.map((row) => {
                        const winners = winnerIds(row, compareModels.value);
                        return html`
                          <tr>
                            <th scope="row">${() => t(`compare.spec.${row.key}`)}</th>
                            ${compareModels.value.map(
                              (model) => html`
                                <td
                                  class=${() => (highlightDifferences.value && winners.has(model.id) ? 'is-best' : '')}>
                                  <span>${() => formatSpec(row.key, model)}</span>
                                  ${when(
                                    () => highlightDifferences.value && winners.has(model.id),
                                    () => html`
                                      <small class="compare-matrix__best">${() => t(`compare.best.${row.key}`)}</small>
                                    `,
                                  )}
                                </td>
                              `,
                            )}
                          </tr>
                        `;
                      })}
                    </tbody>
                  `,
                )}
            </table>
          </div>
        `,
      )}
    `;
  },
  shadow: false,
});

export function createCompareView(): HTMLElement {
  const element = document.createElement('compare-view');
  element.className = 'compare-view';
  return element;
}
