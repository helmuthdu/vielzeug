import { bind, define, getHost, html, onCleanup, onMounted, prop, useSlots } from '@vielzeug/ore';
import { signal, watch } from '@vielzeug/ripple';

import { listen } from '../shared';
import dockStyles from './dock.css?inline';

/** Edges a dock can pin to. */
const DOCK_SIDES = ['top', 'bottom'] as const;

/**
 * The viewport width below which a dock trades its full-width bar for the phone tool row. The
 * bar's own stylesheet keys this same query; it is exported for a consumer that renders alongside
 * the bar and has to switch its own layout on the same line the bar does.
 */
export const DOCK_PHONE_QUERY = '(width < 640px)';

/** Dock component properties. */
export type OreDockProps = {
  /** Fuse the tool row into one segmented capsule, leaving the flanks alone */
  attached?: boolean;
  /** Shrink the phone row to its content and center it, for a bar whose hovering center is a HUD */
  compact?: boolean;
  /** Accessible name for the toolbar landmark */
  label?: string;
  /** Viewport edge the bar pins to */
  side?: 'top' | 'bottom';
  /** Pin the bar to its edge while its container scrolls */
  sticky?: boolean;
};

/**
 * The navbar's other twin: a bar of actions that pins to a viewport edge while its container
 * scrolls, and settles into the document flow once that container ends.
 *
 * Three named places and a tool row. `start` and `commit` are the flanks, `center` is the one
 * place allowed to carry a non-action (a clock, a stat block), and the default slot is the row
 * of tools between them. A place nothing is assigned to leaves no gap and no flex line: the bar
 * collapses to the places it actually carries.
 *
 * Wide, the bar is a full-width strip flush to its edge, wearing a hairline only while pinned.
 * From the desktop width (1280 px) up, a claimed `center` sits dead-center because both sides of
 * the row take an equal share. Below the phone width (640 px) the bar becomes a single tool row in
 * the iOS toolbar grammar: the flanks stretch equally so the tools rest on the row's true middle,
 * the bar detaches from the viewport's foot, and `center` lifts out of the row to hover above it.
 * Pass `compact` when that hovering center is the bar's whole subject: the phone row then hugs its
 * content instead of stretching edge to edge. Above the phone width every bar is a full-width strip.
 *
 * The bar's surface rides a pseudo-element, never the host: `backdrop-filter` on the host would
 * make it a containing block for `position: fixed` descendants, trapping any panel a slotted
 * control opens (a menu, a tooltip) inside the bar's own box.
 *
 * Sizing reaches slotted content through custom properties only (`--dock-tool-flex`,
 * `--dock-tool-radius`): a shadow-tree `::slotted()` declaration ranks below any document-tree
 * rule on the same property, so a consumer that sets `flex` or `width` on a dock child outranks
 * the bar's own layout. Where a bar must stretch its tools (`attached`), it does so by reading
 * `--dock-tool-flex`, so the consumer's lever is the property, not a fight with a declaration.
 * Every such rule is scoped through the zone that owns the slot, because `::slotted()` reaches the
 * children of every slot the bar renders. The flanks keep their own shape.
 *
 * The host reflects which places are filled as `data-start-claimed`, `data-center-claimed`,
 * `data-tools-claimed`, and `data-commit-claimed`, plus `data-pinned` while the bar is holding its
 * edge. Those exist because no selector can derive them: `:has()` cannot see slotted content and a
 * `<slot>` always matches `:empty`. The phone layout needs no reflection: it is a plain media
 * query in the bar's own stylesheet, the same way every other refine breakpoint is written.
 *
 * @element ore-dock
 *
 * @attr {string} side - Edge to pin to: 'top' | 'bottom' (default)
 * @attr {boolean} sticky - Pin to the edge while the container scrolls (default true)
 * @attr {boolean} attached - Fuse the tool row into one segmented capsule
 * @attr {boolean} compact - Shrink the phone row to its content and center it
 * @attr {string} label - Accessible name for the toolbar landmark
 *
 * @slot - The tool row, between the flanks
 * @slot start - Leading flank (a back action)
 * @slot center - The middle place: may carry a non-action such as a clock
 * @slot commit - Trailing flank (the commit action)
 *
 * @cssprop --dock-bg - Bar fill. Defaults to the translucent canvas token
 * @cssprop --dock-color - Bar ink
 * @cssprop --dock-border-color - Hairline shown while the bar is pinned, and the pill's border
 * @cssprop --dock-blur - Blur radius behind the bar. Set `0` to drop it
 * @cssprop --dock-radius - Bar corner radius, used by the pinned phone pill
 * @cssprop --dock-offset - Inset from the viewport's edges
 * @cssprop --dock-gap - Gap between the bar's places, above the phone width
 * @cssprop --dock-tool-gap - Gap between the tools in the row
 * @cssprop --dock-padding - Bar padding, before the safe-area inset
 * @cssprop --dock-z-index - Stacking order of the bar
 * @cssprop --dock-tool-flex - `flex` for each tool in `attached` mode. Defaults to `1 1 0`
 * @cssprop --dock-tool-radius - Corner radius of a fused capsule's ends
 *
 * @part bar - The bar itself.
 * @part start - Leading flank.
 * @part center - Middle place.
 * @part tools - Tool row.
 * @part commit - Trailing flank.
 *
 * @example
 * ```html
 * <ore-dock>
 *   <ore-button slot="start" icon-only label="Back">
 *     <ore-icon name="arrow-left"></ore-icon>
 *   </ore-button>
 *   <ore-button>Share</ore-button>
 *   <ore-button slot="commit" color="primary">Done</ore-button>
 * </ore-dock>
 *
 * <!-- A list page's verbs, fused into one capsule -->
 * <ore-dock attached>
 *   <ore-button>Import</ore-button>
 *   <ore-button color="primary">New</ore-button>
 * </ore-dock>
 * ```
 */
