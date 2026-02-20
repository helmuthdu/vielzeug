import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-accordion-item - An individual accordion item using details/summary
 *
 * @element bit-accordion-item
 *
 * @attr {boolean} expanded - Whether the item is expanded (synced with details[open])
 * @attr {boolean} disabled - Whether the item is disabled
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text'
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 *
 * @slot - Default slot for the accordion body content
 * @slot title - Slot for the summary/title content
 * @slot subtitle - Slot for the subtitle content (appears below the title)
 * @slot prefix - Content before the title
 * @slot suffix - Content after the title
 *
 * @cssprop --accordion-item-bg - Background color
 * @cssprop --accordion-item-border - Border style
 * @cssprop --accordion-item-radius - Border radius
 * @cssprop --accordion-item-padding - Inner padding
 * @cssprop --accordion-item-transition - Transition timing
 *
 * @fires expand - Emitted when the item is expanded
 *   detail: { expanded: true; item: HTMLElement }
 * @fires collapse - Emitted when the item is collapsed
 *   detail: { expanded: false; item: HTMLElement }
 */

const styles = css`
  :host {
    display: block;
    --accordion-details-radius: var(--rounded-md);
    --accordion-item-transition: 200ms ease-in-out;
  }

  details {
    width: 100%;
    border-radius: var(--accordion-item-radius);
    overflow: hidden;
    transition: all var(--accordion-item-transition);
  }

  summary {
    border-radius: var(--accordion-details-radius);
    list-style: none;
    cursor: pointer;
    display: flex;
    font-size: var(--accordion-item-title);
    align-items: center;
    gap: var(--size-4);
    padding: var(--accordion-item-details-padding, var(--size-3) var(--size-4));
    user-select: none;
    transition: all var(--accordion-item-transition);
    outline: none;
    position: relative;
    background: var(--accordion-item-bg);
    border: var(--border) solid var(--accordion-item-border-color);
  }

  summary::-webkit-details-marker {
    display: none;
  }

  .header-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .subtitle {
    font-size: var(--accordion-item-subtitle);
    color: var(--color-contrast-700);
    line-height: var(--leading-md);
  }

  .title {
    font-weight: var(--font-weight-medium);
  }

  .content-wrapper {
    font-size: var(--accordion-item-body);
    padding: var(--accordion-item-summary-padding, var(--size-2) var(--size-4));
    background: var(--accordion-item-bg);
    border-left: 1px solid var(--accordion-item-border-color);
    border-right: 1px solid var(--accordion-item-border-color);
    border-bottom: 1px solid var(--accordion-item-border-color);
    border-radius: var(--accordion-summary-radius);
  }

  /* Variants */
  :host([variant='solid']) {
    --accordion-item-bg: var(--color-contrast-100);
    --accordion-item-border-color: transparent;
  }

  :host([variant='solid']) summary:hover {
    background: var(--color-contrast-200);
  }

  :host([variant='flat']) {
    --accordion-item-bg: var(--color-contrast-300);
    --accordion-item-border-color: transparent;
  }

  :host([variant='flat']) summary:hover {
    background: var(--color-contrast-400);
  }

  :host([variant='bordered']) {
    --accordion-item-bg: var(--color-contrast-100);
    --accordion-item-border-color: var(--color-contrast-400);
  }

  :host([variant='bordered']) summary:hover {
    background: var(--color-contrast-200);
  }

  :host([variant='outline']) {
    --accordion-item-bg: transparent;
    --accordion-item-border-color: var(--color-contrast-400);
  }

  :host([variant='outline']) summary:hover {
    background: var(--color-contrast-300);
  }

  :host([variant='ghost']) {
    --accordion-item-bg: transparent;
    --accordion-item-border-color: transparent;
  }

  :host([variant='ghost']) summary:hover {
    background: var(--color-contrast-200);
  }

  :host([variant='text']) {
    --accordion-item-bg: transparent;
    --accordion-item-border-color: transparent;
  }

  :host([variant='text']) summary:hover {
    /* Intentionally no hover background for text variant */
  }

  /* Sizes */
  :host([size='sm']) {
    --accordion-item-details-padding: var(--size-2) var(--size-4);
    --accordion-item-summary-padding: var(--size-1) var(--size-5);
    --accordion-item-title: var(--text-sm);
    --accordion-item-subtitle: var(--text-xs);
    --accordion-item-body: var(--text-xs);
  }

  :host(:not([size])),
  :host([size='md']) {
    --accordion-item-details-padding: var(--size-3) var(--size-4);
    --accordion-item-summary-padding: var(--size-1) var(--size-5);
    --accordion-item-title: var(--text-md);
    --accordion-item-subtitle: var(--text-sm);
    --accordion-item-body: var(--text-sm);
  }

  :host([size='lg']) {
    --accordion-item-details-padding: var(--size-4) var(--size-4);
    --accordion-item-summary-padding: var(--size-1) var(--size-5);
    --accordion-item-title: var(--text-lg);
    --accordion-item-subtitle: var(--text-md);
    --accordion-item-body: var(--text-md);
  }

  /* States */
  :host([disabled]) {
    opacity: 0.6;
    pointer-events: none;
  }

  /* Chevron animation */
  .chevron {
    width: 1em;
    height: 1em;
    transition: transform var(--accordion-item-transition);
    margin-left: auto;
  }

  details[open] .chevron {
    transform: rotate(-90deg);
  }

  :host([expanded]) {
    --accordion-details-radius: var(--rounded-md) var(--rounded-md) 0 0;
    --accordion-summary-radius: 0 0 var(--rounded-md) var(--rounded-md);
  }
`;

