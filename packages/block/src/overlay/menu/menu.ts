import type { Placement } from '@vielzeug/orbit';

import { computed, define, effect, html, onMounted, prop, syncAria, watch } from '@vielzeug/craft';

import type { ComponentSize, ThemeColor } from '../../types';

import {
  createInteraction,
  createOptionList,
  createStableId,
  type DropdownCloseReason,
  type OverlayOpenDetail,
} from '../../headless';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared/config';
import { colorThemeMixin, forcedColorsMixin, sizeVariantMixin } from '../../styles';
import menuItemStyles from './menu-item.css?inline';
import menuSeparatorStyles from './menu-separator.css?inline';
import componentStyles from './menu.css?inline';

// ── Types ─────────────────────────────────────────────────────────────

export interface MenuSelectDetail {
  value: string;
  checked?: boolean;
}

export type BitMenuItemType = 'checkbox' | 'radio';

export type BitMenuEvents = {
  close: { reason: DropdownCloseReason };
  open: OverlayOpenDetail;
  select: MenuSelectDetail;
};

export type BitMenuItemProps = {
  checked?: boolean;
  disabled?: boolean;
  type?: BitMenuItemType;
  value?: string;
};

export type BitMenuProps = {
  color?: ThemeColor;
  disabled?: boolean;
  placement?: 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end';
  size?: ComponentSize;
};

// ── Styles ─────────────────────────────────────────────────────────────

// ── Menu Item Component ─────────────────────────────────────────────────────────────

/**
 * A selectable action item used inside `<bit-menu>`.
 *
 * @element bit-menu-item
 *
 * @attr {boolean} checked - Checked state for `checkbox` and `radio` item types
 * @attr {boolean} disabled - Disables selection and pointer interaction
 * @attr {'checkbox'|'radio'} type - Optional checkable menu item mode
 * @attr {string} value - Value emitted by parent menu on selection
 *
 * @slot - Item label/content
 * @slot icon - Optional leading icon content
 */
export const MENU_ITEM_TAG = define<BitMenuItemProps>('bit-menu-item', {
  props: {
    checked: prop.bool(false),
    disabled: prop.bool(false),
    type: prop.string<BitMenuItemType>(),
    value: prop.string(),
  },
  setup(props) {
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
        type === 'checkbox' ? 'is-checkbox' : '',
        type === 'radio' ? 'is-radio' : '',
        isChecked() ? 'is-checked' : '',
      ]
        .filter(Boolean)
        .join(' ');
    };

    return isCheckable()
      ? html`
          <div
            class="${itemClass}"
            tabindex="-1"
            role="${itemRole}"
            aria-checked="${() => String(isChecked())}"
            aria-disabled="${props.disabled}">
            <span class="item-check" aria-hidden="true">${() => (isChecked() ? '☑' : '☐')}</span>
            <span class="icon-slot"><slot name="icon"></slot></span>
            <span class="item-label"><slot></slot></span>
          </div>
        `
      : html`
          <div class="item" tabindex="-1" role="menuitem" aria-disabled="${props.disabled}">
            <span class="icon-slot"><slot name="icon"></slot></span>
            <span class="item-label"><slot></slot></span>
          </div>
        `;
  },
  styles: [menuItemStyles],
});

// ── Menu Separator ─────────────────────────────────────────────────────────────

/**
 * Visual separator used to group menu items.
 *
 * @element bit-menu-separator
 */
export const SEPARATOR_TAG = define('bit-menu-separator', {
  setup() {
    return html``;
  },
  styles: [menuSeparatorStyles],
});

// ── Menu Component ─────────────────────────────────────────────────────────────

const isCheckableItemType = (value: string | null): value is BitMenuItemType =>
  value === 'checkbox' || value === 'radio';

/**
 * Action dropdown menu triggered by a slotted trigger element.
 *
 * @element bit-menu
 *
 * @attr {string} color - Theme color variant for menu styling
 * @attr {boolean} disabled - Disables opening and keyboard interaction
 * @attr {string} placement - Floating panel placement around the trigger
 * @attr {string} size - Size variant propagated to menu styling tokens
 *
 * @fires open - Fired when the menu opens (`detail.reason` explains source)
 * @fires close - Fired when the menu closes (`detail.reason` explains source)
 * @fires select - Fired when an item is selected (`detail.value`, optional `detail.checked`)
 *
 * @slot trigger - Trigger element that toggles menu visibility
 * @slot - Menu content (`<bit-menu-item>` and `<bit-menu-separator>`)
 *
 * @part panel - Floating menu panel container
 *
 * @cssprop --menu-panel-bg - Background of the floating panel
 * @cssprop --menu-panel-border-color - Border color of the floating panel
 * @cssprop --menu-panel-shadow - Box shadow of the floating panel
 * @cssprop --menu-panel-blur - Backdrop blur amount for the floating panel
 * @cssprop --menu-panel-min-width - Minimum width of the floating panel
 * @cssprop --menu-panel-radius - Border radius of the floating panel
 *
 * @example
 * ```html
 * <bit-menu>
 *   <button slot="trigger">Actions</button>
 *   <bit-menu-item value="edit">Edit</bit-menu-item>
 *   <bit-menu-item value="delete">Delete</bit-menu-item>
 * </bit-menu>
 * ```
 */
