import { createGridNavigation, restoreFocus } from '@vielzeug/focus';
import type { Placement } from '@vielzeug/orbit';
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
  lifecycleSignal,
  type OverlayOpenChangeDetail,
  type OverlayOpenReason,
  parseOptionalBool,
  truncationRevealRef,
} from '../../core';
import { disablableBundle, MENU_SIZE_PRESET, sizableBundle } from '../../shared';
import { colorThemeMixin, forcedColorsMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize } from '../../types';
import componentStyles from './menu.css?inline';
import menuItemStyles from './menu-item.css?inline';
import menuSeparatorStyles from './menu-separator.css?inline';

// ── Types ─────────────────────────────────────────────────────────────

export interface MenuSelectDetail {
  checked?: boolean;
  value: string;
}

export const ORE_MENU_ITEM_TYPES = ['checkbox', 'radio'] as const;
export type OreMenuItemType = (typeof ORE_MENU_ITEM_TYPES)[number];

export const MENU_LAYOUTS = ['grid', 'list'] as const;
export type OreMenuLayout = (typeof MENU_LAYOUTS)[number];

/** Columns per row when `layout` is `grid` and the `columns` prop is unset. */
const DEFAULT_GRID_COLUMNS = 3;

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
};

/** Shared context propagated from `ore-menu` to its slotted `ore-menu-item` children. */
export const MENU_CTX = createContext<{ layout: Readable<OreMenuLayout | undefined> }>('OreMenu');

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
 *
 * @attr {boolean} disabled - Disables opening and keyboard interaction
 * @attr {boolean} open - Controlled open state
 * @attr {boolean} default-open - Initial uncontrolled open state
 * @attr {string} layout - Panel layout: 'list' (default) | 'grid'
 * @attr {number} columns - Columns per row in `grid` layout (default 3)
 * @attr {string} placement - Panel placement: 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end' (default: 'bottom-start')
 * @attr {string} size - Size: 'sm' | 'md' | 'lg'
 *
 * @fires open-change - Fired when the menu state changes. detail: { open, reason }
 * @fires select - Fired when an item is selected. detail: { value: string, checked?: boolean }
 *
 * @slot trigger - Trigger element that toggles menu visibility
 * @slot - Menu content (`<ore-menu-item>` and `<ore-menu-separator>`)
 *
 * @part panel - Floating menu panel container
 *
 * @cssprop --menu-panel-bg - Background of the floating panel
 * @cssprop --menu-panel-border-color - Border color of the floating panel
 * @cssprop --menu-panel-shadow - Box shadow of the floating panel
 * @cssprop --menu-panel-blur - Backdrop blur amount for the floating panel
 * @cssprop --menu-panel-min-width - Minimum width of the floating panel
 * @cssprop --menu-panel-max-height - Maximum height of the floating panel before it scrolls
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
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreMenuEvents>();
    const slots = useSlots();

    // Items restyle themselves as cards through this context: the layout cannot reach a slotted
    // child's shadow internals from here, the same reason ore-button-group provides its own.
    provide(MENU_CTX, { layout: props.layout });

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

    // ── Helpers ───────────────────────────────────────────────────────────────
    function getItems(): HTMLElement[] {
      return Array.from(el.querySelectorAll<HTMLElement>('ore-menu-item:not([disabled])'));
    }

    // Every item, disabled ones included: a grid that skipped them would walk off the row the
    // pointer shows (createGridNavigation documents the same rule).
    function getAllItems(): HTMLElement[] {
      return Array.from(el.querySelectorAll<HTMLElement>('ore-menu-item'));
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
      getFloating: () => panelEl,
      getOffsetPx: () => 4,
      getPlacement: () => (props.placement.value ?? 'bottom-start') as Placement,
      getReference: () => triggerEl,
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
        for (const radio of el.querySelectorAll<HTMLElement>('ore-menu-item[type="radio"]')) {
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

        toggle();
      };
      const onTriggerKeydown = (event: KeyboardEvent) => {
        handleMenuKeydown(event);
      };

      triggerEl.addEventListener('click', onTriggerClick);
      triggerEl.addEventListener('keydown', onTriggerKeydown);
      cleanups.push(() => triggerEl?.removeEventListener('click', onTriggerClick));
      cleanups.push(() => triggerEl?.removeEventListener('keydown', onTriggerKeydown));

      cleanupTrigger = () => {
        removeAria();

        for (const cleanup of cleanups) cleanup();
      };
    }

    rippleWatch(slots.elements('trigger'), resolveTrigger, { immediate: true });

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
  styles: [componentStyles, sizeVariantMixin(MENU_SIZE_PRESET), forcedColorsMixin],
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
 * @element ore-menu-item
 *
 * @attr {boolean} checked - Checked state for `checkbox` and `radio` item types
 * @attr {boolean} disabled - Disables selection and pointer interaction
 * @attr {'checkbox'|'radio'} type - Optional checkable menu item mode
 * @attr {string} value - Value emitted by parent menu on selection
 *
 * @slot - Item label/content
 * @slot icon - Optional leading icon content
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
 * @part icon-slot - Leading icon slot container.
 *
 * @example
 * ```html
 * <ore-menu-item value="edit">Edit</ore-menu-item>
 * <ore-menu-item value="delete" disabled>Delete</ore-menu-item>
 * <ore-menu-item type="checkbox" value="wrap" checked>Word wrap</ore-menu-item>
 * <ore-menu-item type="radio" value="left">Align left</ore-menu-item>
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
    // A grid menu restyles its items as cards. The layout cannot reach them through CSS alone
    // (a shadow rule cannot select a slotted child's internals), so the menu provides it as
    // context and the item marks its own row: the same channel ore-button-group uses for
    // color/size/variant. Standalone items inject `undefined` and stay a list row.
    const menuCtx = inject(MENU_CTX);
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

    return html`
      <div
        class="${itemClass}"
        part="item"
        tabindex="-1"
        role="${itemRole}"
        aria-checked="${ariaChecked}"
        aria-disabled="${props.disabled}">
        ${when(isCheckable, () => html`<span class="item-check" aria-hidden="true"></span>`)}
        <span class="icon-slot" part="icon-slot"><slot name="icon"></slot></span>
        <span class="item-label" part="item-label" ref=${labelRef}><slot></slot></span>
      </div>
    `;
  },
  styles: [colorThemeMixin, menuItemStyles],
});
