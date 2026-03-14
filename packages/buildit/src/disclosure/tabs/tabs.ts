import {
  createContext,
  css,
  define,
  defineEmits,
  defineProps,
  handle,
  html,
  onCleanup,
  onMount,
  provide,
  type ReadonlySignal,
  ref,
  watch,
} from '@vielzeug/craftit';
import { colorThemeMixin } from '../../styles';
import type { AddEventListeners, BitTabsEvents, ComponentSize, ThemeColor, VisualVariant } from '../../types';

/** Context provided by bit-tabs to its bit-tab-item and bit-tab-panel children. */
export type TabsContext = {
  color: ReadonlySignal<ThemeColor | undefined>;
  orientation: ReadonlySignal<'horizontal' | 'vertical'>;
  size: ReadonlySignal<ComponentSize | undefined>;
  value: ReadonlySignal<string | undefined>;
  variant: ReadonlySignal<VisualVariant | undefined>;
};
/** Injection key for the tabs context. */
export const TABS_CTX = createContext<TabsContext>();

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      --tabs-transition: var(--transition-normal);
      --tabs-radius: var(--rounded-lg);
    }

    .tablist-wrapper {
      position: relative;
      flex-shrink: 0;
    }

    [role='tablist'] {
      display: flex;
      align-items: stretch;
      position: relative;
      gap: var(--tabs-tab-gap, var(--size-1));
      overflow-x: auto;
      scrollbar-width: none;
    }

    [role='tablist']::-webkit-scrollbar {
      display: none;
    }

    .indicator {
      position: absolute;
      bottom: 0;
      height: 2px;
      border-radius: var(--rounded-full);
      background: var(--tabs-indicator-color, var(--_theme-base));
      transition: left var(--tabs-transition), width var(--tabs-transition);
      pointer-events: none;
    }

    .panels {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
  }

  @layer buildit.orientation {
    /* ─── vertical orientation ─── */
    :host([orientation='vertical']) {
      flex-direction: row;
      align-items: flex-start;
    }

    :host([orientation='vertical']) .tablist-wrapper {
      display: flex;
      flex-shrink: 0;
    }

    :host([orientation='vertical']) [role='tablist'] {
      flex-direction: column;
      overflow-x: unset;
      overflow-y: auto;
      width: max-content;
    }

    :host([orientation='vertical']) .indicator {
      /* Reposition indicator to inline-start side for vertical */
      bottom: unset;
      inset-inline-start: 0;
      width: 2px;
      height: unset;
      transition: top var(--tabs-transition), height var(--tabs-transition);
    }
  }

  @layer buildit.variants {
    /* ─── solid (default) ─── */
    :host,
    :host([variant='solid']) {
      --tabs-tab-gap: var(--size-1);
    }

    :host [role='tablist'],
    :host([variant='solid']) [role='tablist'] {
      padding: var(--size-1);
      background: var(--color-contrast-100);
      border-radius: var(--tabs-radius);
      border: var(--border) solid var(--color-contrast-200);
    }

    :host .indicator,
    :host([variant='solid']) .indicator {
      display: none;
    }

    /* ─── flat ─── */
    :host([variant='flat']) {
      background: var(--color-contrast-100);
      border: var(--border) solid var(--color-contrast-200);
      border-radius: var(--tabs-radius);
      box-shadow: var(--inset-shadow-xs), var(--shadow-2xs);
      overflow: hidden;
    }

    :host([variant='flat']) [role='tablist'] {
      background: transparent;
      border: none;
      border-bottom: var(--border) solid var(--color-contrast-200);
      border-radius: 0;
      padding: var(--size-1);
      gap: var(--size-1);
    }

    :host([variant='flat']) .indicator {
      display: none;
    }

    /* ─── bordered ─── */
    :host([variant='bordered']) [role='tablist'] {
      padding: var(--size-1);
      background: transparent;
      border: var(--border) solid var(--color-contrast-200);
      border-radius: var(--tabs-radius) var(--tabs-radius) 0 0;
      border-bottom: none;
      gap: var(--size-1);
    }

    :host([variant='bordered']) .indicator {
      display: none;
    }

    :host([variant='bordered']) .panels {
      border: var(--border) solid var(--color-contrast-200);
      border-radius: 0 0 var(--tabs-radius) var(--tabs-radius);
    }

    /* ─── ghost ─── */
    :host([variant='ghost']) [role='tablist'] {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0;
      gap: var(--size-1);
    }

    :host([variant='ghost']) .indicator {
      display: none;
    }

    /* ─── glass ─── */
    :host([variant='glass']) [role='tablist'] {
      padding: var(--size-1);
      background: color-mix(in srgb, var(--color-secondary) 20%, transparent);
      backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
      border: var(--border) solid color-mix(in srgb, var(--color-secondary-contrast) 15%, transparent);
      border-radius: var(--tabs-radius);
      box-shadow: var(--shadow-md), var(--inset-shadow-xs);
    }

    :host([variant='glass']) .indicator {
      display: none;
    }

    /* ─── frost ─── */
    :host([variant='frost']) [role='tablist'] {
      padding: var(--size-1);
      background: color-mix(in srgb, var(--color-canvas) 55%, transparent);
      backdrop-filter: blur(var(--blur-lg)) saturate(180%);
      border: var(--border) solid color-mix(in srgb, var(--color-contrast-300) 50%, transparent);
      border-radius: var(--tabs-radius);
      box-shadow: var(--shadow-md), var(--inset-shadow-xs);
    }

    :host([variant='frost']) .indicator {
      display: none;
    }

    /* ─── size variants ─── */
    :host([size='sm']) {
      --tabs-tab-size: var(--text-xs);
      --tabs-tab-padding: var(--size-1) var(--size-3);
    }

    :host(:not([size])),
    :host([size='md']) {
      --tabs-tab-size: var(--text-sm);
      --tabs-tab-padding: var(--size-1-5) var(--size-4);
    }

    :host([size='lg']) {
      --tabs-tab-size: var(--text-base);
      --tabs-tab-padding: var(--size-2) var(--size-5);
    }
  }
