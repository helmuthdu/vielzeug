import { assert } from '@vielzeug/arsenal';
import { effect, type ReadonlySignal, signal } from '@vielzeug/ripple';

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
  /** Interaction behaviour toggles. All optional — sensible defaults apply. */
  behavior?: {
    isDisabled?: () => boolean;
    /**
     * Override default keyboard bindings for navigation actions.
     */
    keys?: Partial<Record<ListNavigationAction, string[]>>;
    loop?: boolean;
    /**
     * When `false`, the consumer is responsible for setting `aria-expanded` on the trigger.
     * Default: `true` — option-list reactively sets it on `getTrigger()` when provided.
     */
    manageAriaExpanded?: boolean;
    /**
     * Restricts keyboard navigation direction for the option list.
     * Defaults to `'vertical'` when omitted (up/down arrow keys).
     */
    orientation?: 'both' | 'horizontal' | 'vertical';
    restoreFocus?: boolean | (() => boolean);
  };
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
  /** Event callbacks fired on open, close, and keyboard navigation. */
  on?: {
    onClose?: (reason: DialogCloseReason) => void;
    onNavigate?: (action: ListKeyAction, index: number, event: KeyboardEvent) => void;
    onOpen?: (reason: OverlayOpenReason) => void;
  };
  /** Placement and sizing options for the floating dropdown. */
  positioning?: PlacementOptions;
  /**
   * Optional `AbortSignal`. When provided, the option list automatically calls
   * `cleanup()` on abort — stopping ARIA effects, closing the overlay, and
   * removing event listeners.
   *
   * Obtain via `componentSignal(onCleanup)` inside a craft `setup()` function.
   */
  signal?: AbortSignal;
};

export type OptionListHandle<T extends BaseOptionItem> = {
  cleanup(): void;
  close(reason?: DialogCloseReason): void;
  first(): void;
  /**
   * Focused item index (read-only). Write via `set(index)` to update through
   * the list control — this ensures scroll-into-view and disabled-item checks.
   */
  readonly focusedIndex: ReadonlySignal<number>;
  getActiveItem(): T | undefined;
  handleKeydown(event: KeyboardEvent): boolean;
  /** Open state (read-only). Mutate via `open()`, `close()`, or `toggle()`. */
  readonly isOpen: ReadonlySignal<boolean>;
  last(): void;
  next(): void;
  open(reason?: OverlayOpenReason): void;
  /** The dropdown positioner — needed by components that have custom overlay anchoring. */
  readonly positioner: OverlayPositioner;
  prev(): void;
  reset(): void;
  scrollFocusedIntoView(): void;
  set(index: number): void;
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

  const positioner = createDropdownPositioner({
    ...options.positioning,
    getFloating: options.dom.getPanel,
    getReference: options.dom.getReference,
  });

  const scrollFocusedIntoView = (): void => {
    options.dom.getFocusedOptionElement?.()?.scrollIntoView({ block: 'nearest' });
  };

  const ariaEffects = effect(() => {
    const trigger = options.dom.getTrigger?.();

    if (!trigger) return;

    if (options.behavior?.manageAriaExpanded !== false) {
      trigger.setAttribute('aria-expanded', String(isOpen.value));
    }

    const idx = focusedIndex.value;

    if (options.items.getOptionId && isOpen.value && idx >= 0) {
      trigger.setAttribute('aria-activedescendant', options.items.getOptionId(idx));
    } else {
      trigger.removeAttribute('aria-activedescendant');
    }
  });

  const list = createListControl<T>({
    disabled: () => !isOpen.value,
    getIndex: () => focusedIndex.value,
    getItemLabel: options.items.getItemLabel,
    getItems: options.items.getItems,
    isItemDisabled: options.items.isItemDisabled,
    keys: options.behavior?.keys,
    loop: options.behavior?.loop ?? true,
    onNavigate: (action, index, event) => {
      if (index >= 0) options.on?.onNavigate?.(action, index, event);
    },
    orientation: options.behavior?.orientation,
    setIndex: (index) => {
      focusedIndex.value = index;
      scrollFocusedIntoView();
    },
  });

  const overlay = createOverlayControl({
    getBoundary: options.dom.getBoundary,
    getPanel: options.dom.getPanel,
    getTrigger: options.dom.getTrigger,
    isDisabled: options.behavior?.isDisabled,
    isOpen: () => isOpen.value,
    onClose: options.on?.onClose,
    onOpen: options.on?.onOpen,
    positioner,
    restoreFocus: options.behavior?.restoreFocus,
    setOpen: (next) => {
      isOpen.value = next;

      if (!next) list.reset();
    },
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

  let cleaned = false;

  const cleanup = (): void => {
    if (cleaned) return;

    cleaned = true;

    // Dispose the reactive effect first, then reset any ARIA attributes it may
    // have written to the trigger element so a disconnected trigger does not
    // retain a stale "aria-expanded=true" or "aria-activedescendant" value.
    ariaEffects.dispose();

    const trigger = options.dom.getTrigger?.();

    if (trigger) {
      if (options.behavior?.manageAriaExpanded !== false) {
        trigger.removeAttribute('aria-expanded');
      }

      trigger.removeAttribute('aria-activedescendant');
    }

    overlay.cleanup();
  };

  options.signal?.addEventListener('abort', cleanup, { once: true });

  return {
    cleanup,
    close: (reason) => overlay.close(reason ?? 'programmatic'),
    first: list.first,
    focusedIndex,
    getActiveItem: list.getActiveItem,
    handleKeydown,
    isOpen,
    last: list.last,
    next: list.next,
    open: (reason) => overlay.open(reason ?? 'programmatic'),
    positioner,
    prev: list.prev,
    reset: list.reset,
    scrollFocusedIntoView,
    set: list.set,
    toggle: (openReason, closeReason) => overlay.toggle(openReason, closeReason),
  };
};
