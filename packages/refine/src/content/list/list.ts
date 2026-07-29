import { createContext, define, html, prop, bind, getHost, onCleanup, provide, useEmit } from '@vielzeug/ore';
import { computed, signal, watch, type Readable } from '@vielzeug/ripple';

import type { ComponentSize } from '../../types';

import { createListControl, lifecycleSignal } from '../../headless';
import { disablableBundle, LIST_SIZE_PRESET, sizableBundle } from '../../shared';
import { sizeVariantMixin } from '../../styles';
import componentStyles from './list.css?inline';

/** Visual variant for `ore-list`. */
export type ListVariant = 'bordered' | 'plain' | 'separated';

/** Context provided by `ore-list` to its `ore-list-item` children. */
export type ListContext = {
  /**
   * Closes every other item's swipe-revealed action panel. Called directly by an item the moment
   * its own `revealed` attribute transitions to non-null (gesture or direct attribute set) —
   * replaces listening for a bubbled `reveal` event and re-deriving "is this actually my direct
   * child" with a plain function call, the same shape as `select` below.
   */
  requestReveal: (item: HTMLElement) => void;
  /**
   * Selects `value` (or clears the selection when `undefined`) and fires `change`. Called
   * directly by an activated item — mirrors `ore-radio-group`'s `RadioGroupContext.select()`.
   * No sibling bookkeeping needed here: every item's `selected` is *derived* from `value`, so
   * changing it here is the only thing that has to happen.
   */
  select: (value: string | undefined) => void;
  selectable: Readable<boolean>;
  /**
   * Single source of truth for the current selection — `ore-list-item` never owns its own
   * "selected" state; it's always derived by comparing its own `value` against this one (the
   * same shape as `ore-radio-group`'s `RadioGroupContext.value`).
   */
  value: Readable<string | undefined>;
};
/** Injection key for the list context. */
export const LIST_CTX = createContext<ListContext>('ListContext');

/** Events emitted by the list component */
export type OreListEvents = {
  /** Emitted when the selected value changes (only when `selectable` is set). */
  change: { value: null | string };
};

/** List component properties */
export type OreListProps = {
  /** Disable the entire list — blocks pointer interaction and removes items from tab order */
  disabled?: boolean;
  /**
   * Enables single-selection listbox behavior: clicking (or pressing Enter/Space on) an item
   * selects it and deselects any previously-selected sibling. Arrow keys / Home / End move
   * focus between items. Omit for a plain, non-interactive display list.
   */
  selectable?: boolean;
  /** Size applied to all items (propagated via inherited CSS custom properties) */
  size?: ComponentSize;
  /**
   * Selected item's `value` (only meaningful when `selectable`) — the single source of truth for
   * selection. `ore-list-item` never owns its own selected state; set this directly, bind it for
   * two-way control, or read it back from `change`.
   */
  value?: string;
  /** Visual variant: 'plain' (default, no dividers) | 'bordered' (outer border + row dividers) | 'separated' (each item is its own card) */
  variant?: ListVariant;
};

/**
 * A vertical list container for `ore-list-item` children — plain display list by default, or a
 * keyboard-navigable single-select listbox via `selectable`. Each item can independently reveal
 * a left/right action panel via touch/pointer swipe (see `ore-list-item`'s `actions-left`/
 * `actions-right` slots) — useful for mobile-style row actions (archive, delete, …).
 *
 * @element ore-list
 * @element ore-list-item - Child element for each row
 *
 * @attr {boolean} disabled - Disable the entire list
 * @attr {boolean} selectable - Enable single-selection listbox behavior with arrow-key navigation
 * @attr {string} size - Size applied to all items: 'sm' | 'md' | 'lg'
 * @attr {string} value - Selected item's value (only meaningful when `selectable`) — the single source of truth for selection
 * @attr {string} variant - Visual variant: 'plain' | 'bordered' | 'separated'
 *
 * @fires change - Emitted when the selected value changes. detail: { value: string | null }
 *
 * @slot - `ore-list-item` elements
 *
 * @cssprop --list-radius - Border radius for the 'bordered'/'separated' variants
 *
 * @example
 * ```html
 * <ore-list variant="bordered">
 *   <ore-list-item>Inbox</ore-list-item>
 *   <ore-list-item>Drafts</ore-list-item>
 * </ore-list>
 * <ore-list selectable value="inbox">
 *   <ore-list-item value="inbox">Inbox</ore-list-item>
 *   <ore-list-item value="drafts">Drafts</ore-list-item>
 * </ore-list>
 * ```
 */
