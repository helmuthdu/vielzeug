import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-accordion - A container for accordion items
 *
 * @element bit-accordion
 *
 * @attr {string} selection-mode - Selection mode: 'single' | 'multiple' (default: multiple)
 * @attr {string} variant - Visual variant for all items: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost'
 * @attr {string} size - Size for all items: 'sm' | 'md' | 'lg'
 *
 * @slot - Default slot for bit-accordion-item elements
 *
 * @fires change - Emitted when selection changes in single mode.
 *   detail: { expandedItem: HTMLElement | null }
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

  /* Glass variant - translucent with blur */
  :host([variant='glass']) {
    backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
    background: color-mix(in srgb, var(--color-secondary) 30%, var(--color-contrast) 10%);
    box-shadow: var(--shadow-md), var(--inset-shadow-xs);
  }

  /* Frost variant - canvas-based transparency */
  :host([variant='frost']) {
    backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
    background: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    box-shadow: var(--shadow-md), var(--inset-shadow-xs);
  }

  /* Nested item border radius for glass and frost variants */
  :host([variant='glass']) ::slotted(bit-accordion-item),
  :host([variant='frost']) ::slotted(bit-accordion-item) {
    border-radius: 0;
  }

  :host([variant='glass']) ::slotted(bit-accordion-item:first-child),
  :host([variant='frost']) ::slotted(bit-accordion-item:first-child) {
    border-radius: var(--rounded-md) var(--rounded-md) 0 0;
  }

  :host([variant='glass']) ::slotted(bit-accordion-item:last-child),
  :host([variant='frost']) ::slotted(bit-accordion-item:last-child) {
    border-radius: 0 0 var(--rounded-md) var(--rounded-md);
  }

  :host([variant='glass']) ::slotted(bit-accordion-item:only-child),
  :host([variant='frost']) ::slotted(bit-accordion-item:only-child) {
    border-radius: var(--rounded-md);
  }
`;

export type AccordionProps = {
  'selection-mode'?: 'single' | 'multiple';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost';
};

defineElement<HTMLElement, AccordionProps>('bit-accordion', {
  observedAttributes: ['selection-mode', 'size', 'variant'] as const,

  onAttributeChanged(name, _oldValue, _newValue, el) {
    if (name === 'variant' || name === 'size') {
      const host = el as unknown as HTMLElement;
      const variant = host.getAttribute('variant');
      const size = host.getAttribute('size');
      const items = host.querySelectorAll('bit-accordion-item');

      items.forEach((item) => {
        if (variant) item.setAttribute('variant', variant);
        if (size) item.setAttribute('size', size);
      });
    }
  },

  onConnected(el) {
    const host = el as unknown as HTMLElement;

    const syncItems = () => {
      const variant = host.getAttribute('variant');
      const size = host.getAttribute('size');
      const items = host.querySelectorAll('bit-accordion-item');

      items.forEach((item) => {
        if (variant) item.setAttribute('variant', variant);
        if (size) item.setAttribute('size', size);
      });
    };

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
