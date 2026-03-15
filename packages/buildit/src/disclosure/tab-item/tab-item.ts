import { computed, define, defineProps, effect, html, inject, syncContextProps } from '@vielzeug/craftit';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { coarsePointerMixin, colorThemeMixin, forcedColorsFocusMixin } from '../../styles';
import { TABS_CTX } from '../tabs/tabs';
import styles from './tab-item.css?inline';

export type BitTabItemProps = {
  /** Whether this tab is currently selected (set by bit-tabs) */
  active?: boolean;
  /** Theme color (inherited from bit-tabs) */
  color?: ThemeColor;
  /** Disable this tab */
  disabled?: boolean;
  /** Size (inherited from bit-tabs) */
  size?: ComponentSize;
  /** Unique value identifier — must match a bit-tab-panel value */
  value: string;
  /** Visual variant (inherited from bit-tabs) */
  variant?: VisualVariant;
};

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
export const TAB_ITEM_TAG = define('bit-tab-item', ({ host }) => {
  const props = defineProps<BitTabItemProps>({
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
        :id="${() => `tab-${props.value.value}`}"
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
