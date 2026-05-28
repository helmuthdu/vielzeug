import { define, prop, computed, effect, html, inject } from '@vielzeug/craftit';

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
 * @cssprop --border-2 - Border token.
 * @cssprop --color-canvas - Base surface background color.
 * @cssprop --color-contrast - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-0 - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-100 - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-200 - Contrast color token for text and surfaces.
 * @cssprop --color-secondary-contrast - Secondary accent color token.
 * @cssprop --font-medium - Font-weight token.
 * @cssprop --inset-shadow-xs - Component styling token.
 * @cssprop --rounded-lg - Border radius token.
 * @cssprop --shadow-xs - Shadow/elevation token.
 * @cssprop --size-1 - Spacing/sizing token.
 * @part tab - Tab trigger element.
 * @example
 * ```html
 * <bit-tab-item slot="tabs" value="overview">Overview</bit-tab-item>
 * <bit-tab-item slot="tabs" value="settings" disabled>Settings</bit-tab-item>
 * ```
 */
export const TAB_ITEM_TAG = define<BitTabItemProps>('bit-tab-item', {
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
