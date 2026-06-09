import { computed, define, effect, html, inject, prop } from '@vielzeug/craft';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { coarsePointerMixin, colorThemeMixin, forcedColorsFocusMixin } from '../../styles';
import { TABS_CTX } from '../tabs/tabs';
import styles from './tab-item.css?inline';

export type SgTabItemProps = {
  /** Whether this tab is currently selected (set by sg-tabs) */
  active?: boolean;
  /** Theme color (inherited from sg-tabs) */
  color?: ThemeColor;
  /** Disable this tab */
  disabled?: boolean;
  /** Size (inherited from sg-tabs) */
  size?: ComponentSize;
  /** Unique value identifier — must match a sg-tab-panel value */
  value: string;
  /** Visual variant (inherited from sg-tabs) */
  variant?: VisualVariant;
};

/**
 * Individual tab trigger. Must be placed in the `tabs` slot of `sg-tabs`.
 *
 * @element sg-tab-item
 *
 * @attr {string} value - Unique identifier, matches the corresponding sg-tab-panel value
 * @attr {boolean} active - Set by the parent sg-tabs when this tab is selected
 * @attr {boolean} disabled - Prevents selection
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} variant - Inherited from sg-tabs: 'solid' | 'flat' | 'bordered' | 'ghost' | 'glass' | 'frost' | 'underline'
 * @attr {string} color - Inherited from sg-tabs: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 *
 * @slot prefix - Icon or content before the label
 * @slot - Tab label
 * @slot suffix - Badge or count after the label
 *
 * @cssprop --tab-item-radius - Button border radius
 * @cssprop --tab-item-transition - Transition duration/easing
 * @cssprop --tab-item-padding - Button padding
 * @cssprop --tab-item-font-size - Button font size
 * @cssprop --tab-item-color - Default text color
 * @cssprop --tab-item-hover-bg - Background on hover
 * @cssprop --tab-item-active-bg - Background when active/selected
 * @cssprop --tab-item-active-color - Text color when active/selected
 * @cssprop --tab-item-active-shadow - Box shadow when active/selected
 * @part tab - Tab trigger element.
 * @example
 * ```html
 * <sg-tab-item slot="tabs" value="overview">Overview</sg-tab-item>
 * <sg-tab-item slot="tabs" value="settings" disabled>Settings</sg-tab-item>
 * ```
 */
export const TAB_ITEM_TAG = 'sg-tab-item' as const;
define<SgTabItemProps>(TAB_ITEM_TAG, {
  props: {
    active: prop.bool(false),
    color: prop.string<ThemeColor>(),
    disabled: prop.bool(false),
    size: prop.string<ComponentSize>(),
    value: prop.string(''),
    variant: prop.string<VisualVariant>(),
  },
  setup(props, { bind, el }) {
    const tabsCtx = inject(TABS_CTX);

    if (tabsCtx) {
      effect(() => {
        const color = tabsCtx.color.value;
        const size = tabsCtx.size.value;
        const variant = tabsCtx.variant.value;

        if (color !== undefined) el.setAttribute('color', color);

        if (size !== undefined) el.setAttribute('size', size);

        if (variant !== undefined) el.setAttribute('variant', variant);
      });
    }

    const isActive = computed(() =>
      tabsCtx ? !!tabsCtx.value.value && tabsCtx.value.value === props.value.value : props.active.value,
    );
    const isDisabled = () => Boolean(props.disabled.value);

    bind({
      attr: {
        active: () => (isActive.value ? true : undefined),
      },
    });

    const handleClick = (event: MouseEvent) => {
      event.stopPropagation();

      if (isDisabled()) {
        event.preventDefault();

        return;
      }

      el.dispatchEvent(new CustomEvent('click', { bubbles: true, detail: { value: props.value.value } }));
    };

    const tabId = () => `tab-${props.value.value}`;
    const controlsAttr = () => `tabpanel-${props.value.value}`;

    return html`
      <button
        role="tab"
        type="button"
        part="tab"
        :id="${tabId}"
        aria-selected="${isActive}"
        tabindex="${() => (isActive.value ? '0' : '-1')}"
        aria-disabled="${isDisabled}"
        :aria-controls="${controlsAttr}"
        @click="${handleClick}">
        <slot name="prefix"></slot>
        <slot></slot>
        <slot name="suffix"></slot>
      </button>
    `;
  },
  styles: [colorThemeMixin, forcedColorsFocusMixin('button'), coarsePointerMixin, styles],
});
