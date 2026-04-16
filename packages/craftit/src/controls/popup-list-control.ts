import type { ListControl } from './list-control';
import type { OverlayCloseReason, OverlayControl, OverlayOpenReason } from './overlay-control';

import { syncAria } from '../host';
import { createListControl } from './list-control';
import { createListKeyControl } from './list-key-control';
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
  // ARIA
  /** Configuration for ARIA attributes */
  ariaSync?: PopupListAriaSyncConfig;

  // Overlay
  /** Get the boundary element (for click-outside detection) */
  getBoundaryElement: () => HTMLElement | null;
  // List state
  /** Get the current focused index (-1 if none focused) */
  getIndex: () => number;
  /** Get all items in the list */
  getItems: () => T[];

  /** Get the panel element */
  getPanelElement: () => HTMLElement | null;
  /** Get the trigger element */
  getTriggerElement: () => HTMLElement | null;

  // Overlay state
  /** Check if disabled */
  isDisabled?: () => boolean;

  // List navigation
  /** Check if an item is disabled */
  isItemDisabled?: (item: T, index: number) => boolean;
  /** Whether the popup is open */
  isOpen: () => boolean;

  /** Custom keyboard mappings for list navigation. Defaults to arrow keys. */
  keyboardMapping?:
    | (() => Partial<Record<'first' | 'last' | 'next' | 'prev', string[]>>)
    | Partial<Record<'first' | 'last' | 'next' | 'prev', string[]>>;

  /** The ID of the list element (for aria-controls/aria-owns) */
  listId?: string;

  /** Whether list navigation should loop (wrap around). @default true */
  loop?: boolean;

  /** Called when popup closes */
  onClose?: (reason: OverlayCloseReason) => void;

  /** Called when keyboard navigation is invoked */
  onNavigate?: (action: 'first' | 'last' | 'next' | 'prev', index: number, event: KeyboardEvent) => void;

  /** Called when popup opens */
  onOpen?: (reason: OverlayOpenReason) => void;

  /** Positioner for floating/positioning library integration */
  positioner?: PopupListPositioner;

  /** Whether to restore focus to trigger when closing. @default true */
  restoreFocus?: boolean | (() => boolean);

  /** Set the focused index */
  setIndex: (index: number) => void;

  /** Set open state */
  setOpen: (next: boolean, context: { reason: OverlayCloseReason | OverlayOpenReason }) => void;
};

/**
 * Handle returned by createPopupListControl.
 * Provides methods to control the popup and list, and exposes underlying controls for advanced use.
 */
export type PopupListControl<T> = {
  // Overlay control methods
  /** Bind outside-click listener for closing */
  bindOutsideClick(target?: Document | HTMLElement, capture?: boolean): () => void;
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

  // Expose underlying controls for advanced scenarios
  /** The underlying list control (for manual navigation if needed) */
  list: ListControl<T>;

  /** Move to next enabled item */
  next(): void;

  /** Open the popup */
  open(reason?: OverlayOpenReason): void;

  /** The underlying overlay control (for manual control if needed) */
  overlay: OverlayControl;

  /** Move to previous enabled item */
  prev(): void;

  /** Reset to no selection */
  reset(): void;

  /** Move to specific index */
  set(index: number): void;

  /**
   * Sync ARIA attributes to the panel element.
   * Must be called after panel element is available (usually in onMount).
   * Returns cleanup function.
   */
  syncPanelAria(panel: Element, config?: { listId?: string; role?: PopupListRole }): () => void;

  /**
   * Sync ARIA attributes to the trigger element.
   * Must be called after trigger element is available (usually in onMount).
   * Returns cleanup function.
   */
  syncTriggerAria(trigger: Element, config?: PopupListAriaSyncConfig): () => void;

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
 * // Mount: sync ARIA to trigger
 * onMount(() => {
 *   const cleanup = popupList.syncTriggerAria(triggerEl!);
 *   onCleanup(cleanup);
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
  // Create underlying list control
  const list = createListControl<T>({
    getIndex: options.getIndex,
    getItems: options.getItems,
    isItemDisabled: options.isItemDisabled,
    loop: options.loop ?? true,
    setIndex: options.setIndex,
  });

  // Create underlying overlay control
  const overlay = createOverlayControl({
    getBoundaryElement: options.getBoundaryElement,
    getPanelElement: options.getPanelElement,
    getTriggerElement: options.getTriggerElement,
    isDisabled: options.isDisabled,
    isOpen: options.isOpen,
    onClose: options.onClose,
    onOpen: options.onOpen,
    positioner: options.positioner,
    restoreFocus: options.restoreFocus,
    setOpen: options.setOpen,
  });

  // Create list keyboard control
  const listKeyControl = createListKeyControl({
    control: list,
    disabled: () => !options.isOpen(),
    keys: options.keyboardMapping,
    onInvoke: (action, result) => {
      const navResult = result as { index: number };

      if (navResult.index >= 0) {
        options.onNavigate?.(action, navResult.index, new KeyboardEvent('keydown'));
      }
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ARIA Syncing
  // ─────────────────────────────────────────────────────────────────────────

  const getRoleConfig = (role: PopupListRole = 'listbox') => {
    if (role === 'menu') {
      return {
        defaultPanelRole: 'menu',
        defaultTriggerAttributes: {
          controls: () => options.listId,
          haspopup: 'menu' as const,
        },
        defaultTriggerRole: 'button' as const,
      };
    }

    return {
      defaultPanelRole: 'listbox' as const,
      defaultTriggerAttributes: {
        controls: () => options.listId,
        haspopup: 'listbox' as const,
      },
      defaultTriggerRole: 'combobox' as const,
    };
  };

  const syncTriggerAria = (trigger: Element, config?: PopupListAriaSyncConfig): (() => void) => {
    const role = config?.role ?? options.ariaSync?.role ?? 'listbox';
    const roleConfig = getRoleConfig(role);

    return syncAria(trigger, {
      ...roleConfig.defaultTriggerAttributes,
      ...config?.additional,
      ...options.ariaSync?.additional,
      disabled: () => options.isDisabled?.() ?? false,
      expanded: () => (options.isOpen() ? 'true' : 'false'),
      role: roleConfig.defaultTriggerRole,
    });
  };

  const syncPanelAria = (panel: Element, config?: { listId?: string; role?: PopupListRole }): (() => void) => {
    const role = config?.role ?? options.ariaSync?.role ?? 'listbox';
    const listId = config?.listId ?? options.listId;
    const roleConfig = getRoleConfig(role);

    return syncAria(panel, {
      'aria-orientation': 'vertical',
      id: listId ?? undefined,
      role: roleConfig.defaultPanelRole,
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // Overlay methods
    bindOutsideClick: (target, capture) => overlay.bindOutsideClick(target, capture),
    close: (reason) => overlay.close({ reason: reason ?? 'programmatic' }),
    first: () => list.first(),
    getActiveItem: () => list.getActiveItem(),
    handleListKeydown: (event) => listKeyControl.handleKeydown(event),
    last: () => list.last(),
    list,
    next: () => list.next(),
    open: (reason) => overlay.open({ reason: reason ?? 'programmatic' }),
    overlay,
    prev: () => list.prev(),
    reset: () => list.reset(),
    set: (index) => list.set(index),
    syncPanelAria,
    syncTriggerAria,
    toggle: () => overlay.toggle(),
  };
};
