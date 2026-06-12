import { assert } from '@vielzeug/arsenal';
import { computed, type ReadonlySignal, signal } from '@vielzeug/ripple';

import { createListControl, type ListKeyAction, type ListNavigationAction } from './nav';
import {
  createOverlayControl,
  type DialogCloseReason,
  type OverlayOpenReason,
  type OverlayPositioner,
} from './overlay';
import { createDropdownPositioner, type DropdownPositionerOptions } from './positioner';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BaseOptionItem = object;

/** Placement-only options for the dropdown positioner (getFloating/getReference are injected from the option-list). */
export type PlacementOptions = Omit<DropdownPositionerOptions, 'getFloating' | 'getReference'>;

export type OptionListOptions<T extends BaseOptionItem> = {
  /**
   * Required DOM element accessors. These functions are called lazily so they
   * safely return `null` before the first render.
   */
  dom: {
    getBoundary: () => HTMLElement | null;
    /**
     * Returns the currently focused option element for scroll-into-view.
     * When omitted, `scrollFocusedIntoView()` is a no-op.
     */
    getFocusedOptionElement?: () => HTMLElement | null;
    getPanel: () => HTMLElement | null;
    getReference: () => HTMLElement | null;
    getTrigger?: () => HTMLElement | null;
  };
  /** Returns `true` when all interactions should be suppressed (e.g. the host is disabled). */
  isDisabled?: () => boolean;
  /** Item accessors — describe the shape and content of each option. */
  items: {
    /**
     * Returns a plain-text label for the item at `index`.
     * When provided, the list control supports typeahead.
     */
    getItemLabel?: (item: T, index: number) => string;
    getItems: () => T[];
    /**
     * Derives a stable `id` for the option at `index`.
     * When provided, `aria-activedescendant` is reactively set on the trigger element
     * to reflect the currently focused option (WAI-ARIA listbox / combobox pattern).
     */
    getOptionId?: (index: number) => string;
    isItemDisabled?: (item: T, index: number) => boolean;
  };
  /** Override default keyboard bindings for navigation actions. */
  keys?: Partial<Record<ListNavigationAction, string[]>>;
  /** Whether list navigation wraps around at the first/last item. Default: `true`. */
  loop?: boolean;
  /** Event callbacks fired on open, close, and keyboard navigation. */
  on?: {
    onClose?: (reason: DialogCloseReason) => void;
    onNavigate?: (action: ListKeyAction, index: number, event: KeyboardEvent) => void;
    onOpen?: (reason: OverlayOpenReason) => void;
  };
  /**
   * Restricts keyboard navigation direction for the option list.
   * Defaults to `'vertical'` when omitted (up/down arrow keys).
   */
  orientation?: 'both' | 'horizontal' | 'vertical';
  /** Placement and sizing options for the floating dropdown. */
  positioning?: PlacementOptions;
  /** Whether focus is restored to the trigger on close. Default: inferred from `restoreFocus`. */
  restoreFocus?: boolean | (() => boolean);
  /** `AbortSignal` from the component lifecycle. Disposes subscriptions and removes event listeners on abort. */
  signal: AbortSignal;
};

export type OptionListHandle<T extends BaseOptionItem> = {
  /** Reactive `aria-activedescendant` value. `null` when no option is focused or the list is closed. */
  readonly ariaActiveDescendant: ReadonlySignal<string | null>;
  /** Reactive `aria-expanded` value as string (`'true'` / `'false'`). */
  readonly ariaExpanded: ReadonlySignal<string>;
  close(reason?: DialogCloseReason): void;
  /** Navigate to the first enabled item. Returns the resolved index, or -1 if none. */
  first(): number;
  /**
   * Focused item index (read-only). Write via `set(index)` to update through
   * the list control — this ensures scroll-into-view and disabled-item checks.
   */
  readonly focusedIndex: ReadonlySignal<number>;
  getActiveItem(): T | undefined;
  handleKeydown(event: KeyboardEvent): boolean;
  /** Open state (read-only). Mutate via `open()`, `close()`, or `toggle()`. */
  readonly isOpen: ReadonlySignal<boolean>;
  /** Navigate to the last enabled item. Returns the resolved index, or -1 if none. */
  last(): number;
  /** Navigate to the next enabled item. Returns the resolved index, or -1 if none. */
  next(): number;
  open(reason?: OverlayOpenReason): void;
  /**
   * The underlying dropdown positioner. Exposed as an escape hatch for components
   * that need to imperatively trigger a position update (e.g. `combobox` after
   * filtering options changes the list height).
   */
  readonly positioner: OverlayPositioner;
  /** Navigate to the previous enabled item. Returns the resolved index, or -1 if none. */
  prev(): number;
  reset(): void;
  scrollFocusedIntoView(): void;
  /**
   * Set focus to the item at `index`. Returns the resolved index.
   * Pass a negative index to clear focus (same as `reset()`).
   */
  set(index: number): number;
  /**
   * Toggles open state.
   * - Opens with `openReason` (default `'click'`).
   * - Closes with `closeReason` (default `'trigger'`).
   */
  toggle(openReason?: OverlayOpenReason, closeReason?: DialogCloseReason): void;
};

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Shared headless primitive for dropdown option lists (select, combobox, menu).
 *
 * Owns `isOpen`, `focusedIndex`, the dropdown positioner, list navigation, and
 * overlay wiring. Composes overlay.ts + nav.ts into a single complete API.
 */
