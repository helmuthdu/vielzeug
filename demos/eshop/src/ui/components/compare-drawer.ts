import '@vielzeug/refine/drawer';
import '@vielzeug/refine/async';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/avatar';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/grid-item';
import { createSortable, createSortableScope } from '@vielzeug/dnd';
import { define, each, html, onCleanup, onMounted, ref, when } from '@vielzeug/ore';
import { computed, effect, signal } from '@vielzeug/ripple';

import type { Model } from '../../core/types';

import { compareModels } from '../../core/cart-store';
import { formatPrice } from '../../core/currency';
import { reorderCompare, removeFromCompare } from '../../core/history';
import { t } from '../../core/i18n';
import { router } from '../../core/router';

/** `better` only appears on rows with an unambiguous "lower/higher is better" direction —
 * `segment` and `rangeOrEconomy` (the latter mixes range-in-km with fuel-economy-in-L/100km
 * across powertrains, so no single direction is fair) are left unranked, matching the design
 * brief's "highlight best values" as a judgment call rather than a rule applied to every row. */
const SPEC_ROWS: { better?: 'max' | 'min'; key: string; label: string }[] = [
  { key: 'segment', label: 'Segment' },
  { better: 'min', key: 'basePrice', label: 'Starting price' },
  { better: 'min', key: 'zeroToHundredSec', label: '0–100 km/h' },
  { better: 'max', key: 'topSpeedKph', label: 'Top speed' },
  { key: 'seats', label: 'Seats' },
  { key: 'rangeOrEconomy', label: 'Range / fuel economy' },
];

function formatSpec(key: string, model: Model): string {
  switch (key) {
    case 'basePrice':
      return formatPrice(model.basePrice);
    case 'rangeOrEconomy':
      return model.rangeKm !== null ? `${model.rangeKm} km range` : `${model.fuelEconomyLPer100Km} L/100km`;
    case 'seats':
      return String(model.seats);
    case 'segment':
      return model.segment;
    case 'topSpeedKph':
      return `${model.topSpeedKph} km/h`;
    case 'zeroToHundredSec':
      return `${model.zeroToHundredSec}s`;
    default:
      return '';
  }
}

/** Raw numeric value backing a ranked row's comparison — `formatSpec()`'s output is for display
 * only (units, locale-formatted currency), not something you can safely rank by string. */
function rawSpecValue(key: string, model: Model): number | null {
  switch (key) {
    case 'basePrice':
      return Number.parseFloat(model.basePrice);
    case 'topSpeedKph':
      return model.topSpeedKph;
    case 'zeroToHundredSec':
      return model.zeroToHundredSec;
    default:
      return null;
  }
}

const isOpen = signal(false);

/** Opens the global compare drawer — called from the navbar's Compare item and command palette. */
export function openCompareDrawer(): void {
  isOpen.value = true;
}

/**
 * The comparison feature lives entirely in this one bottom `ore-drawer` — no dedicated
 * `/compare` route and no persistent tray taking up space on the catalog page. The drawer holds
 * two tiers: a compact, drag-reorderable chip row for managing the selection (`@vielzeug/dnd`'s
 * `createSortable`, single-container like the tray this replaces), and underneath it the full
 * spec comparison laid out with `ore-grid`'s `responsive` auto-fit mode — cards size themselves
 * to the drawer's width rather than a fixed column count, so they naturally stack to one column
 * on narrow/mobile viewports instead of forcing a horizontally-scrolling table.
 *
 * The chip container is *always* rendered (never swapped out of the DOM by a `when()`, matching
 * the tray's own note on this) since `createSortable()` binds to it once in `onMounted()`.
 */
