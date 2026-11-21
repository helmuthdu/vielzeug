import { bind, define, getHost, html, onCleanup, onMounted } from '@vielzeug/ore';
import componentStyles from './timeline.css?inline';
import './timeline-item';

export type { OreTimelineItemProps } from './timeline-item';
export { TIMELINE_ITEM_TAG } from './timeline-item';

/** Properties of a read-only timeline. Name it with `aria-label` or `aria-labelledby`. */
export type OreTimelineProps = Record<string, unknown>;

/**
 * A vertical list of events in the order supplied by the author.
 *
 * @element ore-timeline
 * @element ore-timeline-item - An event in the timeline
 * @slot - Direct `ore-timeline-item` children in the desired order
 * @cssprop --timeline-gap - Gap between events (default `--size-2`)
 * @example
 * ```html
 * <ore-timeline aria-label="Order history">
 *   <ore-timeline-item>Shipped<time slot="meta" datetime="2026-06-10">June 10</time></ore-timeline-item>
 * </ore-timeline>
 * ```
 */
export const TIMELINE_TAG = 'ore-timeline' as const;

define<OreTimelineProps>(TIMELINE_TAG, {
  props: {},
  setup() {
    const host = getHost();
    onMounted(() => {
      let end: Element | null = null;
      const clearEnd = () => {
        // A new timeline owns an item moved into it, regardless of observer callback order.
        if (end && (end.parentElement === host || end.parentElement?.localName !== TIMELINE_TAG)) {
          end.removeAttribute('data-ore-timeline-end');
        }
      };
      const updateEnd = () => {
        let item = host.lastElementChild;

        while (item && (item.localName !== 'ore-timeline-item' || item.hasAttribute('hidden'))) {
          item = item.previousElementSibling;
        }

        if (end !== item) clearEnd();
        for (const child of host.children) {
          if (child !== item && child.localName === 'ore-timeline-item') {
            child.removeAttribute('data-ore-timeline-end');
          }
        }
        item?.setAttribute('data-ore-timeline-end', '');
        end = item;
      };
      const observer = new MutationObserver((records) => {
        if (
          records.some((record) =>
            record.type === 'childList' ? record.target === host : record.target.parentNode === host,
          )
        ) {
          updateEnd();
        }
      });

      observer.observe(host, { attributeFilter: ['hidden'], childList: true, subtree: true });
      onCleanup(() => {
        observer.disconnect();
        clearEnd();
      });
      updateEnd();
    });

    bind({ attr: { role: () => 'list' } });

    return html`<slot></slot>`;
  },
  styles: [componentStyles],
});
