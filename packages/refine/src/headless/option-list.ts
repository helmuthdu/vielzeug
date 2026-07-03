import { computed, type Readable, signal } from '@vielzeug/ripple';

import { RefineConfigError } from '../errors';
import { createListControl, type ListKeyAction, type ListNavigationAction } from './nav';
import { createOverlayControl, type DialogCloseReason, type OverlayOpenReason } from './overlay';
import { createDropdownPositioner, type DropdownPositionerOptions } from './positioner';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BaseOptionItem = object;

/** Placement-only options for the dropdown positioner (getFloating/getReference are injected from the option-list). */
export type PlacementOptions = Omit<DropdownPositionerOptions, 'getFloating' | 'getReference'>;

export type OptionListOptions<T extends BaseOptionItem> = {
  /** Returns the element used as the outside-click boundary. */
  getBoundary: () => HTMLElement | null;
  /**
   * Returns the currently focused option element for scroll-into-view.
   * When omitted, `scrollFocusedIntoView()` is a no-op.
   */
  getFocusedOptionElement?: () => HTMLElement | null;
  /**
   * Returns a plain-text label for the item at `index`.
   * When provided, the list control supports typeahead.
   */
  getItemLabel?: (item: T, index: number) => string;
  /** Returns the current list items. */
  getItems: () => T[];
  /**
   * Derives a stable `id` for the option at `index`.
   * When provided, `aria-activedescendant` is reactively set on the trigger element
   * to reflect the currently focused option (WAI-ARIA listbox / combobox pattern).
   */
  getOptionId?: (index: number) => string;
  /** Returns the floating panel element. */
  getPanel: () => HTMLElement | null;
  /** Returns the reference (trigger anchor) element for positioning. */
  getReference: () => HTMLElement | null;
  /** Returns the trigger element. Focus is restored here on close. */
  getTrigger?: () => HTMLElement | null;
  /** Returns `true` when all interactions should be suppressed (e.g. the host is disabled). */
  isDisabled?: () => boolean;
  isItemDisabled?: (item: T, index: number) => boolean;
  /** Override default keyboard bindings for navigation actions. */
  keys?: Partial<Record<ListNavigationAction, string[]>>;
  /** Whether list navigation wraps around at the first/last item. Default: `true`. */
  loop?: boolean;
  /** Called when the list closes. */
  onClose?: (reason: DialogCloseReason) => void;
  /**
   * Called when keyboard navigation lands on an item.
   * `event` is the originating `KeyboardEvent`, or `undefined` for programmatic navigation.
   */
  onNavigate?: (action: ListKeyAction, index: number, event?: KeyboardEvent) => void;
  /** Called when the list opens. */
  onOpen?: (reason: OverlayOpenReason) => void;
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
  readonly ariaActiveDescendant: Readable<string | null>;
  /** Reactive `aria-expanded` value as string (`'true'` / `'false'`). */
  readonly ariaExpanded: Readable<string>;
  close(reason?: DialogCloseReason): void;
  /**
   * Focused item index (read-only). Write via `set(index)` to update through
   * the list control — this ensures scroll-into-view and disabled-item checks.
   */
  readonly focusedIndex: Readable<number>;
  getActiveItem(): T | undefined;
  handleKeydown(event: KeyboardEvent): boolean;
  /** Open state (read-only). Mutate via `open()`, `close()`, or `toggle()`. */
  readonly isOpen: Readable<boolean>;
  /**
   * Programmatically navigate to a named position. Always fires `onNavigate`
   * (scroll-into-view, aria-activedescendant update).
   * Returns the resolved index, or `-1` if no enabled item was found.
   */
  navigate(action: ListNavigationAction): number;
  open(reason?: OverlayOpenReason): void;
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
  /** Imperatively re-run dropdown positioning (e.g. after filter changes list height). */
  updatePosition(): void;
};

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Shared headless primitive for dropdown option lists (select, combobox, menu).
 *
 * Owns `isOpen`, `focusedIndex`, the dropdown positioner, list navigation, and
 * overlay wiring. Composes overlay.ts + nav.ts into a single complete API.
 */
export const createOptionList = <T extends BaseOptionItem>(options: OptionListOptions<T>): OptionListHandle<T> => {
  if (typeof options.getBoundary !== 'function') {
    throw new RefineConfigError('createOptionList: getBoundary is required');
  }

  if (typeof options.getPanel !== 'function') {
    throw new RefineConfigError('createOptionList: getPanel is required');
  }

  if (typeof options.getReference !== 'function') {
    throw new RefineConfigError('createOptionList: getReference is required');
  }

  const isOpen = signal(false);

  const ariaExpanded = computed(() => String(isOpen.value));

  const positioner = createDropdownPositioner({
    ...options.positioning,
    getFloating: options.getPanel,
    getReference: options.getReference,
  });

  const scrollFocusedIntoView = (): void => {
    options.getFocusedOptionElement?.()?.scrollIntoView({ block: 'nearest' });
  };

  const list = createListControl<T>({
    disabled: computed(() => !isOpen.value),
    getItemLabel: options.getItemLabel,
    getItems: options.getItems,
    isItemDisabled: options.isItemDisabled,
    keys: options.keys,
    loop: options.loop ?? true,
    onNavigate: (action, index, event) => {
      scrollFocusedIntoView();

      if (index >= 0) options.onNavigate?.(action, index, event);
    },
    orientation: options.orientation,
    signal: options.signal,
  });

  const ariaActiveDescendant = computed<string | null>(() => {
    const idx = list.focusedIndex.value;

    return options.getOptionId && isOpen.value && idx >= 0 ? options.getOptionId(idx) : null;
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

  return {
    ariaActiveDescendant,
    ariaExpanded,
    close: (reason) => overlay.close(reason),
    focusedIndex: list.focusedIndex,
    getActiveItem: list.getActiveItem,
    handleKeydown,
    isOpen,
    navigate: list.navigate,
    open: (reason) => overlay.open(reason),
    scrollFocusedIntoView,
    set: list.set,
    toggle: (openReason, closeReason) => overlay.toggle(openReason, closeReason),
    updatePosition: positioner.update,
  };
};
