import { bind, define, html, inject, prop, useSlots } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';

import { reducedMotionMixin } from '../../styles';
import componentStyles from './rank-item.css?inline';
import { RANK_CTX } from './rank-list';

/** Rank-item component properties */
export type OreRankItemProps = {
  /**
   * Show the proportional bar (default). Disable with `bar="false"` for rows whose `value` is
   * not a comparable count (a median duration, a rating), where a scaled bar would imply a
   * ranking the data does not support.
   */
  bar?: boolean;
  /**
   * Rank position within the parent `ore-rank-list`, starting at 1. Assigned automatically in
   * DOM order on every rescan; a hand-written value is overwritten the moment the list syncs.
   */
  rank?: number;
  /**
   * The row's numeric value. Against the largest sibling `value` it sizes the proportional
   * bar, and without a `trailing` slot it is also the row's own formatted display. Omit it on
   * rows whose display is not a count (pass the formatted text in the `trailing` slot instead).
   */
  value?: number;
};

/**
 * A single ranked row inside `ore-rank-list`: a rank numeral, an optional `leading` slot
 * (avatar, icon), the label, a secondary `description` line, and a right-aligned `trailing`
 * value, with a proportional bar under the row sized against the largest sibling `value`.
 * The row is the whole visualization: the label and value stay text, so the ranking is
 * readable and accessible with the bar treated as reinforcement, never as the only carrier.
 *
 * @element ore-rank-item
 *
 * @attr {boolean} bar - Show the proportional bar (default). Disable with `bar="false"` for non-count rows.
 * @attr {number} rank - Rank position: assigned automatically by the parent list in DOM order; manual values are overwritten.
 * @attr {number} value - The row's numeric value: sizes the bar against the largest sibling, and is the formatted display when no `trailing` slot is present.
 *
 * @slot leading - Content before the label (e.g. avatar, icon)
 * @slot - Item label
 * @slot description - Secondary line below the label (e.g. sample count)
 * @slot trailing - Right-aligned value display; replaces the formatted `value`
 *
 * @cssprop --rank-number-color - Rank numeral color (default --color-contrast-500)
 * @cssprop --rank-number-width - Rank numeral column width (default --size-6)
 * @cssprop --rank-bar-color - Bar fill color (default --color-primary)
 * @cssprop --rank-track-color - Bar track color (default --color-contrast-100)
 * @cssprop --rank-bar-height - Bar height (default --size-1)
 *
 * @part row - The text row (rank, leading, label, trailing)
 * @part rank - The rank numeral (aria-hidden: the list order carries it)
 * @part leading - The leading slot container
 * @part content - The label + description container
 * @part label - The label slot container
 * @part description - The description slot container
 * @part trailing - The trailing value container
 * @part bar - The bar track
 * @part bar-fill - The bar fill
 * @example
 * ```html
 * <ore-rank-item value="8">
 *   <ore-avatar slot="leading" src="alex.png" alt="" rounded="full" size="sm"></ore-avatar>
 *   Alex
 * </ore-rank-item>
 * <ore-rank-item value="6" bar="false">
 *   Overview
 *   <span slot="description">4 timed sessions</span>
 *   <span slot="trailing">24m 11s</span>
 * </ore-rank-item>
 * ```
 */
export const RANK_ITEM_TAG = 'ore-rank-item' as const;
define<OreRankItemProps>(RANK_ITEM_TAG, {
  props: {
    bar: prop.bool(true),
    rank: prop.number(),
    value: prop.number(),
  },

  setup(props) {
    const slots = useSlots<'description' | 'leading' | 'trailing'>();
    const hasDescription = slots.has('description');
    const hasLeading = slots.has('leading');

    // Absent outside an `ore-rank-list`: the row degrades to a plain labeled line (no rank,
    // no bar), the same standalone shape `ore-list-item` keeps outside its list.
    const rankCtx = inject(RANK_CTX);

    const showBar = computed(() => props.bar.value && props.value.value != null && rankCtx != null);

    // The largest sibling value is the full track; anything above it is clamped so a stale
    // `value` written between rescans can never push the bar past the row. The share lands on
    // the fill's `--_fill` custom property, which its transform consumes: see rank-item.css.
    const barFill = computed(() => {
      const scale = rankCtx?.scale.value ?? 1;
      const value = props.value.value;

      if (value == null || scale <= 0) return 0;

      return Math.max(0, Math.min(1, value / scale));
    });

    const formatCount = new Intl.NumberFormat();
    const formattedValue = computed(() => {
      const value = props.value.value;

      return value == null ? '' : formatCount.format(value);
    });

    const hasTrailing = computed(() => slots.has('trailing').value || props.value.value != null);

    bind({
      attr: {
        role: () => 'listitem',
      },
    });

    return html`
      <div class="row" part="row">
        <span class="rank" part="rank" aria-hidden="true" ?hidden="${() => props.rank.value == null}"
          >${() => props.rank.value ?? ''}</span
        >
        <span class="leading" part="leading" ?hidden="${() => !hasLeading.value}"><slot name="leading"></slot></span>
        <span class="content" part="content">
          <span class="label" part="label"><slot></slot></span>
          <span class="description" part="description" ?hidden="${() => !hasDescription.value}"
            ><slot name="description"></slot
          ></span>
        </span>
        <span class="trailing" part="trailing" ?hidden="${() => !hasTrailing.value}"
          ><slot name="trailing">${formattedValue}</slot></span
        >
      </div>
      <div class="bar" part="bar" aria-hidden="true" ?hidden="${() => !showBar.value}">
        <span class="bar-fill" part="bar-fill" style="${() => `--_fill: ${barFill.value}`}"></span>
      </div>
    `;
  },

  styles: [reducedMotionMixin, componentStyles],
});
