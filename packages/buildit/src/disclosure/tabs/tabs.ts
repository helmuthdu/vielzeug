import {
  computed,
  createContext,
  defineComponent,
  handle,
  html,
  onMount,
  provide,
  type ReadonlySignal,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { colorThemeMixin } from '../../styles';

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

import styles from './tabs.css?inline';

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
 *
 * @attr {string} value - The value of the currently selected tab
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'ghost' | 'glass' | 'frost'
 * @attr {string} size - Size: 'sm' | 'md' | 'lg'
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 *
 * @fires change - Emitted when the active tab changes, detail: { value: string }
 *
 * @slot tabs - Place `bit-tab-item` elements here
 * @slot - Place `bit-tab-panel` elements here
 *
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
export const TABS_TAG = defineComponent<BitTabsProps, BitTabsEvents>({
  props: {
    activation: { default: 'auto' },
    color: { default: undefined },
    label: { default: undefined },
    orientation: { default: 'horizontal' },
    size: { default: undefined },
    value: { default: undefined },
    variant: { default: undefined },
  },
  setup({ emit, host, props }) {
    const tablistRef = ref<HTMLElement>();
    const indicatorRef = ref<HTMLElement>();
    const selectedValue = signal<string | undefined>(props.value.value);
    const getTabs = () => [...host.querySelectorAll<HTMLElement>('bit-tab-item')];

    const setSelection = (value: string | undefined, shouldEmit = false) => {
      selectedValue.value = value;

      if (value == null) host.removeAttribute('value');
      else if (host.getAttribute('value') !== value) host.setAttribute('value', value);

      if (shouldEmit && value) emit('change', { value });
    };

    const ensureSelection = () => {
      const tabs = getTabs();

      // During initial connection, slotted tab items may not be assigned yet.
      // Keep current selection until tabs exist instead of falling back to undefined.
      if (tabs.length === 0) return;

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

      if (props.orientation.value === 'vertical') {
        const tabRect = activeTab.getBoundingClientRect();
        const listRect = tablist.getBoundingClientRect();

        indicator.style.top = `${tabRect.top - listRect.top + tablist.scrollTop}px`;
        indicator.style.height = `${tabRect.height}px`;
        indicator.style.left = '0';
        indicator.style.width = '';
      } else {
        const tabRect = activeTab.getBoundingClientRect();
        const listRect = tablist.getBoundingClientRect();

        indicator.style.left = `${tabRect.left - listRect.left + tablist.scrollLeft}px`;
        indicator.style.width = `${tabRect.width}px`;
        indicator.style.top = '';
        indicator.style.height = '';
      }
    };
    const triggerIndicator = () => {
      const value = selectedValue.value;

      if (!value) return;

      const activeTab = getTabs().find((t) => t.getAttribute('value') === value);

      moveIndicator(activeTab);
    };

    watch(selectedValue, () => requestAnimationFrame(triggerIndicator));

    const handleTabClick = (e: Event) => {
      const tab = (e.target as HTMLElement).closest('bit-tab-item') as HTMLElement | null;

      if (!tab || tab.hasAttribute('disabled')) return;

      // Guard: only respond to tab-items that belong to THIS tabs instance, not nested ones.
      if (tab.closest('bit-tabs') !== host) return;

      const value = tab.getAttribute('value');

      if (!value || value === selectedValue.value) return;

      setSelection(value, true);
    };
    const handleKeydown = (e: KeyboardEvent) => {
      const tabs = getTabs().filter((t) => !t.hasAttribute('disabled'));
      const current = tabs.findIndex((t) => t.getAttribute('value') === selectedValue.value);
      const isVertical = props.orientation.value === 'vertical';
      // eslint-disable-next-line no-useless-assignment
      let next = current;

      if (e.key === (isVertical ? 'ArrowDown' : 'ArrowRight')) next = (current + 1) % tabs.length;
      else if (e.key === (isVertical ? 'ArrowUp' : 'ArrowLeft')) next = (current - 1 + tabs.length) % tabs.length;
      else if (!isVertical && e.key === 'ArrowDown') next = (current + 1) % tabs.length;
      else if (!isVertical && e.key === 'ArrowUp') next = (current - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      else if (props.activation.value === 'manual' && (e.key === 'Enter' || e.key === ' ')) {
        // Manual mode: activate the currently focused tab
        const focused = tabs.find(
          (t) => t === document.activeElement || t.shadowRoot?.activeElement === document.activeElement,
        );
        const focusedValue = focused?.getAttribute('value');

        if (focusedValue && focusedValue !== selectedValue.value) {
          setSelection(focusedValue, true);
        }

        return;
      } else return;

      e.preventDefault();

      const value = tabs[next]?.getAttribute('value');

      if (value) {
        (tabs[next] as HTMLElement)?.focus();

        if (props.activation.value !== 'manual') {
          // Auto mode: activate on focus
          setSelection(value, true);
        }
      }
    };

    handle(host, 'click', handleTabClick);
    handle(host, 'keydown', handleKeydown);
    onMount(() => {
      const syncSelection = () => {
        ensureSelection();
        triggerIndicator();
      };
      const tabsSlot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="tabs"]');

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
          ref=${tablistRef}
          part="tablist"
          :aria-orientation="${() => props.orientation.value}"
          :aria-label="${() => props.label.value ?? null}">
          <slot name="tabs"></slot>
        </div>
        <div class="indicator" ref=${indicatorRef} part="indicator"></div>
      </div>
      <div class="panels" part="panels">
        <slot></slot>
      </div>
    `;
  },
  styles: [colorThemeMixin, styles],
  tag: 'bit-tabs',
});
