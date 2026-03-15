import { computed, define, defineProps, effect, html, inject, signal } from '@vielzeug/craftit';

import { reducedMotionMixin } from '../../styles';
import { TABS_CTX } from '../tabs/tabs';
import styles from './tab-panel.css?inline';

export type BitTabPanelProps = {
  /** Active state (managed by bit-tabs) */
  active?: boolean;
  /** When true, the panel content is not rendered until first activation (preserves resources) */
  lazy?: boolean;
  /** Panel padding size: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' (default: 'md' = var(--size-4)) */
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Must match the `value` of its corresponding bit-tab-item */
  value: string;
};

/**
 * Content panel for a tab. Shown when its `value` matches the selected tab.
 *
 * @element bit-tab-panel
 *
 * @attr {string} value - Must match the corresponding bit-tab-item value
 * @attr {boolean} active - Toggled by the parent bit-tabs
 * @attr {string} padding - Panel padding: 'none' | 'xs' | 'sm' | 'md' (default) | 'lg' | 'xl' | '2xl'
 *
 * @slot - Panel content
 *
 * @example
 * ```html
 * <bit-tab-panel value="overview"><p>Overview content here</p></bit-tab-panel>
 * <bit-tab-panel value="settings" padding="lg"><p>Large padding</p></bit-tab-panel>
 * <bit-tab-panel value="code" padding="none"><pre>No padding for code</pre></bit-tab-panel>
 * ```
 */
export const TAB_PANEL_TAG = define('bit-tab-panel', ({ host }) => {
  const props = defineProps<BitTabPanelProps>({
    active: { default: false },
    lazy: { default: false },
    padding: { default: 'md' },
    value: { default: '' },
  });

  const tabsCtx = inject(TABS_CTX, undefined);
  const isActive = tabsCtx
    ? computed(() => !!tabsCtx.value.value && tabsCtx.value.value === props.value.value)
    : props.active;

  // Map padding prop to CSS variable
  const paddingValue = computed(() => {
    const paddingMap: Record<string, string> = {
      '2xl': 'var(--size-12)',
      lg: 'var(--size-6)',
      md: 'var(--size-4)',
      none: '0',
      sm: 'var(--size-2)',
      xl: 'var(--size-8)',
      xs: 'var(--size-1)',
    };

    return paddingMap[props.padding.value] || paddingMap.md;
  });

  // Track whether the panel has ever been active (for lazy rendering)
  const hasBeenActive = signal(false);

  effect(() => {
    host.toggleAttribute('active', isActive.value);

    if (isActive.value) hasBeenActive.value = true;
  });

  // shouldRender: true if not lazy OR has been active at least once
  const shouldRender = computed(() => !props.lazy.value || hasBeenActive.value);

  return {
    styles: [reducedMotionMixin, styles],
    template: html`
      <div
        class="panel"
        part="panel"
        role="tabpanel"
        :id="${() => `tabpanel-${props.value.value}`}"
        :aria-labelledby="${() => `tab-${props.value.value}`}"
        :aria-hidden=${() => String(!isActive.value)}
        :style="${() => `--tab-panel-padding: ${paddingValue.value}`}"
        tabindex="0">
        ${() => (shouldRender.value ? html`<slot></slot>` : '')}
      </div>
    `,
  };
});
