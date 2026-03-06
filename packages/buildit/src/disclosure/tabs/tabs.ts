import { css, define, defineEmits, defineProps, handle, html, onCleanup, onMount, ref, watch } from '@vielzeug/craftit';
import { colorThemeMixin } from '../../styles';
import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      --tabs-transition: var(--transition-normal);
      --tabs-radius: var(--rounded-lg);
    }

    .tablist-wrapper {
      position: relative;
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
define('bit-tabs', ({ host }) => {
  const props = defineProps({
    value: { default: undefined as string | undefined },
    size: { default: undefined as ComponentSize | undefined },
    variant: { default: undefined as VisualVariant | undefined },
    color: { default: undefined as ThemeColor | undefined },
  });

  const tablistRef = ref<HTMLElement>();
  const indicatorRef = ref<HTMLElement>();
  const emit = defineEmits<{ change: { value: string } }>();

  const getTabs = () => [...host.querySelectorAll<HTMLElement>('bit-tab-item')];
  const getPanels = () => [...host.querySelectorAll<HTMLElement>('bit-tab-panel')];

  const moveIndicator = (activeTab: HTMLElement | undefined) => {
    const indicator = indicatorRef.value;
    const tablist = tablistRef.value;
    if (!indicator || !tablist || !activeTab) return;
    const tabRect = activeTab.getBoundingClientRect();
    const listRect = tablist.getBoundingClientRect();
    indicator.style.left = `${tabRect.left - listRect.left + tablist.scrollLeft}px`;
    indicator.style.width = `${tabRect.width}px`;
  };

  const activate = (value: string) => {
    const tabs = getTabs();
    const panels = getPanels();

    let activeTab: HTMLElement | undefined;

    tabs.forEach((tab) => {
      const isActive = tab.getAttribute('value') === value;
      tab.toggleAttribute('active', isActive);
      if (isActive) activeTab = tab;
    });

    panels.forEach((panel) => {
      panel.toggleAttribute('active', panel.getAttribute('value') === value);
    });

    moveIndicator(activeTab);
  };

  const syncChildren = () => {
    const size = props.size.value;
    const variant = props.variant.value;
    const color = props.color.value;
    const value = props.value.value;

    getTabs().forEach((tab) => {
      if (size) tab.setAttribute('size', size);
      if (variant) tab.setAttribute('variant', variant);
      if (color) tab.setAttribute('color', color);
      else tab.removeAttribute('color');
    });

    if (value) activate(value);
  };

  watch([props.value, props.size, props.variant, props.color], () => syncChildren(), { immediate: true });

  const handleTabClick = (e: Event) => {
    const tab = (e.target as HTMLElement).closest('bit-tab-item') as HTMLElement | null;
    if (!tab || tab.hasAttribute('disabled')) return;
    const value = tab.getAttribute('value');
    if (!value || value === props.value.value) return;
    host.setAttribute('value', value);
    emit('change', { value });
  };

  const handleKeydown = (e: KeyboardEvent) => {
    const tabs = getTabs().filter((t) => !t.hasAttribute('disabled'));
    const current = tabs.findIndex((t) => t.getAttribute('value') === props.value.value);
    let next = current;

    if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;

    e.preventDefault();
    const value = tabs[next]?.getAttribute('value');
    if (value) {
      host.setAttribute('value', value);
      emit('change', { value });
      (tabs[next] as HTMLElement)?.focus();
    }
  };

  host.addEventListener('tab-click', handleTabClick);
  host.addEventListener('keydown', handleKeydown);

  onCleanup(() => {
    host.removeEventListener('tab-click', handleTabClick);
    host.removeEventListener('keydown', handleKeydown);
  });

  const handleSlotChange = () => syncChildren();

  onMount(() => {
    const tablistEl = tablistRef.value;
    if (tablistEl) handle(tablistEl.querySelector('slot') as HTMLSlotElement, 'slotchange', handleSlotChange);
  });

  return {
    styles: [colorThemeMixin, styles],
    template: html`
      <div class="tablist-wrapper">
        <div role="tablist" ref=${tablistRef} part="tablist">
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

export default {};
