import { watch } from '@vielzeug/stateit';

import type { OverlayCloseReason, OverlayOpenReason } from './overlay-control';

import { onCleanup, syncAria } from '@vielzeug/craftit';
import { createListControl } from './list-control';
import { createOverlayControl } from './overlay-control';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ARIA role for the popup list. Affects which attributes are synced to the trigger.
 * - 'listbox': For select/combobox (role="combobox" on trigger, role="listbox" on panel)
 * - 'menu': For menus (role="menu" on trigger, role="menu" on panel)
 */
export type PopupListRole = 'listbox' | 'menu';

/**
 * Configuration for syncing ARIA attributes to the trigger element.
 * Automatically handles role-specific attributes like aria-haspopup.
 */
export type PopupListAriaSyncConfig = {
  /**
   * Additional ARIA attributes to sync to the trigger beyond the standard ones.
   * These will be merged with role-specific defaults.
   */
  additional?: Record<
    string,
    boolean | null | number | string | undefined | (() => boolean | null | number | string | undefined)
  >;
  /**
   * The role of the popup list component. Controls which ARIA attributes are synced.
   * @default 'listbox'
   */
  role?: PopupListRole;
};

/**
 * Configuration for positioning the popup list using floatit.
 */
export type PopupListPositioner = {
  /** Gets the floating element (popup panel) */
  floating: () => HTMLElement | null;
  /** Get the reference element (trigger) */
  reference: () => HTMLElement | null;
  /** Update the position (called on open and during auto-update) */
  update: () => void;
};

/**
 * Main options for createPopupListControl.
 */
export type PopupListControlOptions<T> = {
  /** DOM element getters for the popup structure. */
  elements: {
    /** Get the boundary element for outside-click detection (usually the host). */
    getBoundaryElement: () => HTMLElement | null;
    /** Get the floating panel element. */
    getPanelElement: () => HTMLElement | null;
    /** Get the trigger element that opens the popup. */
    getTriggerElement: () => HTMLElement | null;
    /** Ref-like trigger for ARIA syncing when the trigger element changes. */
    triggerRef?: { value: HTMLElement | null };
  };
  /** Reactive list/overlay state bindings. */
  state: {
    /** Get the current focused item index (-1 if none). */
    getIndex: () => number;
    /** Get all items in the list. */
    getItems: () => T[];
    /** Whether the popup is open. */
    isOpen: () => boolean;
    /** Set the focused item index. */
    setIndex: (index: number) => void;
    /** Set the open state with reason context. */
    setOpen: (next: boolean, context: { reason: OverlayCloseReason | OverlayOpenReason }) => void;
  };
  /** ARIA configuration. */
  aria?: {
    /** Configuration for ARIA attributes synced to the trigger. */
    ariaSync?: PopupListAriaSyncConfig;
    /** ID of the list element for aria-controls/aria-owns. */
    listId?: string;
  };
  /** Behavioral options. */
  behavior?: {
    /** Whether the entire control is disabled. */
    isDisabled?: () => boolean;
    /** Whether a specific item is disabled. */
    isItemDisabled?: (item: T, index: number) => boolean;
    /** Custom keyboard key mappings for list navigation. */
    keyboardMapping?:
      | (() => Partial<Record<'first' | 'last' | 'next' | 'prev', string[]>>)
      | Partial<Record<'first' | 'last' | 'next' | 'prev', string[]>>;
    /** Whether list navigation wraps around. @default true */
    loop?: boolean;
    /** Whether to restore focus to trigger on close. @default true */
    restoreFocus?: boolean | (() => boolean);
  };
  /** Event callbacks. */
  on?: {
    /** Called when the popup closes. */
    onClose?: (reason: OverlayCloseReason) => void;
    /** Called when keyboard navigation moves to a new item. */
    onNavigate?: (action: 'first' | 'last' | 'next' | 'prev', index: number, event: KeyboardEvent) => void;
    /** Called when the popup opens. */
    onOpen?: (reason: OverlayOpenReason) => void;
  };
  /** Positioner for floating placement via a positioning library. */
  positioner?: PopupListPositioner;
};

/**
 * Handle returned by createPopupListControl.
 * Provides methods to control the popup and list, and exposes underlying controls for advanced use.
 */
