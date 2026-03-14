import { computed, css, define, defineProps, effect, html, inject, syncContextProps } from '@vielzeug/craftit';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { coarsePointerMixin, colorThemeMixin, forcedColorsFocusMixin } from '../../styles';
import { TABS_CTX } from '../tabs/tabs';

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      display: inline-flex;
      outline: none;
      --tab-item-transition: var(--transition-normal);
      --tab-item-radius: var(--rounded-md);
    }

    button {
      display: inline-flex;
      align-items: center;
      gap: var(--size-2);
      border: none;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
      font-size: var(--tab-item-font-size, var(--text-sm));
      font-weight: var(--font-medium);
      color: var(--tab-item-color, var(--text-color-secondary));
      padding: var(--tab-item-padding, var(--size-1-5) var(--size-4));
      border-radius: var(--tab-item-radius);
      white-space: nowrap;
      user-select: none;
      transition:
        background var(--tab-item-transition),
        color var(--tab-item-transition),
        box-shadow var(--tab-item-transition);
      position: relative;
      width: 100%;
      justify-content: center;
      min-height: var(--_touch-target);
    }

    button:focus {
      outline: none;
    }

    :host(:focus-visible) button,
    button:focus-visible {
      outline: var(--border-2) solid var(--_theme-focus);
      outline-offset: 2px;
      box-shadow: 0 0 0 3px var(--_theme-shadow);
    }
  }

  @layer buildit.variants {
    /* ─── solid / default ─── */
    :host button:hover,
    :host([variant='solid']) button:hover {
      background: var(--color-contrast-200);
      color: var(--text-color-heading);
    }

    :host([active]) button,
    :host([variant='solid'][active]) button {
      background: var(--color-contrast-0, var(--color-canvas));
      color: var(--text-color-heading);
      box-shadow: var(--shadow-xs), var(--inset-shadow-xs);
    }

    /* ─── flat ─── */
    :host([variant='flat']) button:hover {
      background: var(--color-contrast-200);
      color: var(--text-color-heading);
    }

    :host([variant='flat'][active]) button {
      background: var(--color-contrast-0, var(--color-canvas));
      color: var(--text-color-heading);
      box-shadow: var(--shadow-xs), var(--inset-shadow-xs);
    }

    /* ─── bordered ─── */
    :host([variant='bordered']) button:hover {
      background: var(--color-contrast-200);
      color: var(--text-color-heading);
    }

    :host([variant='bordered'][active]) button {
      background: var(--color-contrast-0, var(--color-canvas));
      color: var(--text-color-heading);
      box-shadow: var(--shadow-xs);
    }

    /* ─── ghost ─── */
    :host([variant='ghost']) button:hover {
      background: var(--color-contrast-100);
      color: var(--text-color-heading);
    }

    :host([variant='ghost'][active]) button {
      background: var(--_theme-base);
      color: var(--_theme-contrast);
    }

    /* ─── glass ─── */
    :host([variant='glass']) button {
      color: color-mix(in srgb, var(--color-secondary-contrast) 70%, transparent);
      text-shadow: var(--text-shadow-2xs);
    }

    :host([variant='glass']) button:hover {
      background: color-mix(in srgb, var(--color-secondary-contrast) 10%, transparent);
      color: var(--color-secondary-contrast);
    }

    :host([variant='glass'][active]) button {
      background: color-mix(in srgb, var(--color-secondary-contrast) 15%, transparent);
      color: var(--color-secondary-contrast);
      box-shadow: var(--shadow-xs), var(--inset-shadow-xs);
    }

    /* ─── frost ─── */
    :host([variant='frost']) button {
      color: var(--text-color-secondary);
    }

    :host([variant='frost']) button:hover {
      background: color-mix(in srgb, var(--color-contrast) 10%, transparent);
      color: var(--text-color-heading);
    }

    :host([variant='frost'][active]) button {
      background: color-mix(in srgb, var(--color-canvas) 60%, transparent);
      color: var(--text-color-heading);
      box-shadow: var(--shadow-xs), var(--inset-shadow-xs);
    }

    /* ─── sizes ─── */
    :host([size='sm']) {
      --tab-item-font-size: var(--text-xs);
      --tab-item-padding: var(--size-1) var(--size-3);
    }

    :host(:not([size])),
    :host([size='md']) {
      --tab-item-font-size: var(--text-sm);
      --tab-item-padding: var(--size-1-5) var(--size-4);
    }

    :host([size='lg']) {
      --tab-item-font-size: var(--text-base);
      --tab-item-padding: var(--size-2) var(--size-5);
    }

    /* ─── disabled ─── */
    :host([disabled]) {
      opacity: 0.5;
      pointer-events: none;
    }

    @media (forced-colors: active) {
      /* Ensure focus ring is visible regardless of variant theme color */
      button:focus-visible {
        outline: 2px solid Highlight;
        box-shadow: none;
      }
      /* Active tab: box-shadow raised indicator is stripped; use outline inste
         ad so the selected tab remains distinguishable */
      :host([active]) button {
        outline: 2px solid Highlight;
        outline-offset: -2px;
      }
    }
  }
