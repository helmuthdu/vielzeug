import { createGridNavigation, restoreFocus } from '@vielzeug/focus';
import type { Placement, VirtualReference } from '@vielzeug/orbit';
import {
  bind,
  createContext,
  createId,
  define,
  getHost,
  html,
  inject,
  onCleanup,
  onMounted,
  prop,
  provide,
  useEmit,
  useSlots,
  when,
} from '@vielzeug/ore';
import type { Readable } from '@vielzeug/ripple';
import { computed, watch as rippleWatch, signal } from '@vielzeug/ripple';
import {
  createDropdownPositioner,
  createInteraction,
  createListControl,
  createOutsidePointerDismissal,
  type DropdownCloseReason,
  elementDirection,
  lifecycleSignal,
  type OverlayOpenChangeDetail,
  type OverlayOpenReason,
  parseOptionalBool,
  truncationRevealRef,
} from '../../core';
import { disablableBundle, MENU_SIZE_PRESET, sizableBundle } from '../../shared';
import { colorThemeMixin, forcedColorsMixin, overlayMotionMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize } from '../../types';
import componentStyles from './menu.css?inline';
import menuItemStyles from './menu-item.css?inline';
import menuLabelStyles from './menu-label.css?inline';
import menuSeparatorStyles from './menu-separator.css?inline';

// The submenu trigger renders `<ore-icon>` for its chevron, so menu owns the icon registration the
// way drawer/dialog/command-palette do: this re-export pulls in the element and the default set.
export { ICON_TAG } from '../../content/icon/icon';

// ── Types ─────────────────────────────────────────────────────────────

export interface MenuSelectDetail {
  checked?: boolean;
  value: string;
}

export const ORE_MENU_ITEM_TYPES = ['checkbox', 'radio'] as const;
export type OreMenuItemType = (typeof ORE_MENU_ITEM_TYPES)[number];

export const MENU_LAYOUTS = ['grid', 'list'] as const;
export type OreMenuLayout = (typeof MENU_LAYOUTS)[number];

export const MENU_TRIGGERS = ['click', 'contextmenu'] as const;
/** How a pointer gesture opens the menu: a plain click, or right-click / long-press. */
export type OreMenuTrigger = (typeof MENU_TRIGGERS)[number];

/** Columns per row when `layout` is `grid` and the `columns` prop is unset. */
const DEFAULT_GRID_COLUMNS = 3;

/** Hover dwell before a submenu flies out: long enough to cross a row without firing, short
 * enough to feel immediate. Native menus open on the order of this. */
const SUBMENU_OPEN_DELAY_MS = 120;
/** Grace before an open submenu closes when the pointer leaves it: covers the gap the pointer
 * crosses re-entering the flyout, so a stray exit does not collapse the chain. */
const SUBMENU_CLOSE_DELAY_MS = 300;

export type OreMenuEvents = {
  'open-change': OverlayOpenChangeDetail;
  select: MenuSelectDetail;
};

export type OreMenuItemProps = {
  checked?: boolean;
  disabled?: boolean;
  type?: OreMenuItemType;
  value?: string;
};

export type OreMenuProps = {
  /** Cards per row when `layout` is `grid` (default 3). Owns the panel's column count outright. */
  columns?: number;
  /** Initial uncontrolled open state. Ignored when `open` is set. */
  'default-open'?: boolean;
  disabled?: boolean;
  /** Panel layout: 'list' (default) | 'grid' */
  layout?: OreMenuLayout;
  /** Controlled open state. */
  open?: boolean;
  placement?: 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end';
  size?: ComponentSize;
  /** How the menu opens: 'click' (default) | 'contextmenu' (right-click / long-press) */
  trigger?: OreMenuTrigger;
};

/** Shared context propagated from `ore-menu` to its slotted `ore-menu-item` children. */
export const MENU_CTX = createContext<{ layout: Readable<OreMenuLayout | undefined> }>('OreMenu');

/**
 * The menu that owns selection, provided once by the root `ore-menu`. A nested submenu's panel
 * injects it to activate one of its own items: activation (emit `select`, close the chain) belongs
 * to the root, not to whichever item happens to host the panel.
 */
const MENU_ROOT_CTX = createContext<{ activateItem(item: HTMLElement): void }>('OreMenuRoot');

/**
 * The sibling group a submenu trigger belongs to, provided by both `ore-menu` (for its panel
 * items) and every submenu-parent item (for its own children). Opening a submenu closes its
 * siblings — the ancestors stay open, matching native menus — which needs the group, not the tree.
 */
const SUBMENU_GROUP_CTX = createContext<{ closeOthers(current: HTMLElement): void }>('OreSubmenuGroup');

/**
 * The `ore-menu-item`s rendered in a panel owned by `root` (the `ore-menu` host or a submenu-parent
 * item). An item belongs to its nearest `ore-menu-item` ancestor, falling back to the menu, so the
 * root menu's list excludes nested submenu items instead of walking them as its own rows. `closest`
 * includes self, so ownership is read from the parent chain.
 */
function getOwnedItems(root: HTMLElement): HTMLElement[] {
  const owner = root.tagName === 'ORE-MENU-ITEM' ? root : null;

  return Array.from(root.querySelectorAll<HTMLElement>('ore-menu-item')).filter(
    (item) => item.parentElement?.closest('ore-menu-item') === owner,
  );
}

