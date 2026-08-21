import { restoreFocus } from '@vielzeug/focus';
import { computed, type Readable, signal } from '@vielzeug/ripple';

import { RefineConfigError } from '../errors';
import {
  createListControl,
  type ListNavigationAction,
  type ListNavigationChange,
  type ListNavigationTypeaheadOptions,
} from './nav';
import { createOutsidePointerDismissal, type DropdownCloseReason, type OverlayOpenReason } from './overlay';
import { createDropdownPositioner, type DropdownPositionerOptions } from './positioner';

export type ListboxItem = object;

/** Placement-only options for the listbox dropdown positioner. */
export type ListboxDropdownPlacementOptions = Omit<DropdownPositionerOptions, 'getFloating' | 'getReference'>;

export type ListboxDropdownOptions<T extends ListboxItem> = {
  getBoundary: () => HTMLElement | null;
  getFocusedOptionElement?: () => HTMLElement | null;
  getItems: () => readonly T[];
  getOptionId?: (index: number) => string;
  getPanel: () => HTMLElement | null;
  getReference: () => HTMLElement | null;
  getTrigger?: () => HTMLElement | null;
  isDisabled?: () => boolean;
  isItemDisabled?: (item: T, index: number) => boolean;
  keys?: Partial<Record<ListNavigationAction, readonly string[]>>;
  loop?: boolean;
  onClose?: (reason: DropdownCloseReason) => void;
  onNavigate?: (change: ListNavigationChange<T>) => void;
  onOpen?: (reason: OverlayOpenReason) => void;
  orientation?: 'both' | 'horizontal' | 'vertical';
  positioning?: ListboxDropdownPlacementOptions;
  restoreFocus?: boolean | (() => boolean);
  signal: AbortSignal;
  typeahead?: ListNavigationTypeaheadOptions<T>;
};

export type ListboxDropdown<T extends ListboxItem> = {
  [Symbol.dispose](): void;
  readonly ariaActiveDescendant: Readable<string | null>;
  readonly ariaExpanded: Readable<string>;
  close(reason?: DropdownCloseReason): void;
  /** Closes the dropdown (without restoring focus) and disposes list navigation state. */
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  readonly focusedIndex: Readable<number>;
  getActiveItem(): T | undefined;
  handleKeydown(event: KeyboardEvent): boolean;
  readonly isOpen: Readable<boolean>;
  navigate(action: ListNavigationAction): number;
  open(reason?: OverlayOpenReason): void;
  scrollFocusedIntoView(): void;
  set(index: number): number;
  toggle(openReason?: OverlayOpenReason, closeReason?: DropdownCloseReason): void;
  updatePosition(): void;
};

/**
 * Internal listbox dropdown behavior for select and combobox. It owns only
 * listbox interactions; menu and other overlay families keep their own logic.
 */
export const createListboxDropdown = <T extends ListboxItem>(
  options: ListboxDropdownOptions<T>,
): ListboxDropdown<T> => {
  if (typeof options.getBoundary !== 'function') {
    throw new RefineConfigError('createListboxDropdown: getBoundary is required');
  }

  if (typeof options.getPanel !== 'function') {
    throw new RefineConfigError('createListboxDropdown: getPanel is required');
  }

  if (typeof options.getReference !== 'function') {
    throw new RefineConfigError('createListboxDropdown: getReference is required');
  }

  const isOpen = signal(false);
  const ariaExpanded = computed(() => String(isOpen.value));
  let stopPositioning: (() => void) | null = null;

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
    getItems: options.getItems,
    isItemDisabled: options.isItemDisabled,
    keys: options.keys,
    loop: options.loop ?? true,
    onNavigate: (change) => {
      scrollFocusedIntoView();
      options.onNavigate?.(change);
    },
    orientation: options.orientation,
    signal: options.signal,
    typeahead: options.typeahead,
  });

  const ariaActiveDescendant = computed<string | null>(() => {
    const index = list.focusedIndex.value;

    return options.getOptionId && isOpen.value && index >= 0 ? options.getOptionId(index) : null;
  });

  const shouldRestoreFocus = (): boolean => {
    return typeof options.restoreFocus === 'function' ? options.restoreFocus() : (options.restoreFocus ?? true);
  };

  const close = (reason: DropdownCloseReason = 'programmatic', shouldRestore = true): void => {
    if (!isOpen.value) return;

    isOpen.value = false;
    list.reset();
    stopPositioning?.();
    stopPositioning = null;

    if (shouldRestore && shouldRestoreFocus() && options.getTrigger) restoreFocus(options.getTrigger);

    options.onClose?.(reason);
  };

  const open = (reason: OverlayOpenReason = 'programmatic'): void => {
    if (options.isDisabled?.() || isOpen.value) return;

    isOpen.value = true;
    positioner.update();
    stopPositioning = positioner.startAutoUpdate?.() ?? null;
    options.onOpen?.(reason);
  };

  const toggle = (openReason: OverlayOpenReason = 'click', closeReason: DropdownCloseReason = 'trigger'): void => {
    if (isOpen.value) close(closeReason);
    else open(openReason);
  };

  createOutsidePointerDismissal({
    getTargets: () => [options.getBoundary(), options.getPanel()],
    isActive: () => isOpen.value,
    onDismiss: () => close('outsideClick'),
    signal: options.signal,
  });

  let disposed = false;

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;

    if (isOpen.value) {
      isOpen.value = false;
      list.reset();
      stopPositioning?.();
      stopPositioning = null;
    }
  };

  options.signal.addEventListener('abort', dispose, { once: true });

  const handleKeydown = (event: KeyboardEvent): boolean => {
    if (!isOpen.value) return false;

    if (event.key === 'Escape') {
      event.preventDefault();
      close('escape');

      return true;
    }

    return list.handleKeydown(event);
  };

  return {
    ariaActiveDescendant,
    ariaExpanded,
    close,
    dispose,
    get disposed() {
      return disposed;
    },
    focusedIndex: list.focusedIndex,
    getActiveItem: list.getActiveItem,
    handleKeydown,
    isOpen,
    navigate: list.navigate,
    open,
    scrollFocusedIntoView,
    set: list.set,
    [Symbol.dispose]: dispose,
    toggle,
    updatePosition: positioner.update,
  };
};