export type PopupListControl<T> = {
  /** Close the popup */
  close(reason?: OverlayCloseReason): void;

  // List navigation methods
  /** Move to first enabled item */
  first(): void;

  /** Get currently focused item */
  getActiveItem(): T | undefined;

  /** Handle keydown events for list navigation. Returns true if event was handled. */
  handleListKeydown(event: KeyboardEvent): boolean;

  /** Move to last enabled item */
  last(): void;

  /** Move to next enabled item */
  next(): void;

  /** Open the popup */
  open(reason?: OverlayOpenReason): void;

  /** Move to previous enabled item */
  prev(): void;

  /** Reset to no selection */
  reset(): void;

  /** Move to specific index */
  set(index: number): void;

  /** Toggle popup open/closed state */
  toggle(): void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a unified popup list control that manages overlay positioning, list navigation,
 * keyboard handling, and ARIA attributes for select, combobox, and menu components.
 *
 * This composable eliminates duplication across components by providing a single,
 * flexible API for:
 * - Opening/closing popups with proper positioning
 * - Navigating lists with keyboard (arrow keys, Home, End)
 * - Syncing ARIA attributes for accessibility
 * - Managing focus restoration
 * - Handling outside-click dismissal
 *
 * @example
 * ```ts
 * // In a select component setup
 * const popupList = createPopupListControl({
 *   // List state
 *   getIndex: () => focusedIndex.value,
 *   getItems: () => options.value,
 *   setIndex: (idx) => { focusedIndex.value = idx; },
 *
 *   // Elements
 *   getBoundaryElement: () => host.el,
 *   getTriggerElement: () => triggerEl,
 *   getPanelElement: () => panelEl,
 *   isOpen: () => isOpen.value,
 *   setOpen: (next, ctx) => { isOpen.value = next; },
 *
 *   // Positioning
 *   positioner: {
 *     reference: () => triggerEl,
 *     floating: () => panelEl,
 *     update: () => positioner.updatePosition(),
 *   },
 *
 *   // ARIA
 *   ariaSync: { role: 'listbox' },
 *   listId: `${selectId}-listbox`,
 * });
 *
 * // Keyboard events
 * function handleKeydown(e: KeyboardEvent) {
 *   if (popupList.handleListKeydown(e)) return; // Consumed by navigation
 *   // Custom keydown logic
 * }
 * ```
 */
export const createPopupListControl = <T>(options: PopupListControlOptions<T>): PopupListControl<T> => {
  const { elements, state, aria, behavior, on } = options;

  // Create underlying list control
  const list = createListControl<T>({
    disabled: () => !state.isOpen(),
    getIndex: state.getIndex,
    getItems: state.getItems,
    isItemDisabled: behavior?.isItemDisabled,
    keys: behavior?.keyboardMapping,
    loop: behavior?.loop ?? true,
    onNavigate: (action, index, event) => {
      if (index >= 0) {
        on?.onNavigate?.(action, index, event);
      }
    },
    setIndex: state.setIndex,
  });

  // Create underlying overlay control
  const overlay = createOverlayControl({
    getBoundaryElement: elements.getBoundaryElement,
    getPanelElement: elements.getPanelElement,
    getTriggerElement: elements.getTriggerElement,
    isDisabled: behavior?.isDisabled,
    isOpen: state.isOpen,
    onCleanup,
    onClose: on?.onClose,
    onOpen: on?.onOpen,
    positioner: options.positioner,
    restoreFocus: behavior?.restoreFocus,
    setOpen: state.setOpen,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ARIA Syncing
  // ─────────────────────────────────────────────────────────────────────────

  const getRoleConfig = (role: PopupListRole = 'listbox') => {
    if (role === 'menu') {
      return {
        defaultTriggerAttributes: {
          controls: () => aria?.listId,
          haspopup: 'menu' as const,
        },
        defaultTriggerRole: 'button' as const,
      };
    }

    return {
      defaultTriggerAttributes: {
        controls: () => aria?.listId,
        haspopup: 'listbox' as const,
      },
      defaultTriggerRole: 'combobox' as const,
    };
  };

  const syncTriggerAria = (trigger: Element, config?: PopupListAriaSyncConfig): (() => void) => {
    const role = config?.role ?? aria?.ariaSync?.role ?? 'listbox';
    const roleConfig = getRoleConfig(role);

    return syncAria(trigger, {
      ...roleConfig.defaultTriggerAttributes,
      ...config?.additional,
      ...aria?.ariaSync?.additional,
      disabled: () => behavior?.isDisabled?.() ?? false,
      expanded: () => (state.isOpen() ? 'true' : 'false'),
      role: roleConfig.defaultTriggerRole,
    });
  };

  if (elements.triggerRef) {
    watch(
      () => elements.triggerRef?.value,
      (trigger) => {
        if (!trigger) return;

        return syncTriggerAria(trigger, aria?.ariaSync);
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  return {
    close: (reason) => overlay.close({ reason: reason ?? 'programmatic' }),
    first: list.first,
    getActiveItem: list.getActiveItem,
    handleListKeydown: list.handleKeydown,
    last: list.last,
    next: list.next,
    open: (reason) => overlay.open({ reason: reason ?? 'programmatic' }),
    prev: list.prev,
    reset: list.reset,
    set: list.set,
    toggle: overlay.toggle,
  };
};