/** Imperative surface a submenu item exposes so its group and owning menu can close it. */
export type OreMenuItemElement = HTMLElement &
  OreMenuItemProps & {
    /** Close this item's open submenu (no-op for a leaf item). */
    hideSubmenu(): void;
  };

/** Call `hideSubmenu` on every item in a subtree: a closing menu collapses its whole chain. */
function hideAllSubmenus(root: HTMLElement): void {
  for (const item of root.querySelectorAll<OreMenuItemElement>('ore-menu-item')) {
    item.hideSubmenu?.();
  }
}

// ── Styles ─────────────────────────────────────────────────────────────

// ── Menu Separator ─────────────────────────────────────────────────────────────

/**
 * Visual separator used to group menu items inside `<ore-menu>`.
 *
 * @element ore-menu-separator
 *
 * @example
 * ```html
 * <ore-menu-item value="cut">Cut</ore-menu-item>
 * <ore-menu-separator></ore-menu-separator>
 * <ore-menu-item value="paste">Paste</ore-menu-item>
 * ```
 */
export const SEPARATOR_TAG = 'ore-menu-separator' as const;
define(SEPARATOR_TAG, {
  setup() {
    return html``;
  },
  styles: [menuSeparatorStyles],
});

// ── Menu Label ──────────────────────────────────────────────────────────────

/**
 * Non-interactive caption that names a group of items inside `<ore-menu>`.
 *
 * It is not focusable and never enters keyboard navigation (which only walks
 * `ore-menu-item` elements); `role="presentation"` keeps it out of the menu's
 * accessibility structure while the caption stays visible.
 *
 * @element ore-menu-label
 *
 * @example
 * ```html
 * <ore-menu-label>Switch account</ore-menu-label>
 * <ore-menu-item type="radio" value="ada" checked>Ada</ore-menu-item>
 * ```
 */
export const MENU_LABEL_TAG = 'ore-menu-label' as const;
define(MENU_LABEL_TAG, {
  setup() {
    const el = getHost();

    onMounted(() => {
      el.setAttribute('role', 'presentation');
    });

    return html`
      <span class="label" part="label"><slot></slot></span>
    `;
  },
  styles: [menuLabelStyles],
});

// ── Menu Component ─────────────────────────────────────────────────────────────

const isCheckableItemType = (value: string | null): value is OreMenuItemType =>
  value === 'checkbox' || value === 'radio';
/**
 * The layout-specific half of keyboard interaction: which item activation uses, how the arrow
 * keys move, and what a close resets. Selected per key from the layout, so the keydown handler
 * never branches on layout itself.
 */
type ItemNavigation = {
  /** The item activation targets, or nothing when focus sits on nothing usable. */
  activeItem(): HTMLElement | undefined;
  /** Moves focus for a recognized key; returns whether the key was handled. */
  handleKeydown(event: KeyboardEvent): boolean;
  reset(): void;
};
/**
 * Action dropdown menu triggered by a slotted trigger element.
 *
 * @element ore-menu
 * @element ore-menu-item - Clickable menu option (place in default slot)
 * @element ore-menu-separator - Visual divider between menu groups
 * @element ore-menu-label - Non-interactive caption naming a group of items
 *
 * @attr {boolean} disabled - Disables opening and keyboard interaction
 * @attr {boolean} open - Controlled open state
 * @attr {boolean} default-open - Initial uncontrolled open state
 * @attr {string} layout - Panel layout: 'list' (default) | 'grid'
 * @attr {number} columns - Columns per row in `grid` layout (default 3)
 * @attr {string} placement - Panel placement: 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end' (default: 'bottom-start')
 * @attr {string} size - Size: 'sm' | 'md' | 'lg'
 * @attr {string} trigger - How the menu opens: 'click' (default) | 'contextmenu' (right-click or long-press opens at the pointer; left-click does nothing)
 *
 * @fires open-change - Fired when the menu state changes. detail: { open, reason }
 * @fires select - Fired when an item is selected. detail: { value: string, checked?: boolean }
 *
 * @slot trigger - Trigger element that toggles menu visibility
 * @slot - Menu content (`<ore-menu-item>`, `<ore-menu-separator>`, `<ore-menu-label>`)
 *
 * @part panel - Floating menu panel container
 *
 * @cssprop --menu-panel-bg - Background of the floating panel
 * @cssprop --menu-panel-border-color - Border color of the floating panel
 * @cssprop --menu-panel-shadow - Box shadow of the floating panel
 * @cssprop --menu-panel-blur - Backdrop blur amount for the floating panel
 * @cssprop --menu-panel-min-width - Minimum width of the floating panel
 * @cssprop --menu-panel-max-height - Panel height cap; unset, the panel shows everything the opened side has room for and scrolls only beyond that
 * @cssprop --menu-panel-radius - Border radius of the floating panel
 * @cssprop --menu-panel-width - Panel width in `grid` layout. Defaults to a phone-safe cap
 * @cssprop --menu-panel-gap - Gap between grid cards
 *
 * @example
 * ```html
 * <ore-menu>
 *   <button slot="trigger">Actions</button>
 *   <ore-menu-item value="edit">Edit</ore-menu-item>
 *   <ore-menu-item value="delete">Delete</ore-menu-item>
 * </ore-menu>
 * ```
 * @example
 * ```html
 * <ore-menu trigger="contextmenu">
 *   <p slot="trigger">Right-click this text</p>
 *   <ore-menu-item value="copy">Copy</ore-menu-item>
 *   <ore-menu-item value="paste">Paste</ore-menu-item>
 * </ore-menu>
 * ```
 * @example
 * ```html
 * <!-- Nested submenu: items slotted into `submenu` fly out on hover, ArrowRight, or Enter -->
 * <ore-menu>
 *   <button slot="trigger">File</button>
 *   <ore-menu-item value="new">New</ore-menu-item>
 *   <ore-menu-item>
 *     Open recent
 *     <ore-menu-item slot="submenu" value="recent-1">report.pdf</ore-menu-item>
 *     <ore-menu-item slot="submenu" value="recent-2">notes.md</ore-menu-item>
 *   </ore-menu-item>
 * </ore-menu>
 * ```
 */
