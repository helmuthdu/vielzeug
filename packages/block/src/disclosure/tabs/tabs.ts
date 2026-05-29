import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { createListControl, createInteraction } from '../../headless';
import { sizableBundle, themableBundle } from '../../shared/config';
import { colorThemeMixin } from '../../styles';
import styles from './tabs.css?inline';

import {
  computed,
  createContext,
  define,
  html,
  prop,
  provide,
  type ReadonlySignal,
  ref,
  signal,
  watch,
  onMounted,
} from '@vielzeug/craft';

/** Context provided by bit-tabs to its bit-tab-item and bit-tab-panel children. */
export type TabsContext = {
  color: ReadonlySignal<ThemeColor | undefined>;
  orientation: ReadonlySignal<'horizontal' | 'vertical'>;
  size: ReadonlySignal<ComponentSize | undefined>;
  value: ReadonlySignal<string | undefined>;
  variant: ReadonlySignal<VisualVariant | undefined>;
};
/** Injection key for the tabs context. */
export const TABS_CTX = createContext<TabsContext>('TabsContext');

export type BitTabsEvents = {
  change: { value: string };
};

export type BitTabsProps = {
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
  variant?: VisualVariant;
};

/**
 * Tabs container. Manages tab selection and syncs state to child tab items and panels.
 *
 * @element bit-tabs
 * @element bit-tab-item - Child element for tab buttons (auto-discovered)
 * @element bit-tab-panel - Child element for tab content (auto-discovered)
 *
 * @attr {string} value - The value of the currently selected tab
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'ghost' | 'glass' | 'frost'
 * @attr {string} size - Size: 'sm' | 'md' | 'lg'
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 *
 * @fires change - Emitted when the active tab changes with detail: { value: string }
 *
 * @slot tabs - Place `bit-tab-item` elements here
 * @slot - Place `bit-tab-panel` elements here
 *
 * @cssprop --blur-lg - Backdrop blur for frosted tab variants
 * @cssprop --border - Border token used by tablist and panel separators
 * @cssprop --color-canvas - Base background color for tab surfaces
 * @cssprop --color-contrast-100 - Hover background tone for tab items
 * @cssprop --color-contrast-200 - Border/divider contrast tone
 * @cssprop --color-contrast-300 - Muted contrast tone for inactive states
 * @cssprop --color-secondary - Accent color for active tab highlights
 * @cssprop --color-secondary-contrast - Text/icon color on active tab accents
 * @cssprop --inset-shadow-xs - Inset shadow used by bordered tab variants
 * @cssprop --rounded-full - Pill-style radius for rounded tab variants
 * @cssprop --rounded-lg - Radius for tablist container and panels
 * @cssprop --shadow-2xs - Subtle shadow for layered tab surfaces
 * @part tablist - Container that holds the slotted tab items
 * @part indicator - Active tab indicator element
 * @part panels - Container that holds tab panel content
 * @example
 * ```html
 * <bit-tabs value="tab1" variant="underline">
 *   <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
 *   <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
 *   <bit-tab-panel value="tab1"><p>Overview content</p></bit-tab-panel>
 *   <bit-tab-panel value="tab2"><p>Settings content</p></bit-tab-panel>
 * </bit-tabs>
 * ```
 */
export const TABS_TAG = define<BitTabsProps, BitTabsEvents>('bit-tabs', {
  props: {
    ...themableBundle,
    ...sizableBundle,
    activation: prop.oneOf(['auto', 'manual'] as const, 'auto'),
    label: prop.string(),
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'horizontal'),
    value: prop.string(),
    variant: prop.string<VisualVariant>(),
  },
  setup(props, { bind, el, emit }) {
    const shadowRoot = el.shadowRoot;
    const tablistRef = ref<HTMLElement>();
    const indicatorRef = ref<HTMLElement>();
    const selectedValue = signal<string | undefined>(props.value.value);
    const focusedIndex = signal(0);
    const isManualActivation = () => props.activation.value === 'manual';
    const isVertical = () => props.orientation.value === 'vertical';

    bind({
      attr: {
        value: () => selectedValue.value ?? null,
      },
    });

    const getTabs = () => [...el.querySelectorAll<HTMLElement>(':scope > bit-tab-item[slot="tabs"]')];
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
      getIndex: () => focusedIndex.value,
      getItems: () => getEnabledTabs(),
      isItemDisabled: (tab: HTMLElement) => tab.hasAttribute('disabled'),
      keys: () => {
        if (isVertical()) {
          return {
            next: ['ArrowDown'],
            prev: ['ArrowUp'],
          };
        }

        return {
          next: ['ArrowRight', 'ArrowDown'],
          prev: ['ArrowLeft', 'ArrowUp'],
        };
      },
      loop: true,
      setIndex: (index) => {
        focusedIndex.value = index;

        const tabs = getEnabledTabs();
        const nextTab = tabs[index];

        focusTab(nextTab);

        if (!isManualActivation()) {
          const value = nextTab?.getAttribute('value');

          if (value) setSelection(value, true);
        }
      },
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
        indicator.style.top = `${tabRect.top - listRect.top + tablist.scrollTop}px`;
        indicator.style.height = `${tabRect.height}px`;
        indicator.style.left = '0';
        indicator.style.width = '';
      } else {
        indicator.style.left = `${tabRect.left - listRect.left + tablist.scrollLeft}px`;
        indicator.style.width = `${tabRect.width}px`;
        indicator.style.top = '';
        indicator.style.height = '';
      }
    };

    const updateIndicator = () => {
      const value = selectedValue.value;

      if (!value) return;

      const activeTab = getTabs().find((t) => t.getAttribute('value') === value);

      moveIndicator(activeTab);
    };

    watch(selectedValue, () => requestAnimationFrame(updateIndicator));

    // ────────────────────────────────────────────────────────────────
    // Event Handlers
    // ────────────────────────────────────────────────────────────────

    const handleTabClick = (e: Event) => {
      const tab = e
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && node.localName === 'bit-tab-item');

      if (!tab || tab.hasAttribute('disabled')) return;

      // Guard: only respond to tab-items that belong to THIS tabs instance
      if (tab.closest('bit-tabs') !== el) return;

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
      disabled: () => !isManualActivation(),
      onPress: activateFocusedTab,
    });

    const handleKeydown = (e: KeyboardEvent) => {
      const tabs = getEnabledTabs();

      if (tabs.length === 0) return;

      const path = e.composedPath();
      const activeTabFromEvent = path.find(
        (node): node is HTMLElement => node instanceof HTMLElement && node.localName === 'bit-tab-item',
      );

      const focused = activeTabFromEvent ? tabs.indexOf(activeTabFromEvent) : -1;

      if (focused >= 0) focusedIndex.value = focused;

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