export const LIST_TAG = 'ore-list' as const;
define<OreListProps>(LIST_TAG, {
  props: {
    ...disablableBundle,
    ...sizableBundle,
    selectable: prop.bool(false),
    value: prop.string(),
    variant: prop.string<ListVariant>(),
  },

  setup(props) {
    const el = getHost();
    const emit = useEmit<OreListEvents>();

    const getItems = (): HTMLElement[] => [
      ...el.querySelectorAll<HTMLElement>(':scope > ore-list-item:not([disabled])'),
    ];

    const getAllItems = (): HTMLElement[] => [...el.querySelectorAll<HTMLElement>(':scope > ore-list-item')];

    // Reaches into each item's shadow root for its focusable row — mirrors `ore-accordion`'s
    // `getSummaryElements()` — rather than relying on `item.focus()` + `shadow: { delegatesFocus:
    // true }` to land focus correctly, since that cross-boundary reporting is inconsistent enough
    // between real browsers and jsdom that other multi-item components in this package
    // (`ore-menu`, `ore-tabs`) defensively check both forms too. Queried via `[part="row"]`, not
    // the `.row` class — `part` is list-item's declared public seam for exactly this kind of
    // cross-component reach; the class name is a private styling detail that could change.
    const getRow = (item: Element): HTMLElement | null =>
      item.shadowRoot?.querySelector<HTMLElement>('[part="row"]') ?? null;

    const getRows = (): HTMLElement[] =>
      getItems()
        .map(getRow)
        .filter((row): row is HTMLElement => row != null);

    const listControl = createListControl<HTMLElement>({
      getItems,
      loop: true,
      onNavigate: (_action, index) => {
        getRow(getItems()[index])?.focus();
      },
      signal: lifecycleSignal(onCleanup),
    });

    // Selection — `selectedValue` is the single source of truth (mirrors `ore-radio-group`'s
    // `selectedValue`/`RadioGroupContext.value` pattern): reflected onto the `value` attribute,
    // synced back in when set externally, and read by every item via context to derive its own
    // `selected` state. No sibling-clearing needed anywhere — changing this one signal is enough.
    const selectedValue = signal<string | undefined>(props.value.value);

    watch(props.value, (value) => {
      selectedValue.value = value;
    });

    const select = (value: string | undefined): void => {
      if (selectedValue.value === value) return;

      selectedValue.value = value;
      emit('change', { value: value ?? null });
    };

    // Only one item's swipe-revealed action panel is open at a time. The item calls this
    // directly the moment its own `revealed` attribute transitions to non-null — see
    // `ListContext.requestReveal`'s doc comment for why this replaced a bubbled event.
    const requestReveal = (item: HTMLElement): void => {
      for (const sibling of getAllItems()) {
        if (sibling !== item) sibling.removeAttribute('revealed');
      }
    };

    // Closes any swipe-revealed item when the user interacts anywhere outside of it — matches
    // the outside-pointerdown-closes pattern used by ore-date-picker/ore-time-picker's popovers.
    const handleOutsidePointerDown = (event: PointerEvent): void => {
      const open = getAllItems().find((item) => item.hasAttribute('revealed'));

      if (!open || event.composedPath().includes(open)) return;

      open.removeAttribute('revealed');
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown, { capture: true });
    onCleanup(() => document.removeEventListener('pointerdown', handleOutsidePointerDown, { capture: true }));

    provide(LIST_CTX, {
      requestReveal,
      select,
      selectable: computed(() => Boolean(props.selectable.value)),
      value: selectedValue,
    });

    bind({
      attr: {
        'aria-disabled': () => (props.disabled.value ? 'true' : null),
        role: () => (props.selectable.value ? 'listbox' : 'list'),
        value: () => selectedValue.value ?? null,
      },
      on: {
        keydown: (event: KeyboardEvent) => {
          if (!props.selectable.value || props.disabled.value) return;

          const row = event
            .composedPath()
            .find((node): node is HTMLElement => node instanceof HTMLElement && node.getAttribute('part') === 'row');

          if (!row) return;

          const focused = getRows().indexOf(row);

          if (focused === -1) return;

          listControl.set(focused);
          listControl.handleKeydown(event);
        },
      },
    });

    return html`
      <slot></slot>
    `;
  },

  styles: [sizeVariantMixin(LIST_SIZE_PRESET), componentStyles],
});
