import {
  aria,
  createId,
  css,
  define,
  defineEmits,
  defineProps,
  effect,
  handle,
  html,
  onMount,
  onSlotChange,
  signal,
} from '@vielzeug/craftit';
import { autoUpdate, flip, offset, positionFloat, shift } from '@vielzeug/floatit';

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

export interface BitMenuEvents {
  'bit-select': CustomEvent<MenuItemSelectDetail>;
  'bit-open': CustomEvent<never>;
  'bit-close': CustomEvent<never>;
}

export interface MenuProps {
  placement?: 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end';
  color?: ThemeColor;
  size?: ComponentSize;
  disabled?: boolean;
}

// ============================================
// Styles
// ============================================

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      display: inline-block;
      position: relative;
    }

    /* ========================================
       Menu Panel
       ======================================== */

    .menu-panel {
      background: var(--color-canvas);
      border-radius: var(--rounded-md);
      border: var(--border) solid var(--color-contrast-200);
      box-shadow: var(--shadow-lg);
      box-sizing: border-box;
      inset-inline-start: 0;
      margin: 0;
      min-width: 10rem;
      opacity: 0;
      padding: var(--size-1);
      pointer-events: none;
      position: fixed;
      top: 0;
      transform: translateY(-4px) scale(0.97);
      transform-origin: top;
      transition:
        opacity var(--transition-fast),
        transform var(--transition-fast),
        visibility var(--transition-fast);
      visibility: hidden;
      z-index: calc(var(--z-popover, 1000) + 1);
    }

    .menu-panel[data-open] {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
      visibility: visible;
    }

    /* ========================================
       Menu Items (slotted bit-menu-item)
       ======================================== */

    ::slotted(bit-menu-item) {
      display: block;
    }

    ::slotted(bit-menu-separator) {
      display: block;
    }
  }
`;

const themeStyles = /* css */ css`
  ${colorThemeMixin}
  ${sizeVariantMixin}
  ${forcedColorsMixin}
