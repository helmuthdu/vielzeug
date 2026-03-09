import { computed, css, define, defineProps, effect, html, inject, onCleanup, signal } from '@vielzeug/craftit';
import { reducedMotionMixin } from '../../styles';
import { TABS_CTX } from '../tabs/tabs';

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      display: none;
      width: 100%;
    }

    :host([active]) {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .panel {
      padding: var(--tab-panel-padding, var(--size-4));
      color: var(--text-color-body);
      font-size: var(--tab-panel-font-size, var(--text-sm));
      animation: var(--_motion-animation, tab-panel-in var(--transition-normal) var(--ease-out) both);
      height: 100%;
      box-sizing: border-box;
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
  }

  @layer buildit.variants {
    @keyframes tab-panel-in {
      from {
        opacity: 0;
        translate: 0 4px;
      }
      to {
        opacity: 1;
        translate: 0 0;
      }
    }

  }
`;

export interface TabPanelProps {
  /** Must match the `value` of its corresponding bit-tab-item */
  value: string;
  /** Active state (managed by bit-tabs) */
  active?: boolean;
  /** When true, the panel content is not rendered until first activation (preserves resources) */
  lazy?: boolean;
  /** Panel padding size: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' (default: 'md' = var(--size-4)) */
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

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
export const TAG = define('bit-tab-panel', ({ host }) => {
  const props = defineProps<TabPanelProps>({
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
  onCleanup(
    effect(() => {
      host.toggleAttribute('active', isActive.value);
      if (isActive.value) hasBeenActive.value = true;
    }),
  );

  // shouldRender: true if not lazy OR has been active at least once
  const shouldRender = computed(() => !props.lazy.value || hasBeenActive.value);

  return {
    styles: [reducedMotionMixin, styles],
    template: html`
      <div
        class="panel"
        part="panel"
        role="tabpanel"
        id="${() => `tabpanel-${props.value.value}`}"
        :aria-labelledby="${() => `tab-${props.value.value}`}"
        :aria-hidden=${() => String(!isActive.value)}
        :style="${() => `--tab-panel-padding: ${paddingValue.value}`}"
        tabindex="0"
      >
        ${() => (shouldRender.value ? html`<slot></slot>` : '')}
      </div>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-tab-panel': HTMLElement & TabPanelProps;
  }
}