`;

export interface TabItemProps {
  /** Unique value identifier — must match a bit-tab-panel value */
  value: string;
  /** Whether this tab is currently selected (set by bit-tabs) */
  active?: boolean;
  /** Disable this tab */
  disabled?: boolean;
  /** Size (inherited from bit-tabs) */
  size?: ComponentSize;
  /** Visual variant (inherited from bit-tabs) */
  variant?: VisualVariant;
  /** Theme color (inherited from bit-tabs) */
  color?: ThemeColor;
}

/**
 * Individual tab trigger. Must be placed in the `tabs` slot of `bit-tabs`.
 *
 * @element bit-tab-item
 *
 * @attr {string} value - Unique identifier, matches the corresponding bit-tab-panel value
 * @attr {boolean} active - Set by the parent bit-tabs when this tab is selected
 * @attr {boolean} disabled - Prevents selection
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} variant - Inherited from bit-tabs
 * @attr {string} color - Inherited from bit-tabs: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 *
 * @slot prefix - Icon or content before the label
 * @slot - Tab label
 * @slot suffix - Badge or count after the label
 *
 * @example
 * ```html
 * <bit-tab-item slot="tabs" value="overview">Overview</bit-tab-item>
 * <bit-tab-item slot="tabs" value="settings" disabled>Settings</bit-tab-item>
 * ```
 */
export const TAG = define('bit-tab-item', ({ host }) => {
  const props = defineProps<TabItemProps>({
    active: { default: false },
    color: { default: undefined },
    disabled: { default: false },
    size: { default: undefined },
    value: { default: '' },
    variant: { default: undefined },
  });

  const tabsCtx = inject(TABS_CTX, undefined);

  syncContextProps(tabsCtx, props, ['color', 'size', 'variant']);

  const isActive = tabsCtx
    ? computed(() => !!tabsCtx.value.value && tabsCtx.value.value === props.value.value)
    : props.active;

  effect(() => {
    host.toggleAttribute('active', isActive.value);
  });

  const ariaSelected = computed(() => String(isActive.value));
  const tabIndex = computed(() => (isActive.value ? '0' : '-1'));

  const handleClick = () => {
    if (props.disabled.value) return;

    host.dispatchEvent(
      new CustomEvent('tab-click', {
        bubbles: true,
        composed: true,
        detail: { value: props.value.value },
      }),
    );
  };

  return {
    styles: [colorThemeMixin, forcedColorsFocusMixin('button'), coarsePointerMixin, styles],
    template: html`
      <button
        role="tab"
        type="button"
        part="tab"
        id="${() => `tab-${props.value.value}`}"
        :aria-selected=${ariaSelected}
        :tabindex=${tabIndex}
        :aria-disabled=${computed(() => String(props.disabled.value))}
        :aria-controls="${() => `tabpanel-${props.value.value}`}"
        @click=${handleClick}>
        <slot name="prefix"></slot>
        <slot></slot>
        <slot name="suffix"></slot>
      </button>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-tab-item': HTMLElement & TabItemProps;
  }
}