`;

export interface TabsProps {
  /** Currently selected tab value */
  value?: string;
  /** Visual style variant */
  variant?: VisualVariant;
  /** Component size */
  size?: ComponentSize;
  /** Theme color */
  color?: ThemeColor;
  /** Tab list orientation */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Keyboard activation mode.
   * - `'auto'` (default): Selecting a tab on arrow-key focus immediately activates it (ARIA recommendation for most cases).
   * - `'manual'`: Arrow keys only move focus; the user must press Enter or Space to activate the focused tab.
   */
  activation?: 'auto' | 'manual';
  /** Accessible label for the tablist (passed as aria-label). Use when there is no visible heading labelling the tabs. */
  label?: string;
}

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
export const TAG = define('bit-tabs', ({ host }) => {
  const props = defineProps<TabsProps>({
    activation: { default: 'auto' },
    color: { default: undefined },
    label: { default: undefined },
    orientation: { default: 'horizontal' },
    size: { default: undefined },
    value: { default: undefined },
    variant: { default: undefined },
  });

  const tablistRef = ref<HTMLElement>();
  const indicatorRef = ref<HTMLElement>();
  const emit = defineEmits<{ change: { value: string } }>();

  const getTabs = () => [...host.querySelectorAll<HTMLElement>('bit-tab-item')];

  provide(TABS_CTX, {
    color: props.color,
    orientation: props.orientation,
    size: props.size,
    value: props.value,
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
    const value = props.value.value;
    if (!value) return;
    const activeTab = getTabs().find((t) => t.getAttribute('value') === value);
    moveIndicator(activeTab);
  };

  watch(props.value, () => requestAnimationFrame(triggerIndicator));

  const handleTabClick = (e: Event) => {
    const tab = (e.target as HTMLElement).closest('bit-tab-item') as HTMLElement | null;
    if (!tab || tab.hasAttribute('disabled')) return;
    // Guard: only respond to tab-items that belong to THIS tabs instance, not nested ones.
    if (tab.closest('bit-tabs') !== host) return;
    const value = tab.getAttribute('value');
    if (!value || value === props.value.value) return;
    host.setAttribute('value', value);
    emit('change', { value });
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keyboard navigation handles many key combinations, orientations, and Home/End/Focus actions
  const handleKeydown = (e: KeyboardEvent) => {
    const tabs = getTabs().filter((t) => !t.hasAttribute('disabled'));
    const current = tabs.findIndex((t) => t.getAttribute('value') === props.value.value);
    const isVertical = props.orientation.value === 'vertical';
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
      if (focusedValue && focusedValue !== props.value.value) {
        host.setAttribute('value', focusedValue);
        emit('change', { value: focusedValue });
      }
      return;
    } else return;

    e.preventDefault();
    const value = tabs[next]?.getAttribute('value');
    if (value) {
      (tabs[next] as HTMLElement)?.focus();
      if (props.activation.value !== 'manual') {
        // Auto mode: activate on focus
        host.setAttribute('value', value);
        emit('change', { value });
      }
    }
  };

  host.addEventListener('tab-click', handleTabClick);
  handle(host, 'keydown', handleKeydown);

  onCleanup(() => {
    host.removeEventListener('tab-click', handleTabClick);
  });

  onMount(() => {
    requestAnimationFrame(triggerIndicator);
  });

  return {
    styles: [colorThemeMixin, styles],
    template: html`
      <div class="tablist-wrapper">
        <div
          role="tablist"
          ref=${tablistRef}
          part="tablist"
          :aria-orientation="${() => props.orientation.value}"
          :aria-label="${() => props.label.value ?? null}"
        >
          <slot name="tabs"></slot>
        </div>
        <div class="indicator" ref=${indicatorRef} part="indicator"></div>
      </div>
      <div class="panels" part="panels">
        <slot></slot>
      </div>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-tabs': HTMLElement & TabsProps & AddEventListeners<BitTabsEvents>;
  }
}
