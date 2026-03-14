import {
  computed,
  createContext,
  css,
  define,
  defineEmits,
  defineProps,
  handle,
  html,
  onCleanup,
  provide,
  type ReadonlySignal,
} from '@vielzeug/craftit';
import type { AddEventListeners, BitAccordionEvents, ComponentSize, VisualVariant } from '../../types';

/** Context provided by bit-accordion to its bit-accordion-item children. */
export type AccordionContext = {
  selectionMode: ReadonlySignal<'single' | 'multiple' | undefined>;
  size: ReadonlySignal<ComponentSize | undefined>;
  variant: ReadonlySignal<VisualVariant | undefined>;
  notifyExpand: (expandedItem: HTMLElement) => void;
};
/** Injection key for the accordion context. */
export const ACCORDION_CTX = createContext<AccordionContext>();

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--size-2);
      width: 100%;
    }

    ::slotted(bit-accordion-item) {
      width: 100%;
    }
  }

  @layer buildit.variants {
    /* ========================================
       Visual Variants
       ======================================== */

    /* Bordered variant */
    :host([variant='bordered']) {
      gap: var(--size-2);
    }

    /* Text variant - borderless with dividers */
    :host([variant='text']) {
      gap: 0;
    }

    :host([variant='text']) ::slotted(bit-accordion-item:not(:last-child)) {
      border-bottom: 1px solid var(--color-contrast-200);
    }

    /* Contained variants - grouped appearance */
    :host([variant='solid']),
    :host([variant='flat']),
    :host([variant='glass']),
    :host([variant='frost']) {
      border-radius: var(--rounded-md);
      gap: 0;
      padding: var(--size-2);
    }

    /* Solid variant (default) */
    :host([variant='solid']) {
      background: var(--color-contrast-50);
      border: var(--border) solid var(--color-contrast-200);
      box-shadow: var(--shadow-xs);
    }

    /* Flat variant */
    :host([variant='flat']) {
      background: var(--color-contrast-100);
      border: var(--border) solid var(--color-contrast-200);
      box-shadow: var(--inset-shadow-xs);
    }

    /* Glass & Frost - Shared styles */
    :host([variant='glass']),
    :host([variant='frost']) {
      backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
      box-shadow: var(--shadow-md), var(--inset-shadow-xs);
    }

    /* Glass variant - translucent with blur */
    :host([variant='glass']) {
      background: color-mix(in srgb, var(--color-secondary) 30%, var(--color-contrast) 10%);
    }

    /* Frost variant - canvas-based transparency */
    :host([variant='frost']) {
      background: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    }

    /* Nested item border radius for glass and frost variants */
    :host(:is([variant='glass'], [variant='frost'])) ::slotted(bit-accordion-item) {
      border-radius: 0;
    }

    :host(:is([variant='glass'], [variant='frost'])) ::slotted(bit-accordion-item:first-child) {
      border-radius: var(--rounded-md) var(--rounded-md) 0 0;
    }

    :host(:is([variant='glass'], [variant='frost'])) ::slotted(bit-accordion-item:last-child) {
      border-radius: 0 0 var(--rounded-md) var(--rounded-md);
    }

    :host(:is([variant='glass'], [variant='frost'])) ::slotted(bit-accordion-item:only-child) {
      border-radius: var(--rounded-md);
    }
  }
`;

/** Accordion component properties */
export type AccordionProps = {
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

export const TAG = define('bit-accordion', ({ host }) => {
  const props = defineProps<AccordionProps>({
    selectionMode: { default: undefined },
    size: { default: undefined },
    variant: { default: undefined },
  });

  const emit = defineEmits<{ change: { expandedItem: HTMLElement } }>();

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

declare global {
  interface HTMLElementTagNameMap {
    'bit-accordion': HTMLElement & AccordionProps & AddEventListeners<BitAccordionEvents>;
  }
}
