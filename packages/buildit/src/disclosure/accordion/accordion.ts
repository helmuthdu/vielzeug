import {
  computed,
  createContext,
  define,
  defineEmits,
  defineProps,
  handle,
  html,
  onCleanup,
  provide,
  type ReadonlySignal,
} from '@vielzeug/craftit';

import type { ComponentSize, VisualVariant } from '../../types';

/** Context provided by bit-accordion to its bit-accordion-item children. */
export type AccordionContext = {
  notifyExpand: (expandedItem: HTMLElement) => void;
  selectionMode: ReadonlySignal<'single' | 'multiple' | undefined>;
  size: ReadonlySignal<ComponentSize | undefined>;
  variant: ReadonlySignal<VisualVariant | undefined>;
};
/** Injection key for the accordion context. */
export const ACCORDION_CTX = createContext<AccordionContext>();

import styles from './accordion.css?inline';

/** Accordion component properties */

export type BitAccordionEvents = {
  change: { expandedItem: HTMLElement };
};

export type BitAccordionProps = {
  /** Selection mode (single = only one opens, multiple = multiple can be open) */
  selectionMode?: 'single' | 'multiple';
  /** Size for all items (propagated via context) */
  size?: ComponentSize;
  /** Visual variant for all items (propagated via context) */
  variant?: VisualVariant;
};

/**
 * A container for accordion items with single or multiple selection modes.
 *
 * @element bit-accordion
 *
 * @attr {string} selection-mode - Selection mode: 'single' | 'multiple'
 * @attr {string} size - Size for all items: 'sm' | 'md' | 'lg' (propagated to children)
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'text' | 'glass' | 'frost' (propagated to children)
 *
 * @fires expand - Emitted when an item expands
 * @fires change - Emitted when selection changes (single mode)
 *
 * @slot - Accordion item elements (bit-accordion-item)
 *
 * @example
 * ```html
 * <bit-accordion selection-mode="single"><bit-accordion-item>...</bit-accordion-item></bit-accordion>
 * <bit-accordion variant="frost" size="lg"><bit-accordion-item>...</bit-accordion-item></bit-accordion>
 * ```
 */

export const ACCORDION_TAG = define('bit-accordion', ({ host }) => {
  const props = defineProps<BitAccordionProps>({
    selectionMode: { default: undefined },
    size: { default: undefined },
    variant: { default: undefined },
  });

  const emit = defineEmits<BitAccordionEvents>();

  const notifyExpand = (expandedItem: HTMLElement) => {
    if (props.selectionMode.value === 'single') {
      host.querySelectorAll('bit-accordion-item').forEach((item) => {
        if (item !== expandedItem && item.hasAttribute('expanded')) {
          item.removeAttribute('expanded');
        }
      });
      emit('change', { expandedItem });
    }
  };

  provide(ACCORDION_CTX, {
    notifyExpand,
    selectionMode: computed(() => props.selectionMode.value),
    size: props.size,
    variant: props.variant,
  });

  // Listen for expand events bubbling up from child accordion-items.
  // This allows single-selection management without tight coupling via context calls.
  const handleExpand = (e: Event) => notifyExpand(e.target as HTMLElement);

  host.addEventListener('expand', handleExpand);

  // Group-level arrow-key navigation between accordion item summaries (WAI-ARIA Accordion pattern).
  handle(host, 'keydown', (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;

    const items = [...host.querySelectorAll<HTMLElement>('bit-accordion-item:not([disabled])')];
    const summaries = items
      .map((item) => item.shadowRoot?.querySelector<HTMLElement>('summary'))
      .filter(Boolean) as HTMLElement[];

    if (!summaries.length) return;

    const focused = summaries.indexOf(document.activeElement as HTMLElement);

    if (focused === -1) return; // focus is not on a summary — let native handling proceed

    let next = focused;

    if (e.key === 'ArrowDown') next = (focused + 1) % summaries.length;
    else if (e.key === 'ArrowUp') next = (focused - 1 + summaries.length) % summaries.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = summaries.length - 1;

    e.preventDefault();
    summaries[next]?.focus();
  });

  onCleanup(() => {
    host.removeEventListener('expand', handleExpand);
  });

  return {
    styles: [styles],
    template: html`<slot></slot>`,
  };
});
