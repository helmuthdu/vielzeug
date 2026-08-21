import {
  bind,
  define,
  getHost,
  html,
  inject,
  onCleanup,
  onMounted,
  prop,
  useEmit,
  useSlots,
  watchEffect,
} from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';

import { disablableBundle } from '../../shared';
import { reducedMotionMixin } from '../../styles';
import { createRevealState } from './_list-item-reveal';
import { LIST_CTX } from './list';
import componentStyles from './list-item.css?inline';

/** Which side's action panel is currently revealed on a list item. */
export type ListItemRevealSide = 'left' | 'right';

/** Events emitted by the list-item component */
export type OreListItemEvents = {
  /** Emitted when the revealed action panel closes (gesture, tap, or programmatic). */
  conceal: { item: HTMLElement };
  /**
   * Emitted when a swipe crosses the full-swipe-through distance — the "swiped all the way"
   * confirm gesture. Fired just before the slotted action's own click (if any).
   */
  confirm: { item: HTMLElement; side: ListItemRevealSide };
  /** Emitted when the item becomes deselected. */
  deselect: { item: HTMLElement; value: null | string };
  /** Emitted when a swipe/focus reveals an action panel. */
  reveal: { item: HTMLElement; side: ListItemRevealSide };
  /** Emitted when the item becomes selected (only meaningful inside a `selectable` `ore-list`). */
  select: { item: HTMLElement; value: null | string };
};

/** List-item component properties */
export type OreListItemProps = {
  /** Disable this item — blocks pointer interaction, swipe actions, and selection */
  disabled?: boolean;
  /** Which action panel is revealed: 'left' | 'right' (absent = closed). Settable programmatically. */
  revealed?: ListItemRevealSide;
  /**
   * Opaque value compared against the parent `selectable` `ore-list`'s own `value` to derive
   * `selected` — required for selection to work. There's no separate `selected` prop: the parent
   * list's `value` is the single source of truth, so this item's selected state can't drift from
   * it. Also reported in `select`/`deselect`/the parent's `change` event.
   */
  value?: string;
};

/** Maps a reveal side to its slot name — the one place this pairing is spelled out. */
const actionSlot = (side: ListItemRevealSide): 'actions-left' | 'actions-right' =>
  side === 'left' ? 'actions-left' : 'actions-right';

/**
 * A single row inside `ore-list`. Renders `leading`/default (title)/`description`/`trailing`
 * content plus two off-canvas action panels (`actions-left`, `actions-right`) that a horizontal
 * pointer/touch swipe reveals — useful for mobile-style row actions (archive, delete, …). An
 * action panel only opens if it actually has slotted content; swiping the other direction is a
 * no-op. Revealed actions stay reachable from the keyboard (Tab focus on a slotted action button
 * reveals its panel via `:focus-within`, independent of any gesture).
 *
 * Swiping past the reveal distance snaps the panel fully open on release; swiping further still —
 * past the full-swipe-through distance — auto-confirms that side's action immediately (fires
 * `confirm` and clicks the slot's first element), the same "swipe all the way" shortcut as iOS
 * Mail's delete gesture.
 *
 * Closing a revealed panel is deliberately one-directional: tap/click the row itself, tap outside
 * the item, or open a different item's panel. Reverse-swiping an already-open item is not
 * supported — see `ore-list`'s docs for the reasoning.
 *
 * @element ore-list-item
 *
 * @attr {boolean} disabled - Disable this item
 * @attr {boolean} selected - Read-only reflected attribute: `true` when this item's `value` matches the parent `ore-list`'s `value`. Not independently settable.
 * @attr {string}  value    - Opaque value compared against the parent list's `value` to derive `selected`; also reported in select/change events
 * @attr {string}  revealed - Which action panel is revealed: 'left' | 'right'
 *
 * @fires select   - Item becomes selected. detail: { item: HTMLElement, value: string | null }
 * @fires deselect - Item becomes deselected. detail: { item: HTMLElement, value: string | null }
 * @fires reveal   - An action panel opens. detail: { item: HTMLElement, side: 'left' | 'right' }
 * @fires conceal  - The revealed action panel closes. detail: { item: HTMLElement }
 * @fires confirm  - Swiped all the way through — fires before the slotted action's own click. detail: { item: HTMLElement, side: 'left' | 'right' }
 *
 * @slot leading - Content before the title (e.g. icon, avatar)
 * @slot - Item title
 * @slot description - Secondary line below the title
 * @slot trailing - Content after the title (e.g. meta text, chevron)
 * @slot actions-left - Buttons revealed by swiping right (or focusing into this slot)
 * @slot actions-right - Buttons revealed by swiping left (or focusing into this slot)
 *
 * @cssprop --list-item-actions-width - Width of each action panel (default 6rem)
 * @cssprop --list-item-bg - Row background color
 * @cssprop --list-item-hover-bg - Row background on hover
 * @cssprop --list-item-selected-bg - Row background when selected
 * @part row - The row wrapper (focusable, swipeable)
 * @part leading - The leading slot container
 * @part content - The title + description container
 * @part title - The title slot container
 * @part description - The description slot container
 * @part trailing - The trailing slot container
 * @part actions-start - The left action panel container
 * @part actions-end - The right action panel container
 * @example
 * ```html
 * <ore-list-item>
 *   <ore-icon slot="leading" name="mail"></ore-icon>
 *   Inbox
 *   <span slot="trailing">12</span>
 * </ore-list-item>
 * <ore-list-item>
 *   Newsletter
 *   <span slot="description">From Acme Inc.</span>
 *   <ore-button slot="actions-right" color="error">Delete</ore-button>
 * </ore-list-item>
 * ```
 */
