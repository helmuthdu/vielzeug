import {
  createContext,
  define,
  html,
  prop,
  ref,
  bind,
  getHost,
  onCleanup,
  onMounted,
  provide,
  useEmit,
} from '@vielzeug/ore';
import { computed, type Readable, signal, watch } from '@vielzeug/ripple';

import type { ComponentSize, SurfaceVariant, ThemeColor } from '../../types';

import { createInteraction, createListControl, elementDirection, lifecycleSignal } from '../../headless';
import { sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin } from '../../styles';
import styles from './tabs.css?inline';

/** Context provided by ore-tabs to its ore-tab-item and ore-tab-panel children. */
export type TabsContext = {
  color: Readable<ThemeColor | undefined>;
  orientation: Readable<'horizontal' | 'vertical'>;
  size: Readable<ComponentSize | undefined>;
  value: Readable<string | undefined>;
  variant: Readable<SurfaceVariant | undefined>;
};
/** Injection key for the tabs context. */
export const TABS_CTX = createContext<TabsContext>('TabsContext');

export type OreTabsEvents = {
  change: { value: string };
};

export type OreTabsProps = {
  /**
   * Keyboard activation mode.
   * - `'auto'` (default): Selecting a tab on arrow-key focus immediately activates it (ARIA recommendation for most cases).
   * - `'manual'`: Arrow keys only move focus; the user must press Enter or Space to activate the focused tab.
   */
  activation?: 'auto' | 'manual';
  /** Theme color */
  color?: ThemeColor;
  /** Accessible label for the tablist (passed as aria-label). Use when there is no visible heading labelling the tabs. */
  label?: string;
  /** Tab list orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Component size */
  size?: ComponentSize;
  /** Currently selected tab value */
  value?: string;
  /** Visual style variant */
  variant?: SurfaceVariant;
};

/**
 * Tabs container. Manages tab selection and syncs state to child tab items and panels.
 *
 * @element ore-tabs
 * @element ore-tab-item - Child element for tab buttons (auto-discovered)
 * @element ore-tab-panel - Child element for tab content (auto-discovered)
 *
 * @attr {string} value - The value of the currently selected tab
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'ghost' | 'glass' | 'frost'
 * @attr {string} size - Size: 'sm' | 'md' | 'lg'
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 *
 * @fires change - Emitted when the active tab changes with detail: { value: string }
 *
 * @slot tabs - Place `ore-tab-item` elements here
 * @slot - Place `ore-tab-panel` elements here
 *
 * @cssprop --tabs-radius - Border radius of the tablist container and panels
 * @cssprop --tabs-transition - Transition duration/easing for the active indicator
 * @cssprop --tabs-indicator-color - Color of the sliding active indicator line
 * @cssprop --tabs-bg - Background of the host element (flat variant)
 * @cssprop --tabs-tablist-bg - Tablist container background (solid/glass/frost variants)
 * @cssprop --tabs-tablist-border-color - Tablist container border color
 * @part tablist - Container that holds the slotted tab items
 * @part indicator - Active tab indicator element
 * @part panels - Container that holds tab panel content
 * @example
 * ```html
 * <ore-tabs value="tab1" variant="bordered">
 *   <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
 *   <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
 *   <ore-tab-panel value="tab1"><p>Overview content</p></ore-tab-panel>
 *   <ore-tab-panel value="tab2"><p>Settings content</p></ore-tab-panel>
 * </ore-tabs>
 * ```
 */