export type AccordionItemProps = {
  expanded?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text';
};

defineElement<HTMLDetailsElement, AccordionItemProps>('bit-accordion-item', {
  observedAttributes: ['expanded', 'disabled', 'size', 'variant'] as const,

  onAttributeChanged(el, name, _oldValue, newValue) {
    if (name === 'expanded') {
      const host = el as unknown as HTMLElement;
      const details = host.shadowRoot?.querySelector('details') as HTMLDetailsElement | null;
      if (details) {
        details.open = newValue !== null;
      }
    }
  },

  onConnected(el) {
    const host = el as unknown as HTMLElement;
    const details = host.shadowRoot?.querySelector('details') as HTMLDetailsElement | null;

    if (!details) return;

    details.addEventListener('toggle', () => {
      const isOpen = details.open;

      if (isOpen && !host.hasAttribute('expanded')) {
        host.setAttribute('expanded', '');
        el.emit('expand', { expanded: true, item: host }, { bubbles: true, composed: true });
      } else if (!isOpen && host.hasAttribute('expanded')) {
        host.removeAttribute('expanded');
        el.emit('collapse', { expanded: false, item: host }, { bubbles: true, composed: true });
      }
    });

    // Initial sync from attribute to details
    details.open = host.hasAttribute('expanded');
  },

  styles: [styles],

  template: (el) => {
    const isExpanded = el.hasAttribute('expanded');
    const isDisabled = el.hasAttribute('disabled');
    const titleId = 'accordion-item-title';

    return html`
      <details ?open="${isExpanded}">
        <summary aria-expanded="${isExpanded ? 'true' : 'false'}" aria-disabled="${isDisabled ? 'true' : 'false'}">
          <slot name="prefix"></slot>
          <div class="header-content">
            <span class="title" id="${titleId}">
              <slot name="title"></slot>
            </span>
            <span class="subtitle">
              <slot name="subtitle"></slot>
            </span>
          </div>
          <slot name="suffix"></slot>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="chevron"
            xmlns="http://www.w3.org/2000/svg">
            <path d="m 14.999979,5.9999793 -5.9999997,5.9999997 5.9999997,6" />
          </svg>
        </summary>
        <div class="content-wrapper" role="region" aria-labelledby="${titleId}">
          <slot></slot>
        </div>
      </details>
    `;
  },
});

export default {};
