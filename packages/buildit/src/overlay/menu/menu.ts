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
import {
  createListNavigation,
  createOverlayControl,
  type OverlayOpenReason,
  type OverlayCloseReason,
} from '@vielzeug/craftit/labs';
import { flip, offset, positionFloat, shift } from '@vielzeug/floatit';

import type { AddEventListeners, ComponentSize, ThemeColor } from '../../types';

import { coarsePointerMixin, colorThemeMixin, forcedColorsMixin, sizeVariantMixin } from '../../styles';

// ============================================
// Types
// ============================================

export interface MenuSelectDetail {
  value: string;
  checked?: boolean;
}

export type BitMenuEvents = {
  close: { reason: OverlayCloseReason };
  open: { reason: OverlayOpenReason };
  select: MenuSelectDetail;
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

export const MENU_ITEM_TAG = defineComponent({
  setup({ host }) {
    const itemStyles = /* css */ css`
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

        .item-label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
      ${coarsePointerMixin}
    `;

    onMount(() => {
      const itemEl = host.shadowRoot?.querySelector<HTMLElement>('.item');
      if (!itemEl) return;

      const sync = () => {
        const type = host.getAttribute('type');
        const checked = host.hasAttribute('checked');
        const disabled = host.hasAttribute('disabled');
        const isCheckable = type === 'checkbox' || type === 'radio';

        // Visual state via classes — reliable within shadow DOM
        itemEl.classList.toggle('is-checkable', isCheckable);
        itemEl.classList.toggle('is-checked', isCheckable && checked);

        // ARIA
        if (type === 'checkbox') {
          itemEl.setAttribute('role', 'menuitemcheckbox');
          itemEl.setAttribute('aria-checked', String(checked));
        } else if (type === 'radio') {
          itemEl.setAttribute('role', 'menuitemradio');
          itemEl.setAttribute('aria-checked', String(checked));
        } else {
          itemEl.setAttribute('role', 'menuitem');
          itemEl.removeAttribute('aria-checked');
        }

        itemEl.setAttribute('aria-disabled', String(disabled));
      };

      const observer = new MutationObserver(sync);
      observer.observe(host, { attributes: true, attributeFilter: ['checked', 'disabled', 'type'] });
      sync();

      return () => observer.disconnect();
    });

    return html`
      <style>
        ${itemStyles}
      </style>
      <div class="item" tabindex="-1">
        <span class="icon-slot"><slot name="icon"></slot></span>
        <span class="item-label"><slot></slot></span>
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
    return html`<style>
      @layer buildit.base {
        :host {
          display: block;
          margin: var(--size-1) 0;
          border-top: var(--border) solid var(--color-contrast-200);
        }
      }
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
    let triggerEl: HTMLElement | null = null;
    let panelEl: HTMLElement | null = null;

    // ── Helpers ───────────────────────────────────────────────────────────────
    function getItems(): HTMLElement[] {
      return Array.from(host.querySelectorAll<HTMLElement>('bit-menu-item:not([disabled])'));
    }

    let focusedIndex = -1;

    const listNavigation = createListNavigation<HTMLElement>({
      getIndex: () => focusedIndex,
      getItems,
      isItemDisabled: (item) => item.hasAttribute('disabled'),
      setIndex: (index) => {
        focusedIndex = index;
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
      onClose: (reason) => emit('close', { reason }),
      onOpen: (reason) => emit('open', { reason }),
      positioner: {
        floating: () => panelEl,
        reference: () => triggerEl,
        update: updatePosition,
      },
      setOpen: (next) => {
        isOpen.value = next;

        if (!next) listNavigation.reset();
      },
    });

    const activateItem = (item: HTMLElement): void => {
      const type = item.getAttribute('type');

      if (type === 'checkbox') {
        const next = !item.hasAttribute('checked');

        if (next) item.setAttribute('checked', '');
        else item.removeAttribute('checked');
      } else if (type === 'radio') {
        for (const radio of host.querySelectorAll<HTMLElement>('bit-menu-item[type="radio"]')) {
          radio.removeAttribute('checked');
        }
        item.setAttribute('checked', '');
      }

      const value = item.getAttribute('value') ?? '';
      const checked = type === 'checkbox' || type === 'radio' ? item.hasAttribute('checked') : undefined;

      emit('select', { checked, value });

      if (type !== 'checkbox' && type !== 'radio') {
        overlay.close({ reason: 'programmatic' });
      }
    };

    // ── Keyboard Navigation ───────────────────────────────────────────────────
    function handleMenuKeydown(e: KeyboardEvent) {
      const open = isOpen.value;

      // When closed: open on Enter / Space / ArrowDown
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          overlay.open();
          requestAnimationFrame(() => listNavigation.first());
        }
        return;
      }

      // When open: navigate and activate
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          listNavigation.next();
          break;
        case 'ArrowUp':
          e.preventDefault();
          listNavigation.prev();
          break;
        case 'Home':
          e.preventDefault();
          listNavigation.first();
          break;
        case 'End':
          e.preventDefault();
          listNavigation.last();
          break;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const focused = listNavigation.getActiveItem();
          if (focused) activateItem(focused);
          break;
        }
        case 'Escape':
          e.preventDefault();
          overlay.close({ reason: 'escape' });
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

      let prevTriggerEl: HTMLElement | null = null;

      function resolveTrigger() {
        if (prevTriggerEl) {
          prevTriggerEl.removeEventListener('click', toggleMenu);
          prevTriggerEl.removeEventListener('keydown', handleMenuKeydown);
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
          triggerEl.addEventListener('keydown', handleMenuKeydown);
        }
      }

      function toggleMenu() {
        overlay.toggle();
      }

      onSlotChange('trigger', resolveTrigger);

      // Item activation via click
      handle(host, 'click', ((e: Event) => {
        if (!isOpen.value) return;

        const me = e as MouseEvent;
        const path = me.composedPath();
        const itemFromPath = path.find(
          (node): node is HTMLElement => node instanceof HTMLElement && node.tagName === 'BIT-MENU-ITEM',
        );
        const item = itemFromPath ?? (me.target as HTMLElement | null)?.closest<HTMLElement>('bit-menu-item') ?? null;

        if (!item || item.hasAttribute('disabled')) return;

        activateItem(item);
      }) as EventListener);

      const removeOutsideClick = overlay.bindOutsideClick(document);

      effect(() => {
        panelEl?.toggleAttribute('data-open', isOpen.value);
      });

      handle(panelEl, 'keydown', handleMenuKeydown as EventListener);

      return () => {
        removeOutsideClick();

        if (prevTriggerEl) {
          prevTriggerEl.removeEventListener('click', toggleMenu);
          prevTriggerEl.removeEventListener('keydown', handleMenuKeydown);
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