export const TABS_TAG = 'ore-tabs' as const;
define<OreTabsProps>(TABS_TAG, {
  props: {
    ...themableBundle,
    ...sizableBundle,
    activation: prop.oneOf(['auto', 'manual'] as const, 'auto'),
    label: prop.string(),
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'horizontal'),
    value: prop.string(),
    variant: prop.string<SurfaceVariant>(),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreTabsEvents>();

    const shadowRoot = el.shadowRoot;
    const tablistRef = ref<HTMLElement>();
    const indicatorRef = ref<HTMLElement>();
    const selectedValue = signal<string | undefined>(props.value.value);
    const isManualActivation = () => props.activation.value === 'manual';
    const isVertical = () => props.orientation.value === 'vertical';

    bind({
      attr: {
        value: () => selectedValue.value ?? null,
      },
    });

    const getTabs = () => [...el.querySelectorAll<HTMLElement>(':scope > ore-tab-item[slot="tabs"]')];
    const getEnabledTabs = () => getTabs().filter((t) => !t.hasAttribute('disabled'));
    const focusTab = (tab: HTMLElement | undefined) => {
      if (!tab) return;

      const focusable = tab.shadowRoot?.querySelector<HTMLElement>('[role="tab"]') ?? tab;

      focusable.focus();
    };

    // ────────────────────────────────────────────────────────────────
    // Selection State Management
    // ────────────────────────────────────────────────────────────────

    const setSelection = (value: string | undefined, shouldEmit = false) => {
      selectedValue.value = value;

      if (shouldEmit && value) emit('change', { value });
    };

    const ensureSelection = () => {
      const tabs = getTabs();

      if (tabs.length === 0) return; // No tabs yet, keep current selection

      const current = selectedValue.value;
      const hasCurrent = current
        ? tabs.some((tab) => tab.getAttribute('value') === current && !tab.hasAttribute('disabled'))
        : false;

      if (hasCurrent) return;

      const firstEnabled = tabs.find((tab) => !tab.hasAttribute('disabled'))?.getAttribute('value') ?? undefined;

      setSelection(firstEnabled, false);
    };

    watch(props.value, (value) => {
      selectedValue.value = value;
      ensureSelection();
    });

    // ────────────────────────────────────────────────────────────────
    // List Control for Keyboard Navigation
    // ────────────────────────────────────────────────────────────────

    const listControl = createListControl({
      direction: () => elementDirection(el),
      getItems: () => getEnabledTabs(),
      loop: true,
      onNavigate: (_action, index) => {
        const tabs = getEnabledTabs();
        const nextTab = tabs[index];

        focusTab(nextTab);

        if (!isManualActivation()) {
          const value = nextTab?.getAttribute('value');

          if (value) setSelection(value, true);
        }
      },
      orientation: () => (isVertical() ? 'vertical' : 'both'),
      signal: lifecycleSignal(onCleanup),
    });

    // ────────────────────────────────────────────────────────────────
    // Context & Indicator Management
    // ────────────────────────────────────────────────────────────────

    provide(TABS_CTX, {
      color: props.color,
      orientation: computed(() => props.orientation.value ?? 'horizontal'),
      size: props.size,
      value: selectedValue,
      variant: props.variant,
    });

    const moveIndicator = (activeTab: HTMLElement | undefined) => {
      const indicator = indicatorRef.value;
      const tablist = tablistRef.value;

      if (!indicator || !tablist || !activeTab) return;

      const tabRect = activeTab.getBoundingClientRect();
      const listRect = tablist.getBoundingClientRect();

      if (isVertical()) {
        const y = tabRect.top - listRect.top + tablist.scrollTop;

        indicator.style.transition = 'none';
        indicator.style.height = `${tabRect.height}px`;
        indicator.style.width = '';
        indicator.style.left = '0';
        indicator.style.top = '0';
        void indicator.offsetWidth;
        indicator.style.transition = '';
        indicator.style.transform = `translateY(${y}px)`;
      } else {
        const x = tabRect.left - listRect.left + tablist.scrollLeft;

        indicator.style.transition = 'none';
        indicator.style.width = `${tabRect.width}px`;
        indicator.style.height = '';
        indicator.style.top = '';
        indicator.style.left = '0';
        void indicator.offsetWidth;
        indicator.style.transition = '';
        indicator.style.transform = `translateX(${x}px)`;
      }
    };

    const updateIndicator = () => {
      const value = selectedValue.value;

      if (!value) return;

      const activeTab = getTabs().find((t) => t.getAttribute('value') === value);

      moveIndicator(activeTab);
    };

    watch(selectedValue, () => {
      requestAnimationFrame(updateIndicator);
    });

    // ────────────────────────────────────────────────────────────────
    // Event Handlers
    // ────────────────────────────────────────────────────────────────

    const handleTabClick = (e: Event) => {
      const tab = e
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && node.localName === 'ore-tab-item');

      if (!tab || tab.hasAttribute('disabled')) return;

      // Guard: only respond to tab-items that belong to THIS tabs instance
      if (tab.closest('ore-tabs') !== el) return;

      const value = tab.getAttribute('value');

      if (!value || value === selectedValue.value) return;

      setSelection(value, true);
    };

    const activateFocusedTab = (): void => {
      const tabs = getEnabledTabs();
      const focusedTab = tabs.find(
        (tab) => tab === document.activeElement || tab.shadowRoot?.activeElement === document.activeElement,
      );
      const focusedValue = focusedTab?.getAttribute('value');

      if (focusedValue && focusedValue !== selectedValue.value) setSelection(focusedValue, true);
    };

    const manualActivationPress = createInteraction({
      disabled: computed(() => !isManualActivation()),
      onPress: activateFocusedTab,
    });

    const handleKeydown = (e: KeyboardEvent) => {
      const tabs = getEnabledTabs();

      if (tabs.length === 0) return;

      const path = e.composedPath();
      const activeTabFromEvent = path.find(
        (node): node is HTMLElement => node instanceof HTMLElement && node.localName === 'ore-tab-item',
      );

      const tabFromEvent = activeTabFromEvent ?? tabs.find((t) => t.getAttribute('value') === selectedValue.value);
      const focused = tabFromEvent ? tabs.indexOf(tabFromEvent) : -1;

      if (focused >= 0) listControl.set(focused);

      if (listControl.handleKeydown(e)) return;

      manualActivationPress.handleKeydown(e);
    };

    bind({
      on: {
        click: handleTabClick,
        keydown: handleKeydown,
      },
    });

    // ────────────────────────────────────────────────────────────────
    // Lifecycle
    // ────────────────────────────────────────────────────────────────

    onMounted(() => {
      const syncSelection = () => {
        ensureSelection();
        updateIndicator();
      };

      const tabsSlot = shadowRoot?.querySelector<HTMLSlotElement>('slot[name="tabs"]');

      if (tabsSlot) {
        tabsSlot.addEventListener('slotchange', syncSelection);
      }

      syncSelection();
      requestAnimationFrame(syncSelection);

      return () => {
        if (tabsSlot) {
          tabsSlot.removeEventListener('slotchange', syncSelection);
        }
      };
    });

    return html`
      <div class="tablist-wrapper">
        <div
          role="tablist"
          ref="${tablistRef}"
          part="tablist"
          aria-orientation="${props.orientation}"
          aria-label="${props.label}">
          <slot name="tabs"></slot>
        </div>
        <div class="indicator" ref="${indicatorRef}" part="indicator"></div>
      </div>
      <div class="panels" part="panels">
        <slot></slot>
      </div>
    `;
  },
  styles: [colorThemeMixin, styles],
});
