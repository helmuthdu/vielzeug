import { css, define, defineEmits, defineProps, handle, html, onCleanup, onMount, ref, watch } from '@vielzeug/craftit';
import type { ComponentSize, VisualVariant } from '../../types';

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
  'selection-mode'?: 'single' | 'multiple';
  /** Size for all items (propagated to children) */
  size?: ComponentSize;
  /** Visual variant for all items (propagated to children) */
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

define('bit-accordion', ({ host }) => {
  const props = defineProps({
    size: { default: undefined as ComponentSize | undefined },
    variant: { default: undefined as VisualVariant | undefined },
  });

  const slotRef = ref<HTMLSlotElement>();
  const emit = defineEmits<{ change: { expandedItem: HTMLElement } }>();

  const syncItems = () => {
    const variant = props.variant.value;
    const size = props.size.value;
    host.querySelectorAll('bit-accordion-item').forEach((item) => {
      if (variant) item.setAttribute('variant', variant);
      if (size) item.setAttribute('size', size);
    });
  };

  watch([props.variant, props.size], () => syncItems(), { immediate: true });

  const handleExpand = (e: Event) => {
    const selectionMode = host.getAttribute('selection-mode');
    if (selectionMode === 'single') {
      const expandedItem = e.target as HTMLElement;
      host.querySelectorAll('bit-accordion-item').forEach((item) => {
        if (item !== expandedItem && item.hasAttribute('expanded')) {
          item.removeAttribute('expanded');
        }
      });
      emit('change', { expandedItem });
    }
  };

  host.addEventListener('expand', handleExpand);
  onCleanup(() => host.removeEventListener('expand', handleExpand));

  onMount(() => {
    // slotRef.value is only available after template render
    const slot = slotRef.value;
    if (slot) handle(slot, 'slotchange', syncItems);
  });

  return {
    styles: [styles],
    template: html`<slot ref=${slotRef}></slot>`,
  };
});

export default {};
