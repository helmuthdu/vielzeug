import {
  aria,
  createId,
  css,
  defineComponent,
  effect,
  handle,
  html,
  onMount,
  onSlotChange,
  signal,
} from '@vielzeug/craftit';
import { createListNavigation, createOverlayControl } from '@vielzeug/craftit/labs';
import { flip, offset, positionFloat, shift } from '@vielzeug/floatit';

import type { AddEventListeners, ComponentSize, ThemeColor } from '../../types';

import { coarsePointerMixin, colorThemeMixin, forcedColorsMixin, sizeVariantMixin } from '../../styles';

// ============================================
// Types
// ============================================

export interface MenuItemSelectDetail {
  value: string;
  checked?: boolean;
  originalEvent?: Event;
}

type MenuOpenReason = 'programmatic' | 'toggle' | 'trigger';

type MenuCloseReason = 'escape' | 'outside-click' | 'programmatic' | 'toggle';

export type BitMenuEvents = {
  'bit-close': { reason: MenuCloseReason };
  'bit-open': { reason: MenuOpenReason };
  'bit-select': { checked?: boolean; originalEvent?: Event; value: string | undefined };
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

import componentStyles from './menu.css?inline';

const themeStyles = /* css */ css`
  ${colorThemeMixin}
  ${sizeVariantMixin}
  ${forcedColorsMixin}
`;

// ============================================
// Menu Item Component
// ============================================

export type BitMenuItemProps = {
  /** Whether the checkable item is currently checked */
  checked?: boolean;
  disabled?: boolean;
  /** 'checkbox' | 'radio' — makes this a checkable item */
  type?: 'checkbox' | 'radio';
  value?: string;
};

export const MENU_ITEM_TAG = defineComponent<BitMenuItemProps>({
  props: {
    checked: { default: false },
    disabled: { default: false },
    type: { default: undefined },
    value: { default: '' },
  },
  setup({ host, props }) {
    const itemStyles = /* css */ css`
    @layer buildit.base {
      :host {
        display: block;
      }

      .item {
        align-items: center;
        border-radius: var(--rounded-sm);
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
        min-height: var(--_touch-target);
      }

      .item:not([data-focused]):hover {
        background: var(--color-contrast-100);
      }

      .item[data-focused] {
        background: color-mix(in srgb, var(--color-primary) 12%, var(--color-contrast-100));
        color: var(--color-primary);
      }

      :host([disabled]) .item {
        color: var(--color-contrast-400);
        cursor: not-allowed;
        opacity: 0.6;
        pointer-events: none;
      }

      /* Checkable items */
      .item-check {
        align-items: center;
        display: inline-flex;
        flex-shrink: 0;
        margin-inline-start: auto;
        opacity: 0;
        transition: opacity var(--transition-fast);
        width: var(--size-4);
      }

      :host([checked]) .item-check,
      :host([type='checkbox'][checked]) .item-check,
      :host([type='radio'][checked]) .item-check {
        opacity: 1;
      }

      .icon-slot {
        display: contents;
      }

      .item-label {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

    }
  }

  ${coarsePointerMixin}
`;
    const isFocused = signal(false);

    onMount(() => {
      const itemEl = host.shadowRoot?.querySelector('.item') as HTMLElement | null;

      if (itemEl) {
        effect(() => {
          if (isFocused.value) {
            itemEl.setAttribute('data-focused', '');
          } else {
            itemEl.removeAttribute('data-focused');
          }

          itemEl.setAttribute('aria-disabled', String(Boolean(props.disabled.value)));

          // Checkable role & aria
          const type = props.type.value;

          if (type === 'checkbox') {
            itemEl.setAttribute('role', 'menuitemcheckbox');
            itemEl.setAttribute('aria-checked', String(Boolean(props.checked.value)));
          } else if (type === 'radio') {
            itemEl.setAttribute('role', 'menuitemradio');
            itemEl.setAttribute('aria-checked', String(Boolean(props.checked.value)));
          } else {
            itemEl.setAttribute('role', 'menuitem');
            itemEl.removeAttribute('aria-checked');
          }
        });
      }
    });

    const checkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

    return html`
      <style>
        ${itemStyles}
      </style>
      <div class="item" role="menuitem" tabindex="-1">
        <span class="icon-slot"><slot name="icon"></slot></span>
        <span class="item-label"><slot></slot></span>
        <span class="item-check" aria-hidden="true">${checkSvg}</span>
      </div>
    `;
  },
  tag: 'bit-menu-item',
});

// ============================================
// Menu Separator
// ============================================

export const SEPARATOR_TAG = defineComponent({
  setup() {
    const sepStyles = /* css */ css`
      @layer buildit.base {
        :host {
          display: block;
          margin: var(--size-1) 0;
          border-top: var(--border) solid var(--color-contrast-200);
        }
      }
    `;

    return html`<style>
      ${sepStyles}
    </style>`;
  },
  tag: 'bit-menu-separator',
});

// ============================================
// Menu Component
// ============================================

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
export const MENU_TAG = defineComponent<BitMenuProps, BitMenuEvents>({
  props: {
    color: { default: undefined },
    disabled: { default: false },
    placement: { default: 'bottom-start' },
    size: { default: undefined },
  },
  setup({ emit, host, props }) {
    const menuId = createId('menu');
    const isOpen = signal(false);
    const focusedIndex = signal(-1);
    let triggerEl: HTMLElement | null = null;
    let panelEl: HTMLElement | null = null;

    // ── Helpers ───────────────────────────────────────────────────────────────
    function getItems(): HTMLElement[] {
      return Array.from(host.querySelectorAll<HTMLElement>('bit-menu-item:not([disabled])'));
    }

    const listNavigation = createListNavigation<HTMLElement>({
      getIndex: () => focusedIndex.value,
      getItems,
      isItemDisabled: (item) => item.hasAttribute('disabled'),
      setIndex: (index) => {
        focusedIndex.value = index;
        getItems()[index]?.focus();
      },
    });

    function updatePosition() {
      if (!panelEl || !triggerEl) return;

      positionFloat(triggerEl, panelEl, {
        middleware: [offset(4), flip({ padding: 6 }), shift({ padding: 6 })],
        placement: props.placement.value,
      });
    }

    const overlay = createOverlayControl({
      getBoundaryElement: () => host,
      getPanelElement: () => panelEl,
      getTriggerElement: () => triggerEl,
      isDisabled: () => Boolean(props.disabled.value),
      isOpen: () => isOpen.value,
      onClose: (reason) => emit('bit-close', { reason }),
      onOpen: (reason) => emit('bit-open', { reason }),
      positioner: {
        floating: () => panelEl,
        reference: () => triggerEl,
        update: updatePosition,
      },
      setOpen: (next, _context) => {
        isOpen.value = next;

        if (!next) listNavigation.reset();
      },
    });

    const activateItem = (item: HTMLElement, originalEvent: Event): void => {
      const value = item.getAttribute('value') ?? '';
      const type = item.getAttribute('type');
      let checked: boolean | undefined;

      if (type === 'checkbox') {
        const next = !item.hasAttribute('checked');

        if (next) item.setAttribute('checked', '');
        else item.removeAttribute('checked');

        checked = next;
      } else if (type === 'radio') {
        for (const radio of host.querySelectorAll<HTMLElement>('bit-menu-item[type="radio"]')) {
          radio.removeAttribute('checked');
        }

        item.setAttribute('checked', '');
        checked = true;
      }

      emit('bit-select', { checked, originalEvent, value });

      if (type !== 'checkbox' && type !== 'radio') {
        overlay.close({ reason: 'programmatic' });
      }
    };

    // ── Open / Close ──────────────────────────────────────────────────────────
    function open() {
      overlay.open();

      requestAnimationFrame(() => {
        listNavigation.first();
      });
    }

    function toggleMenu() {
      overlay.toggle();
    }

    // ── Keyboard Navigation ───────────────────────────────────────────────────
    function handleKeydown(e: KeyboardEvent) {
      if (!isOpen.value) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          open();
        }

        return;
      }

      switch (e.key) {
        case ' ':
        case 'Enter': {
          e.preventDefault();

          const focused = listNavigation.getActiveItem();

          if (focused) {
            activateItem(focused, e);
          }

          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          listNavigation.next();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          listNavigation.prev();
          break;
        }
        case 'End':
          e.preventDefault();
          listNavigation.last();
          break;
        case 'Escape':
          e.preventDefault();
          overlay.close({ reason: 'escape' });
          break;
        case 'Home':
          e.preventDefault();
          listNavigation.first();
          break;
        case 'Tab':
          overlay.close({ reason: 'programmatic' });
          break;
      }
    }
    // ── Lifecycle ─────────────────────────────────────────────────────────────
    onMount(() => {
      const triggerSlot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');

      panelEl = host.shadowRoot?.querySelector<HTMLElement>('.menu-panel') ?? null;

      // Resolve trigger element from slot
      let prevTriggerEl: HTMLElement | null = null;

      function resolveTrigger() {
        if (prevTriggerEl) {
          prevTriggerEl.removeEventListener('click', toggleMenu);
          prevTriggerEl.removeEventListener('keydown', handleKeydown);
        }

        const assigned = triggerSlot?.assignedElements({ flatten: true });

        triggerEl = (assigned?.[0] as HTMLElement | undefined) ?? null;
        prevTriggerEl = triggerEl;

        if (triggerEl) {
          aria(triggerEl, {
            controls: () => menuId,
            disabled: () => props.disabled.value,
            expanded: () => (isOpen.value ? 'true' : 'false'),
            haspopup: 'menu',
          });
          triggerEl.addEventListener('click', toggleMenu);
          triggerEl.addEventListener('keydown', handleKeydown);
        }
      }
      onSlotChange('trigger', resolveTrigger);

      // Handle item clicks (event delegation on host)
      const handleItemClick = (e: MouseEvent) => {
        const item = (e.target as HTMLElement)?.closest<HTMLElement>('bit-menu-item');

        if (item && !item.hasAttribute('disabled')) {
          activateItem(item, e);
        }
      };

      handle(host, 'click', handleItemClick);

      const removeOutsideClick = overlay.bindOutsideClick(document);

      effect(() => {
        panelEl?.toggleAttribute('data-open', isOpen.value);
      });

      handle(panelEl, 'keydown', handleKeydown as EventListener);

      return () => {
        removeOutsideClick();

        if (prevTriggerEl) {
          prevTriggerEl.removeEventListener('click', toggleMenu);
          prevTriggerEl.removeEventListener('keydown', handleKeydown);
        }
      };
    });

    return html`
      <style>
        ${componentStyles}${themeStyles}
      </style>
      <slot name="trigger"></slot>
      <div class="menu-panel" id="${menuId}" role="menu" aria-orientation="vertical">
        <slot></slot>
      </div>
    `;
  },
  tag: 'bit-menu',
}) as unknown as AddEventListeners<BitMenuEvents>;
