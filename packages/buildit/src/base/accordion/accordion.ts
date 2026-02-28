import type { ComponentSize, VisualVariant } from '../../types';

const styles = /* css */ `
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
class BitAccordion extends HTMLElement {
  static observedAttributes = ['selection-mode', 'size', 'variant'] as const;

  private syncItems: () => void;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Helper to sync attributes to child items
    this.syncItems = () => {
      const variant = this.getAttribute('variant');
      const size = this.getAttribute('size');
      const items = this.querySelectorAll('bit-accordion-item');

      items.forEach((item) => {
        if (variant) item.setAttribute('variant', variant);
        if (size) item.setAttribute('size', size);
      });
    };
  }

  connectedCallback() {
    this.render();

    // Initial sync
    this.syncItems();

    // Update items when slotted children change
    const slot = this.shadowRoot?.querySelector('slot');
    if (slot) {
      slot.addEventListener('slotchange', this.syncItems);
    }

    // Single-selection behavior
    this.addEventListener('expand', (e) => {
      if (this.getAttribute('selection-mode') === 'single') {
        const expandedItem = e.target as HTMLElement;
        const items = this.querySelectorAll('bit-accordion-item');

        items.forEach((item) => {
          if (item !== expandedItem && item.hasAttribute('expanded')) {
            item.removeAttribute('expanded');
          }
        });

        this.dispatchEvent(new CustomEvent('change', { detail: { expandedItem } }));
      }
    });
  }

  attributeChangedCallback(name: string) {
    if (name === 'variant' || name === 'size') {
      this.syncItems();
    }
  }

  render() {
    this.shadowRoot!.innerHTML = /* html */ `
      <style>${styles}</style>
      <div part="accordion">
        <slot></slot>
      </div>
    `;
  }
}

if (!customElements.get('bit-accordion')) {
  customElements.define('bit-accordion', BitAccordion);
}

export default {};
