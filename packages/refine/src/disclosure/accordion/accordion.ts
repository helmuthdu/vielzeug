import { createContext, define, html, prop, bind, getHost, provide, useEmit } from '@vielzeug/ore';
import { computed, type Readable } from '@vielzeug/ripple';

import type { ComponentSize, SurfaceVariant } from '../../types';

import { createListControl } from '../../headless';
import styles from './accordion.css?inline';

/** Context provided by ore-accordion to its ore-accordion-item children. */
export type AccordionContext = {
  selectionMode: Readable<'single' | 'multiple' | undefined>;
  size: Readable<ComponentSize | undefined>;
  variant: Readable<SurfaceVariant | undefined>;
};
/** Injection key for the accordion context. */
export const ACCORDION_CTX = createContext<AccordionContext>('AccordionContext');

/** Accordion component properties */

export type OreAccordionEvents = {
  change: { expandedItem: HTMLElement };
};

export type OreAccordionProps = {
  /** Selection mode (single = only one opens, multiple = multiple can be open) */
  selectionMode?: 'single' | 'multiple';
  /** Size for all items (propagated via context) */
  size?: ComponentSize;
  /** Visual variant for all items (propagated via context) */
  variant?: SurfaceVariant;
};

/**
 * A container for accordion items with single or multiple selection modes.
 *
 * @element ore-accordion
 * @element ore-accordion-item - Child element for each collapsible panel
 *
 * @attr {string} selection-mode - Selection mode: 'single' | 'multiple'
 * @attr {string} size - Size for all items: 'sm' | 'md' | 'lg' (propagated to children)
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'text' | 'glass' | 'frost' (propagated to children)
 *
 * @fires expand - Emitted when an item expands. detail: { expanded: boolean; item: HTMLElement }
 * @fires change - Emitted when selection changes (single mode). detail: { expandedItem: HTMLElement }
 *
 * @slot - `ore-accordion-item` elements
 *
 * @cssprop --accordion-bg - Container background color (solid/flat/glass/frost variants)
 * @cssprop --accordion-border-color - Container border color (solid/flat variants)
 * @cssprop --accordion-divider-color - Divider color between items (text variant)
 * @cssprop --accordion-shadow - Container box shadow
 * @example
 * ```html
 * <ore-accordion selection-mode="single">
 *   <ore-accordion-item>
 *     <span slot="title">What is Refine?</span>
 *     <p>Refine is a headless web component library.</p>
 *   </ore-accordion-item>
 *   <ore-accordion-item>
 *     <span slot="title">How do I install it?</span>
 *     <p>Run <code>npm install @vielzeug/refine</code>.</p>
 *   </ore-accordion-item>
 * </ore-accordion>
 * <ore-accordion variant="bordered" selection-mode="multiple">
 *   <ore-accordion-item expanded><span slot="title">Open by default</span><p>Content</p></ore-accordion-item>
 * </ore-accordion>
 * ```
 */

export const ACCORDION_TAG = 'ore-accordion' as const;
define<OreAccordionProps>(ACCORDION_TAG, {
  props: {
    selectionMode: prop.string<'single' | 'multiple'>(),
    size: prop.string<ComponentSize>(),
    variant: prop.string<SurfaceVariant>(),
  },

  setup(props) {
    const el = getHost();
    const emit = useEmit<OreAccordionEvents>();

    const handleSelectionMode = (expandedItem: HTMLElement) => {
      if (props.selectionMode.value !== 'single') return;

      el.querySelectorAll(':scope > ore-accordion-item[expanded]').forEach((item) => {
        if (item !== expandedItem && item.hasAttribute('expanded')) {
          item.removeAttribute('expanded');
        }
      });

      emit('change', { expandedItem });
    };

    const getAccordionItems = () => {
      return [...el.querySelectorAll<HTMLElement>(':scope > ore-accordion-item:not([disabled])')];
    };

    const getSummaryElements = () => {
      return getAccordionItems()
        .map((item) => item.shadowRoot?.querySelector<HTMLElement>('summary'))
        .filter(Boolean) as HTMLElement[];
    };

    const listControl = createListControl({
      getItems: () => getAccordionItems(),
      loop: true,
      onNavigate: (_action, index) => {
        const summaries = getSummaryElements();

        summaries[index]?.focus();
      },
    });

    provide(ACCORDION_CTX, {
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

          if (!expandedItem || expandedItem.localName !== 'ore-accordion-item') return;

          // Guard: only respond to accordion-items that belong to THIS accordion instance
          if (expandedItem.closest('ore-accordion') !== el) return;

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

          listControl.set(focused);
          listControl.handleKeydown(evt);
        },
      },
    });

    return html`<slot></slot>`;
  },

  styles: [styles],
});