export const MENU_TAG = 'ore-menu' as const;
define<OreMenuProps>(MENU_TAG, {
  props: {
    ...sizableBundle,
    ...disablableBundle,
    columns: prop.number(),
    'default-open': prop.bool(false),
    layout: prop.oneOf(MENU_LAYOUTS, 'list'),
    open: { default: undefined as boolean | undefined, parse: parseOptionalBool },
    placement: prop.oneOf(
      ['bottom', 'bottom-start', 'bottom-end', 'top', 'top-start', 'top-end'] as const,
      'bottom-start',
    ),
    trigger: prop.oneOf(MENU_TRIGGERS, 'click'),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreMenuEvents>();
    const slots = useSlots();

    // Items restyle themselves as cards through this context: the layout cannot reach a slotted
    // child's shadow internals from here, the same reason ore-button-group provides its own.
    provide(MENU_CTX, { layout: props.layout });
    // Selection belongs to the root menu, so a nested submenu panel can activate one of its own
    // items without owning the `select` event or the chain close. Deferred read: `activateItem`
    // is declared below and only called after setup finishes.
    provide(MENU_ROOT_CTX, { activateItem: (item) => activateItem(item) });
    // Root items are one sibling group: opening or hovering one closes the others' submenus.
    provide(SUBMENU_GROUP_CTX, {
      closeOthers: (current) => {
        for (const item of getOwnedItems(el)) {
          if (item !== current) (item as OreMenuItemElement).hideSubmenu?.();
        }
      },
    });

    const menuId = createId('menu');
    const isDisabled = computed(() => Boolean(props.disabled.value));
    const isGrid = computed(() => props.layout.value === 'grid');
    // The `columns` prop owns the column count outright: one normalization feeds both the CSS
    // grid (through `--menu-panel-columns`) and the keyboard grid, so a row the pointer sees is
    // always the row the arrows walk. A stylesheet hook could only ever serve one of the two.
    const gridColumns = computed(() => {
      const columns = props.columns.value;

      return columns === undefined || !Number.isFinite(columns)
        ? DEFAULT_GRID_COLUMNS
        : Math.max(1, Math.trunc(columns));
    });
    const abortSignal = lifecycleSignal(onCleanup);
    let triggerEl: HTMLElement | null = null;
    let panelEl: HTMLElement | null = null;
    let cleanupTrigger: (() => void) | null = null;
    // Where the last contextmenu gesture happened, as a zero-size virtual
    // reference (orbit's shape for a position without an element). Only
    // `trigger="contextmenu"` sets it; the positioner anchors the panel to it
    // instead of the trigger element while it is set, and `close()` clears it so
    // the next keyboard/programmatic open anchors to the trigger again.
    let contextPoint: VirtualReference | null = null;

    // ── Helpers ───────────────────────────────────────────────────────────────
    // Owned items only: a submenu's children are light-DOM descendants of the menu too, so an
    // unscoped query would fold them into this panel's arrow navigation and its grid rows.
    function getItems(): HTMLElement[] {
      return getOwnedItems(el).filter((item) => !item.hasAttribute('disabled'));
    }

    // Every owned item, disabled ones included: a grid that skipped them would walk off the row
    // the pointer shows (createGridNavigation documents the same rule).
    function getAllItems(): HTMLElement[] {
      return getOwnedItems(el);
    }

    function getItemFocusable(item: HTMLElement | null | undefined): HTMLElement | null {
      if (!item) return null;

      return item.shadowRoot?.querySelector<HTMLElement>('[role^="menuitem"]') ?? item;
    }

    function isFocusedItem(item: HTMLElement): boolean {
      const focusable = getItemFocusable(item);

      return item === document.activeElement || focusable === document.activeElement;
    }

    const isOpenSignal = signal(false);
    let stopPositioning: (() => void) | null = null;
    const positioner = createDropdownPositioner({
      fitAvailableHeight: true,
      getFloating: () => panelEl,
      getOffsetPx: () => 4,
      getPlacement: () => (props.placement.value ?? 'bottom-start') as Placement,
      getReference: () => contextPoint ?? triggerEl,
      matchWidth: false,
      // menu.css keys the panel's transform-origin off [data-placement]; the positioner reports the
      // resolved (RTL-mirrored, flipped) placement here so that rule finally has something to match.
      onPlacementChange: (placement) => panelEl?.setAttribute('data-placement', placement),
      padding: 6,
      useClippingAncestor: false,
    });
    const list = createListControl<HTMLElement>({
      disabled: computed(() => !isOpenSignal.value),
      getItems: getItems,
      isItemDisabled: (item) => item.hasAttribute('disabled'),
      onNavigate: ({ item }) => {
        getItemFocusable(item)?.focus();
      },
      signal: abortSignal,
    });

    // Grid layout walks every item by row and column, so it needs its own navigation: the list
    // control filters disabled items out of its index space, which would desync the arrow moves
    // from the cards on screen. `getActiveIndex` keeps pointer focus and Tab in sync with the
    // keyboard grid, mirroring how the list re-reads focus before every key.
    const grid = createGridNavigation<HTMLElement>({
      columns: () => gridColumns.value,
      disabled: () => !isOpenSignal.value,
      getActiveIndex: () => getAllItems().findIndex(isFocusedItem),
      getItems: getAllItems,
    });

    const focusItem = (item: HTMLElement | null | undefined): void => {
      getItemFocusable(item)?.focus();
    };

    // The list control tracks its own index, so it must be told where the focus is before every
    // key; `getActiveItem` then hands out only usable items, because its index space filters
    // disabled ones out.
    const listNav: ItemNavigation = {
      activeItem: () => list.getActiveItem(),
      handleKeydown: (event) => {
        const focusedIndex = getItems().findIndex(isFocusedItem);
        if (focusedIndex >= 0) list.set(focusedIndex);

        return list.handleKeydown(event);
      },
      reset: () => list.reset(),
    };

    const gridNav: ItemNavigation = {
      // A grid walks every card, disabled ones included (skipping them would desync the arrows
      // from the visible rows), so the adapter refuses for the keyboard what the click path
      // already refuses for the pointer. The list control never hands out a disabled item.
      activeItem: () => {
        const item = grid.getActiveItem();

        return item && !item.hasAttribute('disabled') ? item : undefined;
      },
      // createGridNavigation re-reads focus through `getActiveIndex` on every move, so pointer
      // clicks and Tab need no re-seeding. It reports a move but never focuses it; `change` is
      // null when the move clamped at an edge, which means "handled, stay put".
      handleKeydown: (event) => {
        const moved = grid.handleKeydown(event);
        if (!moved?.handled) return false;

        focusItem(moved.change?.item);

        return true;
      },
      reset: () => grid.reset(),
    };

    const nav = (): ItemNavigation => (isGrid.value ? gridNav : listNav);

    // Both layouts open onto the first usable item; `getItems` already excludes disabled ones,
    // and the grid re-derives its index from the focused card, so no layout branch is needed.
    const focusFirstItem = (): void => {
      focusItem(getItems()[0]);
    };

    const close = (reason: DropdownCloseReason = 'programmatic', shouldRestoreFocus = true): void => {
      if (!isOpenSignal.value) return;

      isOpenSignal.value = false;
      contextPoint = null;
      // Submenu open state lives in the items, so a closing menu collapses the whole chain:
      // otherwise a flyout would outlive the panel that anchored it.
      hideAllSubmenus(el);
      list.reset();
      grid.reset();
      stopPositioning?.();
      stopPositioning = null;

      if (shouldRestoreFocus) restoreFocus(() => triggerEl);

      emit('open-change', { open: false, reason });
    };

    const open = (reason: OverlayOpenReason = 'programmatic'): void => {
      if (isDisabled.value || isOpenSignal.value) return;

      isOpenSignal.value = true;
      positioner.update();
      stopPositioning = positioner.startAutoUpdate?.() ?? null;
      emit('open-change', { open: true, reason });
    };

    const toggle = (): void => {
      if (isOpenSignal.value) close('trigger');
      else open('click');
    };

    createOutsidePointerDismissal({
      getTargets: () => [el, panelEl],
      isActive: () => isOpenSignal.value,
      onDismiss: () => close('outsideClick'),
      signal: abortSignal,
    });

    let initialized = false;

    rippleWatch(
      props.open,
      (value) => {
        if (value === undefined) {
          if (!initialized) {
            if (props['default-open'].value) open('programmatic');
          } else {
            close('programmatic');
          }
        } else if (value) {
          open('programmatic');
        } else {
          close('programmatic');
        }

        initialized = true;
      },
      { immediate: true },
    );
    abortSignal.addEventListener(
      'abort',
      () => {
        if (!isOpenSignal.value) return;

        isOpenSignal.value = false;
        list.reset();
        grid.reset();
        stopPositioning?.();
        stopPositioning = null;
      },
      { once: true },
    );

    const activateItem = (item: HTMLElement): void => {
      const type = item.getAttribute('type');
      const isCheckable = isCheckableItemType(type);

      if (type === 'checkbox') {
        item.toggleAttribute('checked', !item.hasAttribute('checked'));
      } else if (type === 'radio') {
        // Radios group within their own panel: a submenu's radios are a separate group from the
        // root's, so the loop is scoped to items sharing this item's owner, not the whole menu.
        const owner = item.parentElement?.closest<HTMLElement>('ore-menu-item') ?? el;

        for (const radio of getOwnedItems(owner)) {
          if (radio.getAttribute('type') !== 'radio') continue;

          radio.toggleAttribute('checked', radio === item);
        }
      }

      const value = item.getAttribute('value') ?? '';
      const checked = isCheckable ? item.hasAttribute('checked') : undefined;

      emit('select', { checked, value });

      if (!isCheckable) {
        close('select');
      }
    };

    const openFromKeyboardPress = createInteraction({
      keys: ['Enter', ' ', 'ArrowDown'],
      onPress: () => {
        open('keyboard');
        // The panel renders on the next frame; focus the first usable item once it exists.
        requestAnimationFrame(focusFirstItem);
      },
    });

    // ── Keyboard Navigation ───────────────────────────────────────────────────
    function handleMenuKeydown(e: KeyboardEvent) {
      if (isDisabled.value) return;

      // A keydown that originated in a nested submenu belongs to that submenu's own panel handler
      // (which runs first and stops propagation for the keys it owns). This guard catches the rest:
      // without it, an unhandled key from a nested item (e.g. ArrowRight on a leaf) would fall
      // through to this panel's list and move the root focus out from under the open flyout.
      const sourceItem = e
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && node.tagName === 'ORE-MENU-ITEM');

      if (sourceItem && !getOwnedItems(el).includes(sourceItem) && e.key !== 'Tab') return;

      const open = isOpenSignal.value;

      // When closed: open on Enter / Space / ArrowDown
      if (!open) {
        openFromKeyboardPress.handleKeydown(e);

        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        close('escape');

        return;
      }

      if (nav().handleKeydown(e)) return;

      // When open: activate
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();

        const focused = nav().activeItem();
        if (focused) activateItem(focused);

        return;
      }

      if (e.key === 'Tab') {
        close('programmatic');
      }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    bind({
      on: {
        click: (e: MouseEvent) => {
          const path = e.composedPath();

          if (!isOpenSignal.value) return;

          const itemFromPath = path.find(
            (node): node is HTMLElement => node instanceof HTMLElement && node.tagName === 'ORE-MENU-ITEM',
          );
          const item = itemFromPath ?? (e.target as HTMLElement | null)?.closest<HTMLElement>('ore-menu-item') ?? null;

          if (!item || item.hasAttribute('disabled')) return;

          activateItem(item);
        },
      },
    });

    // The `columns` prop owns the column count outright, so it is always emitted: the CSS grid
    // and the keyboard grid read the same normalized number, and a stylesheet hook could only
    // ever serve one of the two.
    bind({
      style: {
        '--menu-panel-columns': () => gridColumns.value,
      },
    });

    function resolveTrigger() {
      cleanupTrigger?.();
      cleanupTrigger = null;

      const assigned = slots.elements('trigger').value;

      triggerEl = (assigned?.[0] as HTMLElement | undefined) ?? null;

      if (!triggerEl) return;

      const cleanups: Array<() => void> = [];
      const removeAria = bind(
        {
          attr: {
            'aria-controls': () => menuId,
            'aria-disabled': () => isDisabled.value,
            'aria-expanded': () => String(isOpenSignal.value),
            'aria-haspopup': 'menu',
          },
        },
        { target: triggerEl },
      );

      const onTriggerClick = (event: MouseEvent) => {
        event.stopPropagation();

        if (isDisabled.value) return;
        // In contextmenu mode a left click is not an open gesture: the page's own
        // click behavior (selecting text, activating a row) stays intact.
        if (props.trigger.value === 'contextmenu') return;

        toggle();
      };
      const onTriggerContextmenu = (event: MouseEvent) => {
        if (props.trigger.value !== 'contextmenu') return;

        event.preventDefault();
        event.stopPropagation();

        if (isDisabled.value) return;

        // Suppress the native menu and open ours at the pointer instead. The
        // point is a zero-size reference, so the panel's top-start lands on the
        // cursor and flip/shift keep it on screen from there.
        contextPoint = {
          getBoundingClientRect: () => ({ height: 0, width: 0, x: event.clientX, y: event.clientY }),
        };
        // A right-click while already open (moving the menu to a new point) must
        // re-anchor immediately: `open()` early-returns when open and autoUpdate
        // only fires on scroll/resize, so without this the panel would stay put.
        if (isOpenSignal.value) positioner.update();
        else open('contextmenu');
        requestAnimationFrame(focusFirstItem);
      };
      const onTriggerKeydown = (event: KeyboardEvent) => {
        handleMenuKeydown(event);
      };

      triggerEl.addEventListener('click', onTriggerClick);
      triggerEl.addEventListener('contextmenu', onTriggerContextmenu);
      triggerEl.addEventListener('keydown', onTriggerKeydown);
      cleanups.push(() => triggerEl?.removeEventListener('click', onTriggerClick));
      cleanups.push(() => triggerEl?.removeEventListener('contextmenu', onTriggerContextmenu));
      cleanups.push(() => triggerEl?.removeEventListener('keydown', onTriggerKeydown));

      cleanupTrigger = () => {
        removeAria();

        for (const cleanup of cleanups) cleanup();
      };
    }

    rippleWatch(slots.elements('trigger'), resolveTrigger, { immediate: true });
    // Switching modes swaps what the trigger listens for, so re-bind it.
    rippleWatch(props.trigger, resolveTrigger);

    onMounted(() => {
      resolveTrigger();

      return () => {
        cleanupTrigger?.();
        cleanupTrigger = null;
      };
    });

    return html`
      <slot name="trigger"></slot>
      <div
        class="menu-panel"
        part="panel"
        id="${menuId}"
        role="menu"
        aria-orientation="vertical"
        data-open="${() => (isOpenSignal.value ? '' : null)}"
        @keydown="${handleMenuKeydown}"
        ref="${(el: HTMLElement | null) => {
          panelEl = el;
        }}">
        <slot></slot>
      </div>
    `;
  },
  styles: [componentStyles, overlayMotionMixin('menu'), sizeVariantMixin(MENU_SIZE_PRESET), forcedColorsMixin],
});

