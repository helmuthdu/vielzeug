import { css, defineElement, html } from '@vielzeug/craftit';
import type { ComponentSize, VisualVariant } from '../../types';

/**
 * # bit-accordion
 *
 * A container for accordion items with single or multiple selection modes.
 *
 * @element bit-accordion
 */

const styles = css`
  :host {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
    width: 100%;
  }

  ::slotted(bit-accordion-item) {
    width: 100%;
  }

  /* ========================================
     Visual Variants
     ======================================== */

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
`;

/**
 * Accordion Component Properties
 *
 * A container for managing multiple accordion items with coordinated expand/collapse behavior.
 *
 * ## Slots
 * - **default**: accordion-item elements
 *
 * ## Events
 * - **expand**: Emitted when an item expands
 * - **change**: Emitted when selection changes (single mode)
 *
 * ## Behavior
 * - **single mode**: Only one item can be expanded at a time
 * - **multiple mode**: Multiple items can be expanded simultaneously (default)
 * - Propagates `variant` and `size` to all child items
 *
 * @example
 * ```html
 * <!-- Single selection mode -->
 * <bit-accordion selection-mode="single" variant="bordered">
 *   <bit-accordion-item>
 *     <span slot="title">Section 1</span>
 *     <p>Content for section 1</p>
 *   </bit-accordion-item>
 *   <bit-accordion-item>
 *     <span slot="title">Section 2</span>
 *     <p>Content for section 2</p>
 *   </bit-accordion-item>
 * </bit-accordion>
 *
 * <!-- Multiple selection (default) -->
 * <bit-accordion variant="solid" size="lg">
 *   <bit-accordion-item expanded>
 *     <span slot="title">FAQ 1</span>
 *     <p>Answer 1</p>
 *   </bit-accordion-item>
 *   <bit-accordion-item>
 *     <span slot="title">FAQ 2</span>
 *     <p>Answer 2</p>
 *   </bit-accordion-item>
 * </bit-accordion>
 *
 * <!-- Frost variant -->
 * <bit-accordion variant="frost" size="md">
 *   <bit-accordion-item>
 *     <span slot="title">Features</span>
 *     <p>Feature list...</p>
 *   </bit-accordion-item>
 * </bit-accordion>
 * ```
 */
export type AccordionProps = {
  /** Selection mode (single = only one open, multiple = multiple can be open) */
  'selection-mode'?: 'single' | 'multiple';
  /** Size for all items (propagated to children) */
  size?: ComponentSize;
  /** Visual variant for all items (propagated to children) */
  variant?: VisualVariant;
}

defineElement<HTMLElement, AccordionProps>('bit-accordion', {
  observedAttributes: ['selection-mode', 'size', 'variant'] as const,

  onAttributeChanged(name, _oldValue, _newValue, el) {
    if (name === 'variant' || name === 'size') {
      const host = el as unknown as HTMLElement;
      // Reuse the syncItems function stored on the element
      const syncFn = (host as any).__syncItems;
      if (syncFn) syncFn();
    }
  },

  onConnected(el) {
    const host = el as unknown as HTMLElement;

    // Helper to sync attributes to child items
    const syncItems = () => {
      const variant = host.getAttribute('variant');
      const size = host.getAttribute('size');
      const items = host.querySelectorAll('bit-accordion-item');

      items.forEach((item) => {
        if (variant) item.setAttribute('variant', variant);
        if (size) item.setAttribute('size', size);
      });
    };

    // Store for use in onAttributeChanged
    (host as any).__syncItems = syncItems;

    // Initial sync
    syncItems();

    // Update items when slotted children change
    const slot = host.shadowRoot?.querySelector('slot');
    if (slot) {
      slot.addEventListener('slotchange', syncItems);
    }

    // Single-selection behavior (2 params = host element)
    el.on('expand', (e) => {
      if (host.getAttribute('selection-mode') === 'single') {
        const expandedItem = e.target as HTMLElement;
        const items = host.querySelectorAll('bit-accordion-item');

        items.forEach((item) => {
          if (item !== expandedItem && item.hasAttribute('expanded')) {
            item.removeAttribute('expanded');
          }
        });

        el.emit('change', { expandedItem });
      }
    });
  },

  styles: [styles],

  template: () => html`<slot></slot>`,
});

export default {};