`;

// ============================================
// Menu Item Component
// ============================================

export interface MenuItemProps {
  value?: string;
  disabled?: boolean;
  /** 'checkbox' | 'radio' — makes this a checkable item */
  type?: 'checkbox' | 'radio';
  /** Whether the checkable item is currently checked */
  checked?: boolean;
}

export const ITEM_TAG = define('bit-menu-item', ({ host }) => {
  const props = defineProps<MenuItemProps>({
    checked: { default: false },
    disabled: { default: false },
    type: { default: undefined },
    value: { default: '' },
  });

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
});

// ============================================
// Menu Separator
// ============================================

export const SEPARATOR_TAG = define('bit-menu-separator', () => {
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
export const TAG = define('bit-menu', ({ host }) => {
  const props = defineProps<MenuProps>({
    color: { default: undefined },
    disabled: { default: false },
    placement: { default: 'bottom-start' },
    size: { default: undefined },
  });

  const emit = defineEmits<{
    'bit-close': never;
    'bit-open': never;
    'bit-select': MenuItemSelectDetail;
  }>();

  const menuId = createId('menu');
  const isOpen = signal(false);
  const focusedIndex = signal(-1);

  let triggerEl: HTMLElement | null = null;
  let panelEl: HTMLElement | null = null;
  let autoUpdateCleanup: (() => void) | null = null;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getItems(): HTMLElement[] {
    return Array.from(host.querySelectorAll<HTMLElement>('bit-menu-item:not([disabled])'));
  }

  function updatePosition() {
    if (!panelEl || !triggerEl) return;

    positionFloat(triggerEl, panelEl, {
      middleware: [offset(4), flip({ padding: 6 }), shift({ padding: 6 })],
      placement: props.placement.value,
    });
  }

  // ── Open / Close ──────────────────────────────────────────────────────────

  function open() {
    if (props.disabled.value) return;

    isOpen.value = true;
    focusedIndex.value = -1;

    if (triggerEl && panelEl) {
      autoUpdateCleanup?.();
      autoUpdateCleanup = autoUpdate(triggerEl, panelEl, updatePosition);
    }

    requestAnimationFrame(() => {
      updatePosition();

      // Focus first item
      const items = getItems();

      if (items.length > 0) {
        focusedIndex.value = 0;
        items[0].focus();
      }
    });
    emit('bit-open', undefined as never);
  }

  function close() {
    isOpen.value = false;
    autoUpdateCleanup?.();
    autoUpdateCleanup = null;
    focusedIndex.value = -1;
    triggerEl?.focus();
    emit('bit-close', undefined as never);
  }

  function toggleMenu() {
    if (isOpen.value) close();
    else open();
  }

  // ── Keyboard Navigation ───────────────────────────────────────────────────

  function handleKeydown(e: KeyboardEvent) {
    const items = getItems();

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

        const focused = items[focusedIndex.value];

        if (focused) {
          const value = focused.getAttribute('value') ?? '';
          const type = focused.getAttribute('type');
          let checked: boolean | undefined;

          if (type === 'checkbox') {
            const next = !focused.hasAttribute('checked');

            if (next) focused.setAttribute('checked', '');
            else focused.removeAttribute('checked');

            checked = next;
          } else if (type === 'radio') {
            for (const radio of host.querySelectorAll<HTMLElement>('bit-menu-item[type="radio"]'))
              radio.removeAttribute('checked');
            focused.setAttribute('checked', '');
            checked = true;
          }

          emit('bit-select', { checked, originalEvent: e, value });

          if (type !== 'checkbox' && type !== 'radio') close();
        }

        break;
      }
      case 'ArrowDown': {
        e.preventDefault();

        const next = Math.min(focusedIndex.value + 1, items.length - 1);

        focusedIndex.value = next;
        items[next]?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();

        const prev = Math.max(focusedIndex.value - 1, 0);

        focusedIndex.value = prev;
        items[prev]?.focus();
        break;
      }
      case 'End':
        e.preventDefault();
        focusedIndex.value = items.length - 1;
        items[items.length - 1]?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Home':
        e.preventDefault();
        focusedIndex.value = 0;
        items[0]?.focus();
        break;
      case 'Tab':
        close();
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
          expanded: () => isOpen.value,
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
        const value = item.getAttribute('value') ?? '';
        const type = item.getAttribute('type');
        let checked: boolean | undefined;

        if (type === 'checkbox') {
          const next = !item.hasAttribute('checked');

          if (next) item.setAttribute('checked', '');
          else item.removeAttribute('checked');

          checked = next;
        } else if (type === 'radio') {
          // Uncheck siblings with same name/group (all radio items in this menu)
          for (const radio of host.querySelectorAll<HTMLElement>('bit-menu-item[type="radio"]')) {
            radio.removeAttribute('checked');
          }
          item.setAttribute('checked', '');
          checked = true;
        }

        emit('bit-select', { checked, originalEvent: e, value });

        if (type !== 'checkbox' && type !== 'radio') close();
      }
    };

    handle(host, 'click', handleItemClick);

    // Close on outside click
    handle(document, 'click', (e: MouseEvent) => {
      if (!host.contains(e.composedPath()[0] as Node)) close();
    });

    effect(() => {
      panelEl?.toggleAttribute('data-open', isOpen.value);
    });

    handle(panelEl, 'keydown', handleKeydown as EventListener);

    return () => {
      autoUpdateCleanup?.();

      if (prevTriggerEl) {
        prevTriggerEl.removeEventListener('click', toggleMenu);
        prevTriggerEl.removeEventListener('keydown', handleKeydown);
      }
    };
  });

  // ── Template ──────────────────────────────────────────────────────────────

  return html`
    <style>
      ${componentStyles}${themeStyles}
    </style>
    <slot name="trigger"></slot>
    <div class="menu-panel" id="${menuId}" role="menu" aria-orientation="vertical">
      <slot></slot>
    </div>
  `;
}) as unknown as AddEventListeners<BitMenuEvents>;