export const LIST_ITEM_TAG = 'ore-list-item' as const;
define<OreListItemProps>(LIST_ITEM_TAG, {
  props: {
    ...disablableBundle,
    revealed: prop.oneOf<ListItemRevealSide | undefined>(['left', 'right'], undefined),
    value: prop.string(),
  },

  setup(props) {
    const el = getHost();
    const emit = useEmit<OreListItemEvents>();
    const slots = useSlots<'actions-left' | 'actions-right' | 'description' | 'leading' | 'trailing'>();

    const listCtx = inject(LIST_CTX);
    const isSelectable = computed(() => Boolean(listCtx?.selectable.value));
    // Derived, not owned: `ore-list`'s `value` is the single source of truth, so this can never
    // drift out of sync with a sibling the way an independently-settable `selected` prop could.
    const isSelected = computed(
      () => props.value.value != null && listCtx != null && listCtx.value.value === props.value.value,
    );

    const hasActions = (side: ListItemRevealSide): boolean => slots.has(actionSlot(side)).value;

    const swipe = createRevealState(el, {
      disabled: computed(() => props.disabled.value || Boolean(props.revealed.value)),
      hasActions,
      // Clicks the slot's own first element (the common case: a single action button) so its own
      // click handler runs the real action — `confirm` covers slots without a clickable element.
      onConfirm: (side) => {
        const target = slots.elements(actionSlot(side)).value[0] as HTMLElement | undefined;

        emit('confirm', { item: el, side });
        target?.click();
      },
    });

    onMounted(() => {
      const row = el.shadowRoot?.querySelector<HTMLElement>('.row');

      if (!row) return;

      const unmountSwipe = swipe.mount(row);
      onCleanup(unmountSwipe);
    });

    onCleanup(() => swipe.dispose());

    // Reflects the derived `selected` state as a plain boolean attribute — the styling/
    // `[selected]`-selector hook — the same way `prop.bool()`'s own reflection would, since it
    // isn't a real settable prop anymore.
    watchEffect(() => {
      el.toggleAttribute('selected', isSelected.value);
    });

    // Emits select/deselect/reveal/conceal for both gesture-driven AND externally-set (attribute,
    // or the parent list's `value`) state changes — the plain-reflected-prop equivalent of
    // ore-accordion-item's native <details> `toggle`-event listener (there's no backing native
    // element here to piggyback on).
    let lastSelected = isSelected.value;

    watchEffect(() => {
      const current = isSelected.value;

      if (current === lastSelected) return;

      lastSelected = current;
      emit(current ? 'select' : 'deselect', { item: el, value: props.value.value ?? null });
    });

    let lastRevealed = props.revealed.value ?? null;

    watchEffect(() => {
      const current = props.revealed.value ?? null;

      if (current === lastRevealed) return;

      lastRevealed = current;

      if (current) {
        // Only one item may have its swipe actions revealed at a time — tell the list directly
        // instead of dispatching an event for it to listen for.
        listCtx?.requestReveal(el);
        emit('reveal', { item: el, side: current });
      } else {
        emit('conceal', { item: el });
      }
    });

    const handleActivate = (event: Event): void => {
      if (props.disabled.value) return;

      if (props.revealed.value) {
        event.preventDefault();
        event.stopPropagation();
        el.removeAttribute('revealed');

        return;
      }

      if (!isSelectable.value) return;

      const value = props.value.value;

      // Re-clicking an already-selected item deselects it; a value is required to select at all
      // (undefined would otherwise match every valueless item at once).
      if (value != null) listCtx?.select(isSelected.value ? undefined : value);
    };

    const handleRowKeydown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      if (props.disabled.value || (!props.revealed.value && !isSelectable.value)) return;

      event.preventDefault();
      handleActivate(event);
    };

    bind({
      attr: {
        'aria-disabled': () => (props.disabled.value ? 'true' : null),
        'aria-selected': () => (isSelectable.value ? String(isSelected.value) : null),
        role: () => (isSelectable.value ? 'option' : 'listitem'),
      },
    });

    return html`
      <div
        class="row"
        part="row"
        tabindex="${() => (props.disabled.value ? '-1' : '0')}"
        @click="${handleActivate}"
        @keydown="${handleRowKeydown}">
        <span class="leading" part="leading"><slot name="leading"></slot></span>
        <span class="content" part="content">
          <span class="title" part="title"><slot></slot></span>
          <span class="description" part="description"><slot name="description"></slot></span>
        </span>
        <span class="trailing" part="trailing"><slot name="trailing"></slot></span>
      </div>
      <span class="actions actions-left" part="actions-start"><slot name="actions-left"></slot></span>
      <span class="actions actions-right" part="actions-end"><slot name="actions-right"></slot></span>
    `;
  },

  shadow: { delegatesFocus: true },
  styles: [reducedMotionMixin, componentStyles],
});
