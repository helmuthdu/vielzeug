import {
  computed,
  createId,
  css,
  define,
  effect,
  html,
  prop,
  signal,
  watch,
  onMounted,
  syncAria,
} from '@vielzeug/craftit';
import {
  createPopupListControl,
  createPressControl,
  type OverlayCloseDetail,
  type OverlayOpenDetail,
} from '@vielzeug/craftit/controls';
import { flip, offset, positionFloat, shift } from '@vielzeug/floatit';

import type { ComponentSize, ThemeColor } from '../../types';

import { disablableBundle, sizableBundle, themableBundle } from '../../inputs/shared/bundles';
import { coarsePointerMixin, colorThemeMixin, forcedColorsMixin, sizeVariantMixin } from '../../styles';
import componentStyles from './menu.css?inline';

// ============================================
// Types
// ============================================
export interface MenuSelectDetail {
  value: string;
  checked?: boolean;
}

export type BitMenuItemType = 'checkbox' | 'radio';

export type BitMenuEvents = {
  close: OverlayCloseDetail;
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

// ============================================
// Styles
// ============================================

const themeStyles = /* css */ css`
  ${colorThemeMixin}
  ${sizeVariantMixin}
  ${forcedColorsMixin}
`;

// ============================================
// Menu Item Component
// ============================================

const menuItemProps = {
  checked: false,
  disabled: false,
  type: undefined,
  value: undefined,
};

export const MENU_ITEM_TAG = define<BitMenuItemProps>('bit-menu-item', {
  props: menuItemProps,
  setup(props) {
    const isCheckable = () => props.type.value === 'checkbox' || props.type.value === 'radio';
    const isChecked = () => isCheckable() && props.checked.value;
    const itemRole = () => {
      if (props.type.value === 'checkbox') return 'menuitemcheckbox';

      if (props.type.value === 'radio') return 'menuitemradio';

      return 'menuitem';
    };
    const checkIndicator = () => {
      if (props.type.value === 'checkbox') return props.checked.value ? '☑' : '☐';

      if (props.type.value === 'radio') return props.checked.value ? '◉' : '◯';

      return '';
    };

    return () => html`
      <style>
        @layer buildit.base {
          :host {
            display: block;
            outline: none;
          }

          .item {
            align-items: center;
            border-radius: 0;
            cursor: pointer;
            display: flex;
            font-size: var(--text-sm);
            gap: var(--size-2);
            line-height: var(--leading-normal);
            padding: var(--size-1-5) var(--size-3);
            transition:
              background var(--transition-fast),
              color var(--transition-fast);
            user-select: none;
            white-space: nowrap;
          }

          :host(:first-of-type) .item {
            border-radius: var(--rounded-sm) var(--rounded-sm) 0 0;
          }

          :host(:last-child) .item {
            border-radius: 0 0 var(--rounded-sm) var(--rounded-sm);
          }

          :host(:first-of-type:last-child) .item {
            border-radius: var(--rounded-sm);
          }

          :host(:not([disabled])) .item:hover {
            background: var(--color-contrast-100);
          }

          :host(:focus-visible) .item {
            background: color-mix(in srgb, var(--color-primary) 12%, var(--color-contrast-100));
            color: var(--color-primary);
          }

          /* Driven by JS via sync() — avoids :host() attribute selector edge-cases */
          .item.is-checkable {
            background: color-mix(in srgb, var(--color-contrast-900) 5%, var(--color-canvas));
          }

          .item.is-checked {
            background: color-mix(in srgb, var(--color-primary) 18%, var(--color-canvas));
            color: var(--color-primary);
            font-weight: var(--font-medium);
          }

          :host([disabled]) .item {
            color: var(--color-contrast-400);
            cursor: not-allowed;
            opacity: 0.6;
            pointer-events: none;
          }

          .icon-slot {
            display: contents;
          }

          .item-check {
            align-items: center;
            color: currentColor;
            display: inline-flex;
            flex-shrink: 0;
            justify-content: center;
            width: 1.25rem;
          }

          .item-label {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
        ${coarsePointerMixin}
      </style>
      ${() =>
        isCheckable()
          ? html`
              <div
                class="${() => `item${isCheckable() ? ' is-checkable' : ''}${isChecked() ? ' is-checked' : ''}`}"
                tabindex="-1"
                role="${itemRole}"
                aria-checked="${() => String(isChecked())}"
                aria-disabled="${props.disabled}">
                <span class="item-check" aria-hidden="true">${checkIndicator}</span>
                <span class="icon-slot"><slot name="icon"></slot></span>
                <span class="item-label"><slot></slot></span>
              </div>
            `
          : html`
              <div class="item" tabindex="-1" role="menuitem" aria-disabled="${props.disabled}">
                <span class="icon-slot"><slot name="icon"></slot></span>
                <span class="item-label"><slot></slot></span>
              </div>
            `}
    `;
  },
});

// ============================================
// Menu Separator
// ============================================

export const SEPARATOR_TAG = define('bit-menu-separator', {
  setup() {
    return () =>
      html`<style>
        @layer buildit.base {
          :host {
            display: block;
            margin: var(--size-1) 0;
            border-top: var(--border) solid var(--color-contrast-200);
          }
        }
      </style>`;
  },
});

// ============================================
// Menu Component
// ============================================

const isCheckableItemType = (value: string | null): value is BitMenuItemType =>
  value === 'checkbox' || value === 'radio';

/**
 * `bit-menu` — Action dropdown menu triggered by a slotted trigger element.
 * Nest `<bit-menu-item>` elements inside for menu options.
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
  setup(props, { emit, host, slots }) {
    const menuId = createId('menu');
    const isOpenSignal = signal(false);
    const isDisabled = computed(() => Boolean(props.disabled.value));
    let triggerEl: HTMLElement | null = null;
    let panelEl: HTMLElement | null = null;
    let cleanupTrigger: (() => void) | null = null;

    // ── Helpers ───────────────────────────────────────────────────────────────
    function getItems(): HTMLElement[] {
      return Array.from(host.el.querySelectorAll<HTMLElement>('bit-menu-item:not([disabled])'));
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

    let focusedIndex = -1;

    function updatePosition() {
      if (!panelEl || !triggerEl) return;

      positionFloat(triggerEl, panelEl, {
        middleware: [offset(4), flip({ padding: 6 }), shift({ padding: 6 })],
        placement: props.placement.value,
      });
    }

    const triggerRef = { value: null as HTMLElement | null };

    const popupList = createPopupListControl({
      ariaSync: { role: 'menu' },
      getBoundaryElement: () => host.el,
      getIndex: () => focusedIndex,
      getItems: getItems,
      getPanelElement: () => panelEl,
      getTriggerElement: () => triggerEl,
      isDisabled: () => isDisabled.value,
      isItemDisabled: (item) => item.hasAttribute('disabled'),
      isOpen: () => isOpenSignal.value,
      listId: menuId,
      onClose: (reason) => emit('close', { reason }),
      onOpen: (reason) => emit('open', { reason }),
      positioner: {
        floating: () => panelEl,
        reference: () => triggerEl,
        update: updatePosition,
      },
      setIndex: (index) => {
        focusedIndex = index;

        const nextItem = getItems()[index];

        getItemFocusable(nextItem)?.focus();
      },
      setOpen: (next) => {
        isOpenSignal.value = next;
      },
      triggerRef,
    });

    const activateItem = (item: HTMLElement): void => {
      const type = item.getAttribute('type');
      const isCheckable = isCheckableItemType(type);

      if (type === 'checkbox') {
        item.toggleAttribute('checked', !item.hasAttribute('checked'));
      } else if (type === 'radio') {
        for (const radio of host.el.querySelectorAll<HTMLElement>('bit-menu-item[type="radio"]')) {
          radio.toggleAttribute('checked', radio === item);
        }
      }

      const value = item.getAttribute('value') ?? '';
      const checked = isCheckable ? item.hasAttribute('checked') : undefined;

      emit('select', { checked, value });

      if (!isCheckable) {
        popupList.close('programmatic');
      }
    };

    const openFromKeyboardPress = createPressControl({
      keys: ['Enter', ' ', 'ArrowDown'],
      onPress: () => {
        popupList.open('trigger');
        requestAnimationFrame(() => popupList.first());
      },
    });

    const activateFocusedFromKeyboardPress = createPressControl({
      onPress: () => {
        const focused = popupList.getActiveItem();

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

      if (currentFocusedIndex >= 0) focusedIndex = currentFocusedIndex;

      if (popupList.handleListKeydown(e)) return;

      // When open: navigate and activate
      if (e.key === ' ' || e.key === 'Enter') {
        activateFocusedFromKeyboardPress.handleKeydown(e);

        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        popupList.close('escape');

        return;
      }

      if (e.key === 'Tab') {
        popupList.close('programmatic');
      }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    host.bind({
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
      triggerRef.value = triggerEl;

      if (!triggerEl) return;

      const cleanups: Array<() => void> = [];
      const removeAria = syncAria(triggerEl, {
        controls: () => menuId,
        expanded: () => String(isOpenSignal.value),
        haspopup: 'menu',
      });

      const onTriggerClick = (event: MouseEvent) => {
        event.stopPropagation();

        if (isDisabled.value) return;

        popupList.toggle();
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
        triggerRef.value = null;
      };
    });

    return () => html`
      <slot name="trigger"></slot>
      <div
        class="menu-panel"
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
  styles: [componentStyles, themeStyles],
});
