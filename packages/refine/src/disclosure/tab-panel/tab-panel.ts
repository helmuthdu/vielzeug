import { define, html, inject, prop, ref, bind, getHost, onMounted, watchEffect } from '@vielzeug/ore';
import { styleMap, when } from '@vielzeug/ore/directives';
import { computed, signal } from '@vielzeug/ripple';

import { setAriaReflection } from '../../headless';
import { reducedMotionMixin } from '../../styles';
import { TABS_CTX } from '../tabs/tabs';
import styles from './tab-panel.css?inline';

const TAB_PANEL_PADDING_PRESET: Record<string, string> = {
  '2xl': 'var(--size-12)',
  lg: 'var(--size-6)',
  md: 'var(--size-4)',
  none: '0',
  sm: 'var(--size-2)',
  xl: 'var(--size-8)',
  xs: 'var(--size-1)',
};

export type OreTabPanelProps = {
  /** Active state (managed by ore-tabs) */
  active?: boolean;
  /** When true, the panel content is not rendered until first activation (preserves resources) */
  lazy?: boolean;
  /** Panel padding size: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' (default: 'md' = var(--size-4)) */
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Must match the `value` of its corresponding ore-tab-item */
  value: string;
};

/**
 * Content panel for a tab. Shown when its `value` matches the selected tab.
 *
 * @element ore-tab-panel
 *
 * @attr {string} value - Must match the corresponding ore-tab-item value
 * @attr {boolean} active - Toggled by the parent ore-tabs
 * @attr {string} padding - Panel padding: 'none' | 'xs' | 'sm' | 'md' (default) | 'lg' | 'xl' | '2xl'
 *
 * @slot - Panel content
 *
 * @cssprop --tab-panel-padding - Inner padding of the panel content area
 * @cssprop --tab-panel-font-size - Font size of the panel content
 * @part panel - Panel container.
 * @example
 * ```html
 * <ore-tab-panel value="overview"><p>Overview content here</p></ore-tab-panel>
 * <ore-tab-panel value="settings" padding="lg"><p>Large padding</p></ore-tab-panel>
 * <ore-tab-panel value="code" padding="none"><pre>No padding for code</pre></ore-tab-panel>
 * ```
 */
export const TAB_PANEL_TAG = 'ore-tab-panel' as const;
define<OreTabPanelProps>(TAB_PANEL_TAG, {
  props: {
    active: prop.bool(false),
    lazy: prop.bool(false),
    padding: prop.oneOf(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const, 'md'),
    value: prop.string(''),
  },
  setup(props) {
    const el = getHost();
    const watch = watchEffect;

    const tabsCtx = inject(TABS_CTX);
    const isActive = computed(() =>
      tabsCtx ? !!tabsCtx.value.value && tabsCtx.value.value === props.value.value : props.active.value,
    );

    bind({
      attr: {
        active: () => (isActive.value ? true : undefined),
      },
    });

    // Map padding prop to CSS variable
    const paddingValue = computed(() => {
      const key = props.padding.value ?? 'md';

      return TAB_PANEL_PADDING_PRESET[key] ?? TAB_PANEL_PADDING_PRESET.md;
    });
    // Track whether the panel has ever been active (for lazy rendering)
    const hasBeenActive = signal(false);

    watch(() => {
      if (isActive.value) hasBeenActive.value = true;
    });

    // shouldRender: true if not lazy OR has been active at least once
    const shouldRender = computed(() => !props.lazy.value || hasBeenActive.value);
    const panelStyle = styleMap({ '--tab-panel-padding': paddingValue });
    const panelId = () => `tabpanel-${props.value.value}`;
    const panelRef = ref<HTMLElement>();

    // `aria-labelledby` as a plain IDREF attribute cannot resolve across shadow-tree boundaries
    // (the matching `id` lives inside <ore-tab-item>'s own shadow root) — see
    // `setAriaReflection()`'s doc comment. Deferred to `onMounted()`: sibling custom elements
    // (including the peer `<ore-tab-item>`) connect in tree order within the same synchronous
    // insertion, so a sibling's shadow content may not exist yet during this element's own
    // `setup()` — `onMounted()`'s microtask runs after the whole subtree has connected.
    onMounted(() => {
      watch(() => {
        const panel = panelRef.value;
        const value = props.value.value;

        if (!panel) return;

        const tabsEl = value ? el.closest('ore-tabs') : null;
        const tabEl = tabsEl?.querySelector<HTMLElement>(`:scope > ore-tab-item[value="${value}"]`);
        const button = tabEl?.shadowRoot?.querySelector<HTMLElement>('[role="tab"]') ?? null;

        setAriaReflection(panel, 'ariaLabelledByElements', button ? [button] : []);
      });
    });

    return html`
      <div
        class="panel"
        part="panel"
        role="tabpanel"
        ref="${panelRef}"
        :id="${panelId}"
        aria-hidden="${() => String(!isActive.value)}"
        :style="${panelStyle}"
        tabindex="0">
        ${when(shouldRender, () => html`<slot></slot>`)}
      </div>
    `;
  },
  styles: [reducedMotionMixin, styles],
});