define('compare-drawer', {
  setup() {
    const itemsRef = ref<HTMLElement>();
    let sortable: ReturnType<typeof createSortable> | null = null;

    const highlightBest = signal(false);
    const hideIdentical = signal(false);

    /** Winning model id per ranked row — only computed for rows with a `better` direction and
     * only once at least two compared models actually carry a value for that row. */
    const bestModelIdByRow = computed(() => {
      const winners = new Map<string, string>();

      for (const row of SPEC_ROWS) {
        if (!row.better) continue;

        const values = compareModels.value
          .map((m) => ({ id: m.id, value: rawSpecValue(row.key, m) }))
          .filter((v): v is { id: string; value: number } => v.value !== null);

        if (values.length < 2) continue;

        const best = values.reduce((a, b) =>
          row.better === 'min' ? (b.value < a.value ? b : a) : b.value > a.value ? b : a,
        );

        winners.set(row.key, best.id);
      }

      return winners;
    });

    const visibleRows = computed(() =>
      hideIdentical.value
        ? SPEC_ROWS.filter((row) => new Set(compareModels.value.map((m) => formatSpec(row.key, m))).size > 1)
        : SPEC_ROWS,
    );

    onMounted(() => {
      const container = itemsRef.value!;
      const scope = createSortableScope({ touch: true });

      sortable = createSortable({
        element: container,
        getKey: (el) => el.dataset['modelId'] ?? '',
        onReorder: ({ ids }) => reorderCompare(ids),
        scope,
      });

      const stop = effect(() => {
        void compareModels.value;
        sortable?.sync();
      });

      onCleanup(() => {
        stop.dispose();
        sortable?.dispose();
        sortable = null;
        scope.dispose();
      });
    });

    function onClose(): void {
      isOpen.value = false;
    }

    function viewModel(slug: string): void {
      isOpen.value = false;
      void router.navigate({ name: 'modelDetail', params: { slug } });
    }

    return html`
      <ore-drawer
        placement="bottom"
        size="lg"
        title=${() => t('compare.title')}
        ?open=${() => isOpen.value}
        @close=${onClose}>
        ${when(
          () => compareModels.value.length === 0,
          () => html`
            <ore-async status="empty" empty-label=${() => t('compare.empty')}></ore-async>
          `,
        )}
        <div class="compare-drawer__chips" ref=${itemsRef}>
          ${each(
            compareModels,
            (m) => m.id,
            (m) => html`
              <div class="compare-drawer__chip" data-model-id=${() => m.value.id}>
                <ore-avatar size="sm" initials=${() => m.value.name.slice(0, 2)}></ore-avatar>
                <span class="compare-drawer__chip-name">${() => m.value.name}</span>
                <ore-button
                  rounded
                  size="sm"
                  variant="ghost"
                  icon-only
                  label="${() => t('common.removeFromCompare')}"
                  @click=${() => removeFromCompare(m.value.id)}>
                  <ore-icon name="x" size="14" aria-hidden="true"></ore-icon>
                </ore-button>
              </div>
            `,
          )}
        </div>
        ${when(
          () => compareModels.value.length > 0,
          () => html`
            <div class="compare-drawer__toolbar">
              <ore-button
                rounded
                size="sm"
                variant=${() => (highlightBest.value ? 'flat' : 'ghost')}
                color=${() => (highlightBest.value ? 'primary' : undefined)}
                aria-pressed=${() => String(highlightBest.value)}
                @click=${() => (highlightBest.value = !highlightBest.value)}>
                ${() => t('compare.highlightBest')}
              </ore-button>
              <ore-button
                rounded
                size="sm"
                variant=${() => (hideIdentical.value ? 'flat' : 'ghost')}
                color=${() => (hideIdentical.value ? 'primary' : undefined)}
                aria-pressed=${() => String(hideIdentical.value)}
                @click=${() => (hideIdentical.value = !hideIdentical.value)}>
                ${() => t('compare.hideIdentical')}
              </ore-button>
            </div>
            <ore-grid responsive min-col-width="220px" gap="md" fullwidth>
              ${each(
                compareModels,
                (m) => m.id,
                (m) => html`
                  <ore-grid-item class="compare-drawer__card">
                    <h3 class="compare-drawer__card-name">${() => m.value.name}</h3>
                    <dl class="compare-drawer__specs">
                      ${each(
                        visibleRows,
                        (row) => row.key,
                        (row) => html`
                          <div
                            class=${() =>
                              highlightBest.value && bestModelIdByRow.value.get(row.value.key) === m.value.id
                                ? 'compare-drawer__spec-row compare-drawer__spec-row--best'
                                : 'compare-drawer__spec-row'}>
                            <dt>${() => row.value.label}</dt>
                            <dd>${() => formatSpec(row.value.key, m.value)}</dd>
                          </div>
                        `,
                      )}
                    </dl>
                    <ore-button rounded size="sm" variant="bordered" @click=${() => viewModel(m.value.slug)}>
                      ${() => t('common.viewDetails')}
                    </ore-button>
                  </ore-grid-item>
                `,
              )}
            </ore-grid>
          `,
        )}
      </ore-drawer>
    `;
  },
  shadow: false,
});
