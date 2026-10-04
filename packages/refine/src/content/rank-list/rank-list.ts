import { bind, createContext, define, getHost, html, onCleanup, onMounted, provide } from '@vielzeug/ore';
import { type Readable, signal } from '@vielzeug/ripple';
import componentStyles from './rank-list.css?inline';

/** Context provided by `ore-rank-list` to its `ore-rank-item` children. */
export type RankContext = {
  /**
   * The largest `value` among the item children: the denominator every item divides its own
   * `value` by to size its bar. Always at least `1`, so a list of all-zero values renders
   * empty tracks rather than dividing by zero.
   */
  scale: Readable<number>;
};
/** Injection key for the rank context. */
export const RANK_CTX = createContext<RankContext>('RankContext');

/** Rank-list component properties: the list takes none; its children carry `value` and `bar`.
 * `unknown` (not `never`) keeps the derived Vue/framework attribute types permissive. */
export type OreRankListProps = Record<string, unknown>;

/**
 * A ranked display list: an ordered set of `ore-rank-item` rows where each row's proportional
 * bar makes the ranking scannable without a separate chart. The list itself owns the two
 * facts an item cannot know on its own: the position of each row (assigned back to the item
 * as its `rank` prop, in DOM order) and the scale every bar is measured against (the largest
 * child `value`, shared through context).
 *
 * This is a read-only data display, not a selection control: rows never receive interactive
 * state. Order the items yourself before rendering: the list numbers them, it does not sort
 * them.
 *
 * @element ore-rank-list
 * @element ore-rank-item - Child element for each ranked row
 *
 * @cssprop --rank-list-gap - Vertical gap between rows (default --size-1)
 *
 * @slot - `ore-rank-item` elements as direct children
 *
 * @example
 * ```html
 * <ore-rank-list aria-label="Most visited pages">
 *   <ore-rank-item value="8">Documentation</ore-rank-item>
 *   <ore-rank-item value="6">Pricing</ore-rank-item>
 *   <ore-rank-item value="2" bar="false">Blog<span slot="trailing">18m 24s</span></ore-rank-item>
 * </ore-rank-list>
 * ```
 */
export const RANK_LIST_TAG = 'ore-rank-list' as const;
define<OreRankListProps>(RANK_LIST_TAG, {
  props: {},

  setup() {
    const el = getHost();

    // The shared bar scale: recomputed from the light DOM whenever an item is added, removed,
    // or has its `value` attribute changed (property sets reflect to the attribute, so both
    // authoring styles converge here). Ranks are written back through each item's reflected
    // `rank` attribute rather than a property: an attribute survives a not-yet-upgraded child
    // (parser-created items can connect in any definition order) and re-parses whenever the
    // item upgrades. Rank writes never re-enter the observer: `rank` is not in its filter.
    const scale = signal(1);

    const rescan = (): void => {
      const items = [...el.querySelectorAll<HTMLElement>(':scope > ore-rank-item')];
      let max = 0;

      for (const item of items) {
        const value = Number(item.getAttribute('value'));

        if (Number.isFinite(value) && value > max) max = value;
      }

      scale.value = max > 0 ? max : 1;

      for (let index = 0; index < items.length; index++) {
        items[index].setAttribute('rank', String(index + 1));
      }
    };

    onMounted(() => {
      const observer = new MutationObserver(rescan);

      observer.observe(el, { attributeFilter: ['value'], attributes: true, childList: true, subtree: true });
      onCleanup(() => observer.disconnect());
      rescan();
    });

    provide(RANK_CTX, { scale });

    // Plain `role="list"` semantics: like `ore-list` (which this mirrors), there is no dedicated
    // `label` prop; consumers name the ranking through `aria-label` directly.
    bind({
      attr: {
        role: () => 'list',
      },
    });

    return html`
      <slot></slot>
    `;
  },

  styles: [componentStyles],
});
