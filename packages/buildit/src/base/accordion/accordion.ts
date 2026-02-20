import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-accordion - A container for accordion items
 *
 * @element bit-accordion
 *
 * @attr {string} selection-mode - Selection mode: 'single' | 'multiple' (default: multiple)
 * @attr {string} variant - Visual variant for all items: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text'
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

  :host([variant='text']) {
    gap: 0;
  }

  :host([variant='text']) ::slotted(bit-accordion-item:not(:last-child)) {
    border-bottom: 1px solid var(--color-contrast-200);
  }

  :host([variant='ghost']) {
    gap: 0;
    background: var(--color-contrast-100);
    border-radius: var(--rounded-md);
    padding: var(--size-2);
  }
`;

export type AccordionProps = {
  'selection-mode'?: 'single' | 'multiple';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text';
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

    // Sync when items are added/removed
    const slot = host.shadowRoot?.querySelector('slot');
    if (slot) {
      slot.addEventListener('slotchange', syncItems);
    }

    // Single-selection behavior
    host.addEventListener('expand', (e) => {
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
