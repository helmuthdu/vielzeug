import { type ReadonlySignal, effect, signal } from '@vielzeug/stateit';

import { devAssert, HeadlessError } from './dev';
import { createListControl, type ListKeyAction, type ListNavigationAction } from './nav';
import {
  type OverlayCloseReason,
  type OverlayOpenReason,
  type OverlayPositioner,
  createOverlayControl,
} from './overlay';
import { createDropdownPositioner, type DropdownPositionerOptions } from './positioner';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BaseOptionItem = object;

/** Placement-only options for the dropdown positioner (getFloating/getReference are injected from the option-list). */
export type PlacementOptions = Omit<DropdownPositionerOptions, 'getFloating' | 'getReference'>;

export type OptionListOptions<T extends BaseOptionItem> = {
  // ── Required DOM accessors ──────────────────────────────────────────────────
  getBoundary: () => HTMLElement | null;
  // ── Optional DOM accessors ──────────────────────────────────────────────────
  /**
   * Returns the currently focused option element for scroll-into-view.
   * When omitted, `scrollFocusedIntoView()` is a no-op.
   */
  getFocusedOptionElement?: () => HTMLElement | null;
  /**
   * Returns a plain-text label for the item at `index`.
   * When provided, the list control supports typeahead: pressing a printable
   * character key jumps to the first item whose label starts with the accumulated
   * keystroke buffer (500 ms reset window). Omit for combobox and other contexts
   * where the trigger is a text input that handles its own character input.
   */
  getItemLabel?: (item: T, index: number) => string;
  getItems: () => T[];
  /**
   * Derives a stable `id` for the option at `index`.
   * When provided, `aria-activedescendant` is reactively set on the trigger element
   * to reflect the currently focused option (WAI-ARIA listbox / combobox pattern).
   *
   * The rendered option element at that index **must** have the matching `id`.
   *
   * @example
   * ```ts
   * getOptionId: (index) => `${listboxId}-opt-${index}`
   * ```
   */
  getOptionId?: (index: number) => string;
  getPanel: () => HTMLElement | null;
  getReference: () => HTMLElement | null;
  getTrigger?: () => HTMLElement | null;
  // ── Behaviour ───────────────────────────────────────────────────────────────
  isDisabled?: () => boolean;
  isItemDisabled?: (item: T, index: number) => boolean;
  /**
   * Override default keyboard bindings for navigation actions.
   * Each key is an action name; the value is a list of `KeyboardEvent.key` strings.
   */
  keys?: Partial<Record<ListNavigationAction, string[]>>;
  loop?: boolean;
  /**
   * When `false`, the consumer is responsible for setting `aria-expanded` on the trigger.
   * Default: `true` — option-list reactively sets it on `getTrigger()` when provided.
   */
  manageAriaExpanded?: boolean;
  // ── Events ──────────────────────────────────────────────────────────────────
  onClose?: (reason: OverlayCloseReason) => void;
  onNavigate?: (action: ListKeyAction, index: number, event: KeyboardEvent) => void;
  onOpen?: (reason: OverlayOpenReason) => void;
  /**
   * Restricts keyboard navigation direction for the option list.
   * Defaults to `'vertical'` when omitted (up/down arrow keys).
   * Pass `'horizontal'` for horizontal lists or `'both'` to support all four arrow keys.
   */
  orientation?: 'both' | 'horizontal' | 'vertical';
  /** Placement and sizing options for the floating dropdown (getFloating/getReference are injected automatically). */
  positionerOptions?: PlacementOptions;
  restoreFocus?: boolean | (() => boolean);
  /**
   * Optional `AbortSignal`. When provided, the option list automatically calls
   * `cleanup()` on abort — stopping ARIA effects, closing the overlay, and
   * removing event listeners. This replaces the need to call `cleanup()` manually
   * or to thread craftit lifecycle hooks through via `lifecycle`.
   *
   * Obtain via `toAbortSignal(onCleanup)` inside a craftit `setup()` function.
   */
  signal?: AbortSignal;
};

export type OptionListHandle<T extends BaseOptionItem> = {
  cleanup(): void;
  close(reason?: OverlayCloseReason): void;
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
  toggle(openReason?: OverlayOpenReason, closeReason?: OverlayCloseReason): void;
};

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Shared headless primitive for dropdown option lists (select, combobox, menu).
 *
 * Owns `isOpen`, `focusedIndex`, the dropdown positioner, list navigation, and
 * overlay wiring. Composes overlay.ts + nav.ts into a single complete API.
 */
export const createOptionList = <T extends BaseOptionItem>(options: OptionListOptions<T>): OptionListHandle<T> => {
  devAssert(
    typeof options.getBoundary === 'function',
    HeadlessError.MISSING_BOUNDARY,
    'createOptionList: getBoundary is required',
  );
  devAssert(
    typeof options.getPanel === 'function',
    HeadlessError.MISSING_PANEL,
    'createOptionList: getPanel is required',
  );
  devAssert(
    typeof options.getReference === 'function',
    HeadlessError.MISSING_REFERENCE,
    'createOptionList: getReference is required',
  );

  const isOpen = signal(false);
  const focusedIndex = signal(-1);

  const positioner = createDropdownPositioner({
    ...options.positionerOptions,
    getFloating: options.getPanel,
    getReference: options.getReference,
  });

  const scrollFocusedIntoView = (): void => {
    options.getFocusedOptionElement?.()?.scrollIntoView({ block: 'nearest' });
  };

  // ── Reactive ARIA management ───────────────────────────────────────────────
  //
  // aria-expanded: set on getTrigger() when manageAriaExpanded !== false.
  //   The trigger getter may return null initially (before DOM render); it is
  //   checked on every signal change so the first isOpen transition sets it.
  //
  // aria-activedescendant: set when getOptionId is provided and an item is focused.
  //   Cleared when nothing is focused or the overlay is closed.

  const stopAriaEffects = effect(() => {
    const trigger = options.getTrigger?.();

    if (!trigger) return;

    // aria-expanded
    if (options.manageAriaExpanded !== false) {
      trigger.setAttribute('aria-expanded', String(isOpen.value));
    }

    // aria-activedescendant
    const idx = focusedIndex.value;

    if (options.getOptionId && isOpen.value && idx >= 0) {
      trigger.setAttribute('aria-activedescendant', options.getOptionId(idx));
    } else {
      trigger.removeAttribute('aria-activedescendant');
    }
  });

  const list = createListControl<T>({
    disabled: () => !isOpen.value,
    getIndex: () => focusedIndex.value,
    getItemLabel: options.getItemLabel,
    getItems: options.getItems,
    isItemDisabled: options.isItemDisabled,
    keys: options.keys,
    loop: options.loop ?? true,
    onNavigate: (action, index, event) => {
      if (index >= 0) options.onNavigate?.(action, index, event);
    },
    orientation: options.orientation,
    setIndex: (index) => {
      focusedIndex.value = index;
      scrollFocusedIntoView();
    },
  });

  const overlay = createOverlayControl({
    getBoundary: options.getBoundary,
    getPanel: options.getPanel,
    getTrigger: options.getTrigger,
    isDisabled: options.isDisabled,
    isOpen: () => isOpen.value,
    onClose: options.onClose,
    onOpen: options.onOpen,
    positioner,
    restoreFocus: options.restoreFocus,
    setOpen: (next) => {
      isOpen.value = next;

      // Reset focused item on close so the next open starts with no highlight.
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

  const cleanup = (): void => {
    stopAriaEffects();
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
