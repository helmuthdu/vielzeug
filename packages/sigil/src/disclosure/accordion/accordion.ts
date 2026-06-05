import { computed, createContext, define, html, prop, provide, type ReadonlySignal, signal } from '@vielzeug/craft';

import type { ComponentSize, VisualVariant } from '../../types';

import { createListControl } from '../../headless';
import styles from './accordion.css?inline';

/** Context provided by sg-accordion to its sg-accordion-item children. */
export type AccordionContext = {
  notifyExpand: (expandedItem: HTMLElement) => void;
  selectionMode: ReadonlySignal<'single' | 'multiple' | undefined>;
  size: ReadonlySignal<ComponentSize | undefined>;
  variant: ReadonlySignal<VisualVariant | undefined>;
};
/** Injection key for the accordion context. */
export const ACCORDION_CTX = createContext<AccordionContext>('AccordionContext');

/** Accordion component properties */

export type SgAccordionEvents = {
  change: { expandedItem: HTMLElement };
};

export type SgAccordionProps = {
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
 * @element sg-accordion
 * @element sg-accordion-item - Child element for each collapsible panel
 *
 * @attr {string} selection-mode - Selection mode: 'single' | 'multiple'
 * @attr {string} size - Size for all items: 'sm' | 'md' | 'lg' (propagated to children)
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'text' | 'glass' | 'frost' (propagated to children)
 *
 * @fires expand - Emitted when an item expands. detail: { expanded: boolean; item: HTMLElement }
 * @fires change - Emitted when selection changes (single mode). detail: { expandedItem: HTMLElement }
 *
 * @slot - `sg-accordion-item` elements
 *
 * @cssprop --blur-lg - Backdrop blur for frosted accordion variants
 * @cssprop --border - Border token used for accordion item outlines
 * @cssprop --color-canvas - Base panel background color
 * @cssprop --color-contrast - Primary text contrast color within items
 * @cssprop --color-contrast-100 - Hover and active background contrast tone
 * @cssprop --color-contrast-200 - Divider and border contrast color
 * @cssprop --color-contrast-50 - Soft background for subtle variants
 * @cssprop --color-secondary - Accent color for selected or emphasized states
 * @cssprop --inset-shadow-xs - Inset shadow used for bordered/flat depth
 * @cssprop --rounded-lg - Corner radius for accordion item containers
 * @cssprop --shadow-md - Elevated shadow for prominent accordion styles
 * @cssprop --shadow-xs - Subtle shadow for default accordion depth
 * @example
 * ```html
 * <sg-accordion selection-mode="single">
 *   <sg-accordion-item>
 *     <span slot="title">What is Sigil?</span>
 *     <p>Sigil is a headless web component library.</p>
 *   </sg-accordion-item>
 *   <sg-accordion-item>
 *     <span slot="title">How do I install it?</span>
 *     <p>Run <code>npm install @vielzeug/sigil</code>.</p>
 *   </sg-accordion-item>
 * </sg-accordion>
 * <sg-accordion variant="bordered" selection-mode="multiple">
 *   <sg-accordion-item expanded><span slot="title">Open by default</span><p>Content</p></sg-accordion-item>
 * </sg-accordion>
 * ```
 */

export const ACCORDION_TAG = 'sg-accordion' as const;
define<SgAccordionProps, SgAccordionEvents>(ACCORDION_TAG, {
  props: {
    selectionMode: prop.string<'single' | 'multiple'>(),
    size: prop.string<ComponentSize>(),
    variant: prop.string<VisualVariant>(),
  },

  setup(props, { bind, el, emit }) {
    const focusedIndex = signal(0);

    const handleSelectionMode = (expandedItem: HTMLElement) => {
      if (props.selectionMode.value !== 'single') return;

      el.querySelectorAll('sg-accordion-item[expanded]').forEach((item) => {
        if (item !== expandedItem && item.hasAttribute('expanded')) {
          item.removeAttribute('expanded');
        }
      });

      emit('change', { expandedItem });
    };

    const getAccordionItems = () => {
      return [...el.querySelectorAll<HTMLElement>('sg-accordion-item:not([disabled])')];
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
      selectionMode: computed(() => props.selectionMode.value),
      size: props.size,
      variant: props.variant,
    });

    // Group-level event and keyboard handling for WAI-ARIA Accordion pattern

    bind({
      on: {
        expand: (event: Event) => {
          const eventTarget = event.composedPath().find((node): node is HTMLElement => node instanceof HTMLElement);
          const expandedItem = (event as CustomEvent<{ item?: HTMLElement }>).detail?.item ?? eventTarget;

          if (!expandedItem || expandedItem.localName !== 'sg-accordion-item') return;

          handleSelectionMode(expandedItem);
        },
        keydown: (evt: KeyboardEvent) => {
          const summaries = getSummaryElements();

          if (!summaries.length) return;

          const activeSummary = evt
            .composedPath()
            .find((node): node is HTMLElement => node instanceof HTMLElement && node.localName === 'summary');
          const focused = activeSummary ? summaries.indexOf(activeSummary) : -1;

          if (focused === -1) return; // focus is not on a summary — let native handling proceed

          focusedIndex.value = focused;
          listControl.handleKeydown(evt);
        },
      },
    });

    return html`<slot></slot>`;
  },

  styles: [styles],
});
