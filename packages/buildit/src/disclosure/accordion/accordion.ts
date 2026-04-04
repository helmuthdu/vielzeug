import { define, computed, createContext, html, provide, signal, type ReadonlySignal } from '@vielzeug/craftit';
import { createListControl, createListKeyControl } from '@vielzeug/craftit/controls';

import type { ComponentSize, VisualVariant } from '../../types';

/** Context provided by bit-accordion to its bit-accordion-item children. */
export type AccordionContext = {
  notifyExpand: (expandedItem: HTMLElement) => void;
  selectionMode: ReadonlySignal<'single' | 'multiple' | undefined>;
  size: ReadonlySignal<ComponentSize | undefined>;
  variant: ReadonlySignal<VisualVariant | undefined>;
};
/** Injection key for the accordion context. */
export const ACCORDION_CTX = createContext<AccordionContext>('AccordionContext');

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

export const ACCORDION_TAG = define<BitAccordionProps, BitAccordionEvents>('bit-accordion', {
  props: {
    selectionMode: undefined,
    size: undefined,
    variant: undefined,
  },
  setup({ emit, host, props }) {
    const focusedIndex = signal(0);
    const selectionMode = computed(() => props.selectionMode.value);

    const handleSelectionMode = (expandedItem: HTMLElement) => {
      if (selectionMode.value !== 'single') return;

      host.el.querySelectorAll('bit-accordion-item[expanded]').forEach((item) => {
        if (item !== expandedItem && item.hasAttribute('expanded')) {
          item.removeAttribute('expanded');
        }
      });

      emit('change', { expandedItem });
    };

    const getAccordionItems = () => {
      return [...host.el.querySelectorAll<HTMLElement>('bit-accordion-item:not([disabled])')];
    };

    const getSummaryElements = () => {
      return getAccordionItems()
        .map((item) => item.shadowRoot?.querySelector<HTMLElement>('summary'))
        .filter(Boolean) as HTMLElement[];
    };

    const listControl = createListControl({
      getIndex: () => focusedIndex.value,
      getItems: () => getAccordionItems(),
      isItemDisabled: (item: HTMLElement) => item.hasAttribute('disabled'),
      loop: true,
      setIndex: (index) => {
        focusedIndex.value = index;

        const summaries = getSummaryElements();

        summaries[index]?.focus();
      },
    });

    provide(ACCORDION_CTX, {
      notifyExpand: handleSelectionMode,
      selectionMode,
      size: props.size,
      variant: props.variant,
    });

    // Group-level event and keyboard handling for WAI-ARIA Accordion pattern
    const accordionListKeys = createListKeyControl({ control: listControl });

    host.bind('on', {
      expand: (event: Event) => {
        const eventTarget = event.composedPath().find((node): node is HTMLElement => node instanceof HTMLElement);
        const expandedItem = (event as CustomEvent<{ item?: HTMLElement }>).detail?.item ?? eventTarget;

        if (!expandedItem || expandedItem.localName !== 'bit-accordion-item') return;

        handleSelectionMode(expandedItem);
      },
      keydown: (evt) => {
        const summaries = getSummaryElements();

        if (!summaries.length) return;

        const activeSummary = evt
          .composedPath()
          .find((node): node is HTMLElement => node instanceof HTMLElement && node.localName === 'summary');
        const focused = activeSummary ? summaries.indexOf(activeSummary) : -1;

        if (focused === -1) return; // focus is not on a summary — let native handling proceed

        focusedIndex.value = focused;
        accordionListKeys.handleKeydown(evt);
      },
    });

    return html`<slot></slot>`;
  },
  styles: [styles],
});