export const DOCK_TAG = 'ore-dock' as const;
define<OreDockProps>(DOCK_TAG, {
  props: {
    attached: prop.bool(false),
    compact: prop.bool(false),
    label: prop.string('Page actions'),
    side: prop.oneOf(DOCK_SIDES, 'bottom'),
    sticky: prop.bool(true),
  },
  setup(props) {
    const el = getHost();
    const slots = useSlots<'center' | 'commit' | 'start'>();

    const hasStart = slots.has('start');
    const hasCenter = slots.has('center');
    const hasCommit = slots.has('commit');
    const hasTools = slots.has();
    const isPinned = signal(false);

    // Slot claim is computed in JS, not CSS: `:has()` cannot see slotted content and a `<slot>`
    // always matches `:empty`, so "is this place taken?" has no selector-side answer. The zones
    // read the result through `?hidden=`, and the host reflects it for variant styling.
    bind({
      attr: {
        'data-center-claimed': () => (hasCenter.value ? true : undefined),
        'data-commit-claimed': () => (hasCommit.value ? true : undefined),
        'data-pinned': () => (isPinned.value ? true : undefined),
        'data-start-claimed': () => (hasStart.value ? true : undefined),
        'data-tools-claimed': () => (hasTools.value ? true : undefined),
      },
    });

    // The first read waits for `onMounted`: before the first layout every rect is zero, which
    // would report a freshly mounted bar as pinned. jsdom never fires the callback, which leaves
    // the bar unpinned: its CSS fallback, and all jsdom can assert. Real pinning is e2e's job.
    const syncPinned = (): void => {
      if (!props.sticky.value) {
        isPinned.value = false;

        return;
      }

      // The container's rect, never the host's: a sticky element's own box is clamped to its
      // edge, so it can never report how much of the container is left to scroll.
      const bounds = (el.parentElement ?? el).getBoundingClientRect();

      // Pinned while the container still reaches past the bar's edge. Once it has scrolled fully
      // clear, the bar has settled into the flow at its own edge.
      isPinned.value = props.side.value === 'bottom' ? bounds.bottom > window.innerHeight : bounds.top < 0;
    };

    // Scroll and resize both feed the same read, and both are needed: a scroll listener alone
    // misses a container that changes size without scrolling (a reflow above the bar, a window
    // resize), and a resize listener alone misses the scroll that actually moves the bar. The
    // scroll listener captures, which is what lets a single listener cover a bar inside a
    // scrolling panel too: a scroll event never bubbles, but it does capture through `window`.
    // The container's own size is the third signal, and only a `ResizeObserver` reports it.
    let detachGeometry: (() => void) | undefined;

    onMounted(() => {
      const cleanups: Array<() => void> = [
        listen(window, 'scroll', syncPinned, { capture: true, passive: true }),
        listen(window, 'resize', syncPinned, { passive: true }),
      ];

      const container = el.parentElement;

      if (container && typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(syncPinned);

        observer.observe(container);
        cleanups.push(() => observer.disconnect());
      }

      detachGeometry = () => {
        for (const cleanup of cleanups.reverse()) cleanup();
      };

      syncPinned();
    });

    watch(() => [props.side.value, props.sticky.value], syncPinned);

    onCleanup(() => detachGeometry?.());

    return html`
      <div
        class="dock"
        part="bar"
        role="toolbar"
        aria-label="${props.label}"
        aria-orientation="horizontal">
        <div class="dock-start" part="start" ?hidden=${() => !hasStart.value}>
          <slot name="start"></slot>
        </div>
        <div class="dock-center" part="center" ?hidden=${() => !hasCenter.value}>
          <slot name="center"></slot>
        </div>
        <div class="dock-trailing">
          <div class="dock-tools" part="tools" ?hidden=${() => !hasTools.value}>
            <slot></slot>
          </div>
          <div class="dock-commit" part="commit" ?hidden=${() => !hasCommit.value}>
            <slot name="commit"></slot>
          </div>
        </div>
      </div>
    `;
  },
  styles: [dockStyles],
});