export const createOptionList = <T extends BaseOptionItem>(options: OptionListOptions<T>): OptionListHandle<T> => {
  assert(typeof options.dom.getBoundary === 'function', '[sigil] createOptionList: dom.getBoundary is required');
  assert(typeof options.dom.getPanel === 'function', '[sigil] createOptionList: dom.getPanel is required');
  assert(typeof options.dom.getReference === 'function', '[sigil] createOptionList: dom.getReference is required');

  const isOpen = signal(false);
  const focusedIndex = signal(-1);

  const ariaExpanded = computed(() => String(isOpen.value));
  const ariaActiveDescendant = computed<string | null>(() => {
    const idx = focusedIndex.value;

    return options.items.getOptionId && isOpen.value && idx >= 0 ? options.items.getOptionId(idx) : null;
  });

  const positioner = createDropdownPositioner({
    ...options.positioning,
    getFloating: options.dom.getPanel,
    getReference: options.dom.getReference,
  });

  const scrollFocusedIntoView = (): void => {
    options.dom.getFocusedOptionElement?.()?.scrollIntoView({ block: 'nearest' });
  };

  const list = createListControl<T>({
    disabled: () => !isOpen.value,
    getIndex: () => focusedIndex.value,
    getItemLabel: options.items.getItemLabel,
    getItems: options.items.getItems,
    isItemDisabled: options.items.isItemDisabled,
    keys: options.keys,
    loop: options.loop ?? true,
    onNavigate: (action, index, event) => {
      if (index >= 0) options.on?.onNavigate?.(action, index, event);
    },
    orientation: options.orientation,
    setIndex: (index) => {
      focusedIndex.value = index;
      scrollFocusedIntoView();
    },
  });

  const overlay = createOverlayControl({
    getBoundary: options.dom.getBoundary,
    getPanel: options.dom.getPanel,
    getTrigger: options.dom.getTrigger,
    isDisabled: options.isDisabled,
    isOpen: () => isOpen.value,
    onClose: options.on?.onClose,
    onOpen: options.on?.onOpen,
    positioner,
    restoreFocus: options.restoreFocus,
    setOpen: (next) => {
      isOpen.value = next;

      if (!next) list.reset();
    },
    signal: options.signal,
  });

  // Built-in Escape key handling: prevents each consumer from duplicating the
  // close-on-escape pattern. Fires only when the list is open; returns `true`
  // so callers know the event was handled and can stop further processing.
  const handleKeydown = (event: KeyboardEvent): boolean => {
    if (!isOpen.value) return false;

    if (event.key === 'Escape') {
      event.preventDefault();
      overlay.close('escape');

      return true;
    }

    return list.handleKeydown(event);
  };

  options.signal.addEventListener('abort', () => list.cleanup(), { once: true });

  return {
    ariaActiveDescendant,
    ariaExpanded,
    close: (reason) => overlay.close(reason),
    first: list.first,
    focusedIndex,
    getActiveItem: list.getActiveItem,
    handleKeydown,
    isOpen,
    last: list.last,
    next: list.next,
    open: (reason) => overlay.open(reason),
    positioner,
    prev: list.prev,
    reset: list.reset,
    scrollFocusedIntoView,
    set: list.set,
    toggle: (openReason, closeReason) => overlay.toggle(openReason, closeReason),
  };
};