// ── Menu Item Component ─────────────────────────────────────────────────────────────

// Defined after `ore-menu` on purpose. A child that injects parent context must be registered
// after its parent: with statically parsed markup and a deferred bundle, each `define()` upgrades
// the parser-created elements immediately, so an item defined first would run `inject(MENU_CTX)`
// before any menu has `provide()`d it — and `inject` caches a miss per setup, permanently leaving
// grid menus with list rows instead of cards. Same rule as navbar/sidebar/button-group: parent
// first, children after.

/**
 * A selectable action item used inside `<ore-menu>`.
 *
 * Content slotted into `submenu` turns the item into a submenu trigger: it grows a trailing
 * chevron, reports `aria-haspopup="menu"` / `aria-expanded`, and flies out a nested menu panel on
 * hover, ArrowRight, Enter, Space, or a click. A trigger is never selectable — it emits no `select`
 * and carries no value — and its children stay out of the parent menu's arrow navigation, so the
 * parent's rows always match what the pointer sees. Escape and ArrowLeft close the flyout and hand
 * focus back to the trigger; selecting a child closes the whole chain. Submenus nest to any depth.
 *
 * @element ore-menu-item
 *
 * @attr {boolean} checked - Checked state for `checkbox` and `radio` item types
 * @attr {boolean} disabled - Disables selection and pointer interaction
 * @attr {'checkbox'|'radio'} type - Optional checkable menu item mode
 * @attr {string} value - Value emitted by parent menu on selection
 *
 * @slot - Item label/content
 * @slot end - Optional trailing content (shortcut hints, indicators)
 * @slot icon - Optional leading icon content
 * @slot submenu - Nested menu items that turn this item into a submenu trigger
 *
 * @cssprop --menu-item-hover-bg - Background on hover
 * @cssprop --menu-item-focus-color - Text color when keyboard-focused
 * @cssprop --menu-item-focus-bg - Background when keyboard-focused
 * @cssprop --menu-item-selection-bg - Background for checkbox/radio items (unselected)
 * @cssprop --menu-item-checked-color - Text color when checked
 * @cssprop --menu-item-checked-bg - Background when checked
 *
 * @part item - Root item container element.
 * @part item-label - Label text container.
 * @part end-slot - Trailing content slot container.
 * @part icon-slot - Leading icon slot container.
 * @part submenu - Floating submenu panel (present only meaningful when the `submenu` slot is filled).
 *
 * @example
 * ```html
 * <ore-menu-item value="edit">Edit</ore-menu-item>
 * <ore-menu-item value="delete" disabled>Delete</ore-menu-item>
 * <ore-menu-item type="checkbox" value="wrap" checked>Word wrap</ore-menu-item>
 * <ore-menu-item type="radio" value="left">Align left</ore-menu-item>
 * ```
 * @example
 * ```html
 * <!-- Submenu trigger: the label is the row, `submenu` holds the flyout's items -->
 * <ore-menu-item>
 *   Share
 *   <ore-menu-item slot="submenu" value="mail">Email</ore-menu-item>
 *   <ore-menu-item slot="submenu" value="link">Copy link</ore-menu-item>
 * </ore-menu-item>
 * ```
 */