export const MENU_TAG = define<BitMenuProps, BitMenuEvents>('bit-menu', {
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    placement: prop.oneOf(
      ['bottom', 'bottom-start', 'bottom-end', 'top', 'top-start', 'top-end'] as const,
      'bottom-start',
    ),
  },
  setup(props, { bind, el, emit, slots }) {
    const menuId = createStableId('menu');
    const isDisabled = computed(() => Boolean(props.disabled.value));
    let triggerEl: HTMLElement | null = null;
    let panelEl: HTMLElement | null = null;
    let cleanupTrigger: (() => void) | null = null;

    // ── Helpers ───────────────────────────────────────────────────────────────
    function getItems(): HTMLElement[] {
      return Array.from(el.querySelectorAll<HTMLElement>('bit-menu-item:not([disabled])'));
    }

    function getItemFocusable(item: HTMLElement | null | undefined): HTMLElement | null {
      if (!item) return null;

      return item.shadowRoot?.querySelector<HTMLElement>('[role^="menuitem"]') ?? item;
    }

    function getFocusedItemIndex(): number {
      const items = getItems();

      return items.findIndex((item) => {
        const focusable = getItemFocusable(item);

        return item === document.activeElement || focusable === document.activeElement;
      });
    }

    const optionList = createOptionList<HTMLElement>({
      getBoundary: () => el,
      getItems: getItems,
      getPanel: () => panelEl,
      getReference: () => triggerEl,
      getTrigger: () => triggerEl,
      isDisabled: () => isDisabled.value,
      isItemDisabled: (item) => item.hasAttribute('disabled'),
      // syncAria on the slotted trigger element handles aria-expanded, aria-controls,
      // aria-haspopup, and aria-disabled — opt out of duplicate management here.
      manageAriaExpanded: false,
      onClose: (reason) => emit('close', { reason }),
      onNavigate: (_action, index) => {
        const nextItem = getItems()[index];

        getItemFocusable(nextItem)?.focus();
      },
      onOpen: (reason) => emit('open', { reason }),
      positionerOptions: {
        getPlacement: () => (props.placement.value ?? 'bottom-start') as Placement,
        matchWidth: false,
        offsetPx: 4,
        padding: 6,
      },
    });
    const { isOpen: isOpenSignal } = optionList;

    const activateItem = (item: HTMLElement): void => {
      const type = item.getAttribute('type');
      const isCheckable = isCheckableItemType(type);

      if (type === 'checkbox') {
        item.toggleAttribute('checked', !item.hasAttribute('checked'));
      } else if (type === 'radio') {
        for (const radio of el.querySelectorAll<HTMLElement>('bit-menu-item[type="radio"]')) {
          radio.toggleAttribute('checked', radio === item);
        }
      }

      const value = item.getAttribute('value') ?? '';
      const checked = isCheckable ? item.hasAttribute('checked') : undefined;

      emit('select', { checked, value });

      if (!isCheckable) {
        optionList.close('programmatic');
      }
    };

    const openFromKeyboardPress = createInteraction({
      keys: ['Enter', ' ', 'ArrowDown'],
      onPress: () => {
        optionList.open('keyboard');
        requestAnimationFrame(() => optionList.first());
      },
    });

    const activateFocusedFromKeyboardPress = createInteraction({
      onPress: () => {
        const focused = optionList.getActiveItem();

        if (focused) activateItem(focused);
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

      const currentFocusedIndex = getFocusedItemIndex();

      if (currentFocusedIndex >= 0) optionList.set(currentFocusedIndex);

      if (optionList.handleKeydown(e)) return;

      // When open: navigate and activate
      if (e.key === ' ' || e.key === 'Enter') {
        activateFocusedFromKeyboardPress.handleKeydown(e);

        return;
      }

      if (e.key === 'Tab') {
        optionList.close('programmatic');
      }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    bind({
      on: {
        click: (e: MouseEvent) => {
          const path = e.composedPath();

          if (!isOpenSignal.value) return;

          const itemFromPath = path.find(
            (node): node is HTMLElement => node instanceof HTMLElement && node.tagName === 'BIT-MENU-ITEM',
          );
          const item = itemFromPath ?? (e.target as HTMLElement | null)?.closest<HTMLElement>('bit-menu-item') ?? null;

          if (!item || item.hasAttribute('disabled')) return;

          activateItem(item);
        },
      },
    });

    effect(() => {
      const open = isOpenSignal.value;

      if (!panelEl) return;

      panelEl.toggleAttribute('data-open', open);
    });

    function resolveTrigger() {
      cleanupTrigger?.();
      cleanupTrigger = null;

      const assigned = slots.elements('trigger').value;

      triggerEl = (assigned?.[0] as HTMLElement | undefined) ?? null;

      if (!triggerEl) return;

      const cleanups: Array<() => void> = [];
      const removeAria = syncAria(triggerEl, {
        controls: () => menuId,
        disabled: () => isDisabled.value,
        expanded: () => String(isOpenSignal.value),
        haspopup: 'menu',
      });

      const onTriggerClick = (event: MouseEvent) => {
        event.stopPropagation();

        if (isDisabled.value) return;

        optionList.toggle();
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

    watch(slots.elements('trigger'), resolveTrigger, { immediate: true });

    onMounted(() => {
      return () => {
        cleanupTrigger?.();
        cleanupTrigger = null;
        optionList.cleanup();
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
        @keydown="${handleMenuKeydown}"
        ref="${(el: HTMLElement | null) => {
          panelEl = el;
        }}">
        <slot></slot>
      </div>
    `;
  },
  styles: [componentStyles, colorThemeMixin, sizeVariantMixin(), forcedColorsMixin],
});