export const MENU_ITEM_TAG = 'ore-menu-item' as const;
define<OreMenuItemProps>(MENU_ITEM_TAG, {
  props: {
    checked: prop.bool(false),
    disabled: prop.bool(false),
    type: prop.oneOf(ORE_MENU_ITEM_TYPES),
    value: prop.string(),
  },
  setup(props) {
    const el = getHost();
    // A grid menu restyles its items as cards. The layout cannot reach them through CSS alone
    // (a shadow rule cannot select a slotted child's internals), so the menu provides it as
    // context and the item marks its own row: the same channel ore-button-group uses for
    // color/size/variant. Standalone items inject `undefined` and stay a list row.
    const menuCtx = inject(MENU_CTX);
    const slots = useSlots();
    const hasEnd = () => slots.has('end').value;
    const isGrid = () => menuCtx?.layout.value === 'grid';
    const isCheckable = () => props.type.value === 'checkbox' || props.type.value === 'radio';
    const isChecked = () => isCheckable() && props.checked.value;
    const itemRole = () => {
      if (props.type.value === 'checkbox') return 'menuitemcheckbox';

      if (props.type.value === 'radio') return 'menuitemradio';

      return 'menuitem';
    };
    const itemClass = () => {
      const type = props.type.value;

      return [
        'item',
        isGrid() ? 'is-grid' : '',
        type === 'checkbox' ? 'is-checkbox' : '',
        type === 'radio' ? 'is-radio' : '',
        isChecked() ? 'is-checked' : '',
      ]
        .filter(Boolean)
        .join(' ');
    };
    // `aria-checked` belongs only to the checkable roles; a plain menuitem with it is invalid ARIA,
    // so null (attribute removed) is the plain item's value.
    const ariaChecked = () => (isCheckable() ? String(isChecked()) : null);

    // `bothAxes`: a grid card clamps its label to two lines, and a line clamp reports overflow
    // on the block axis, not the inline one. Harmless in list rows, which clip horizontally.
    const labelRef = truncationRevealRef({ bothAxes: true });

    // ── Submenu ────────────────────────────────────────────────────────────────
    //
    // An item becomes a submenu trigger the moment content is slotted into its `submenu` slot: it
    // owns a flyout panel (a second menu surface) and nothing else changes. The panel lives in the
    // Popover API top layer, exactly like `ore-tooltip`, because the parent `.menu-panel` both
    // transforms (a containing block that would trap a `position: fixed` descendant) and scrolls
    // (which would clip one). The top layer escapes both.
    const rootCtx = inject(MENU_ROOT_CTX);
    const groupCtx = inject(SUBMENU_GROUP_CTX);
    const abortSignal = lifecycleSignal(onCleanup);

    // This item's own slotted children are a sibling group too, so a nested flyout closes its
    // siblings rather than the root's. Nearest provider wins, so this shadows the menu's group for
    // anything slotted into this item.
    provide(SUBMENU_GROUP_CTX, {
      closeOthers: (current) => {
        for (const child of getOwnedItems(el)) {
          if (child !== current) (child as OreMenuItemElement).hideSubmenu?.();
        }
      },
    });

    const hasSubmenu = signal(false);
    const submenuOpen = signal(false);
    let submenuPanel: HTMLElement | null = null;
    let stopSubmenuPositioning: (() => void) | null = null;
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;

    const focusableOf = (node: HTMLElement): HTMLElement | null =>
      node.shadowRoot?.querySelector<HTMLElement>('[role^="menuitem"]') ?? node;

    const submenuPositioner = createDropdownPositioner({
      getFloating: () => submenuPanel,
      getOffsetPx: () => 0,
      // A submenu flies out on the inline-end edge; the positioner mirrors only start/end suffixes,
      // so the axis flip for RTL is chosen here from the item's own direction.
      getPlacement: () => (elementDirection(el) === 'rtl' ? 'left-start' : 'right-start'),
      getReference: () => el,
      matchWidth: false,
      onPlacementChange: (placement) => submenuPanel?.setAttribute('data-placement', placement),
      padding: 6,
      // The panel is in the top layer, so no scroll container clips it: constrain to the viewport.
      useClippingAncestor: false,
    });

    const submenuList = createListControl<HTMLElement>({
      disabled: computed(() => !submenuOpen.value),
      getItems: () => getOwnedItems(el).filter((item) => !item.hasAttribute('disabled')),
      isItemDisabled: (item) => item.hasAttribute('disabled'),
      onNavigate: ({ item }) => focusableOf(item)?.focus(),
      orientation: 'vertical',
      signal: abortSignal,
    });

    const clearTimers = (): void => {
      if (openTimer !== undefined) clearTimeout(openTimer);
      if (closeTimer !== undefined) clearTimeout(closeTimer);
      openTimer = undefined;
      closeTimer = undefined;
    };

    const focusFirstSubmenuItem = (): void => {
      const first = getOwnedItems(el).find((item) => !item.hasAttribute('disabled'));

      if (first) focusableOf(first)?.focus();
    };

    const openSubmenu = (focusFirst: boolean): void => {
      if (!hasSubmenu.value || props.disabled.value || submenuOpen.value) return;

      // Only one submenu per sibling group stays open; ancestors are untouched, matching native menus.
      groupCtx?.closeOthers(el);

      submenuOpen.value = true;

      if (submenuPanel) {
        submenuPanel.dataset.open = '';

        if ('showPopover' in submenuPanel) {
          try {
            if (!submenuPanel.matches(':popover-open')) submenuPanel.showPopover();
          } catch {
            // Popover API restricted (sandboxed iframe); the data-open CSS fallback still shows it.
          }
        }
      }

      submenuPositioner.update();
      stopSubmenuPositioning = submenuPositioner.startAutoUpdate?.() ?? null;

      if (focusFirst) requestAnimationFrame(focusFirstSubmenuItem);
    };

    const closeSubmenu = (restoreFocusToItem: boolean): void => {
      if (!submenuOpen.value) return;

      // Capture before hiding: hiding blurs a focused descendant, and the caller needs to know
      // whether focus was inside to decide where it lands.
      //
      // `submenuPanel.contains(...)` cannot answer this: the flyout's children are slotted, so they
      // live in this item's *light* DOM while the panel div lives in its shadow root — the two are
      // siblings in different trees and neither contains the other. `document.activeElement` also
      // retargets to the slotted host rather than the row focused inside it. So the question is
      // asked the way ownership is actually defined: is the active element one of this item's own
      // submenu items (or nested inside one)?
      const active = document.activeElement;
      const hadFocus =
        active instanceof HTMLElement && getOwnedItems(el).some((item) => item === active || item.contains(active));

      submenuOpen.value = false;

      if (submenuPanel) {
        delete submenuPanel.dataset.open;

        if ('hidePopover' in submenuPanel) {
          try {
            if (submenuPanel.matches(':popover-open')) submenuPanel.hidePopover();
          } catch {
            // Popover API restricted; removing data-open hides it via CSS.
          }
        }
      }

      stopSubmenuPositioning?.();
      stopSubmenuPositioning = null;
      submenuList.reset();

      // Restore only when focus was actually inside: a sibling stealing the slot (closeOthers) or
      // the whole menu closing must not yank focus back to this item.
      if (restoreFocusToItem && hadFocus) restoreFocus(() => focusableOf(el));
    };

    // The imperative handle the owning menu and sibling group use to collapse this flyout.
    (el as OreMenuItemElement).hideSubmenu = () => closeSubmenu(false);

    // A submenu parent is not selectable: its press opens the flyout instead of emitting `select`,
    // so the interaction is intercepted here and stopped before it reaches the menu's activation.
    const submenuPress = createInteraction({
      disabled: props.disabled,
      onPress: () => {
        if (submenuOpen.value) closeSubmenu(true);
        else openSubmenu(true);
      },
    });

    const onItemKeydown = (event: KeyboardEvent): void => {
      if (!hasSubmenu.value || props.disabled.value) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        openSubmenu(true);

        return;
      }

      if (event.key === 'ArrowLeft' && submenuOpen.value) {
        event.preventDefault();
        event.stopPropagation();
        closeSubmenu(true);

        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        submenuPress.handleKeydown(event);
      }
    };

    const onItemClick = (event: MouseEvent): void => {
      if (!hasSubmenu.value || props.disabled.value) return;

      event.stopPropagation();
      submenuPress.handleClick(event);
    };

    const onItemPointerEnter = (): void => {
      // Hovering any item closes a sibling's stale flyout; a submenu parent then opens its own
      // after a short dwell so crossing a row never fires it accidentally.
      groupCtx?.closeOthers(el);
      clearTimers();

      if (!hasSubmenu.value || props.disabled.value || submenuOpen.value) return;

      openTimer = setTimeout(() => openSubmenu(true), SUBMENU_OPEN_DELAY_MS);
    };

    const onItemPointerLeave = (): void => {
      if (openTimer !== undefined) clearTimeout(openTimer);
      openTimer = undefined;

      if (!submenuOpen.value) return;

      closeTimer = setTimeout(() => closeSubmenu(false), SUBMENU_CLOSE_DELAY_MS);
    };

    const onPanelKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' || event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        closeSubmenu(true);

        return;
      }

      // The list tracks its own index, so it must be told where the focus actually is before every
      // key: opening focuses the first child directly, and a pointer click moves focus without
      // touching the index. Same re-seed the parent menu's list navigation does. `document
      // .activeElement` retargets to the host when focus sits in a shadow root, so both the host
      // and its inner row are compared.
      const owned = getOwnedItems(el).filter((item) => !item.hasAttribute('disabled'));
      const focusedIndex = owned.findIndex(
        (item) => item === document.activeElement || focusableOf(item) === document.activeElement,
      );

      if (focusedIndex >= 0) submenuList.set(focusedIndex);

      if (submenuList.handleKeydown(event)) {
        event.stopPropagation();

        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();

        const focused = submenuList.getActiveItem() ?? owned[focusedIndex];
        if (focused) rootCtx?.activateItem(focused);
      }
    };

    const cancelPanelClose = (): void => {
      if (closeTimer !== undefined) clearTimeout(closeTimer);
      closeTimer = undefined;
    };

    const schedulePanelClose = (): void => {
      if (!submenuOpen.value) return;

      cancelPanelClose();
      closeTimer = setTimeout(() => closeSubmenu(false), SUBMENU_CLOSE_DELAY_MS);
    };

    onCleanup(clearTimers);

    return html`
      <div
        class="${itemClass}"
        part="item"
        tabindex="-1"
        role="${itemRole}"
        aria-checked="${ariaChecked}"
        aria-disabled="${props.disabled}"
        aria-haspopup="${() => (hasSubmenu.value ? 'menu' : null)}"
        aria-expanded="${() => (hasSubmenu.value ? String(submenuOpen.value) : null)}"
        @click="${onItemClick}"
        @keydown="${onItemKeydown}"
        @pointerenter="${onItemPointerEnter}"
        @pointerleave="${onItemPointerLeave}">
        ${when(isCheckable, () => html`<span class="item-check" aria-hidden="true"></span>`)}
        <span class="icon-slot" part="icon-slot"><slot name="icon"></slot></span>
        <span class="item-label" part="item-label" ref=${labelRef}><slot></slot></span>
        <span class="end-slot" part="end-slot" ?hidden=${() => !hasEnd()}><slot name="end"></slot></span>
        ${when(
          hasSubmenu,
          () => html`<ore-icon class="submenu-arrow" name="chevron-right" size="1em" aria-hidden="true"></ore-icon>`,
        )}
      </div>

      <div
        class="submenu-panel"
        part="submenu"
        popover="manual"
        role="menu"
        @keydown="${onPanelKeydown}"
        @pointerenter="${cancelPanelClose}"
        @pointerleave="${schedulePanelClose}"
        ref="${(ref: HTMLElement | null) => {
          submenuPanel = ref;
        }}">
        <slot
          name="submenu"
          @slotchange=${(event: Event) => {
            hasSubmenu.value = (event.target as HTMLSlotElement).assignedNodes().length > 0;
            if (!hasSubmenu.value) closeSubmenu(false);
          }}></slot>
      </div>
    `;
  },
  styles: [colorThemeMixin, overlayMotionMixin('menu'), menuItemStyles],
});
