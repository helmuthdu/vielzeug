import { css, defineElement, html } from '@vielzeug/craftit';
import type { AccordionEventDetail, ComponentSize, VisualVariant } from '../../types';

/**
 * # bit-accordion-item
 *
 * An individual accordion item with expand/collapse functionality using native details/summary.
 *
 * @element bit-accordion-item
 */

const styles = css`
  @layer buildit.base {
    /* ========================================
       Base Styles & Defaults
       ======================================== */

    :host {
      display: block;
      color: var(--accordion-item-body-color, var(--text-color-body));
      --accordion-details-radius: var(--rounded-md);
      --accordion-item-transition: var(--transition-normal);
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
      font-size: var(--accordion-item-subtitle-size);
      color: var(--accordion-item-subtitle-color, var(--text-color-secondary));
      line-height: var(--leading-normal);
    }

    .title {
      font-weight: var(--font-medium);
      color: var(--accordion-item-title-color, var(--text-color-heading));
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
  }

  @layer buildit.variants {
    /* ========================================
       Visual Variants
       ======================================== */

    :host,
    :host([variant='solid']) {
      --accordion-item-bg: var(--color-contrast-50);
      --accordion-item-border-color: transparent;
    }

    :host summary:hover,
    :host([variant='solid']) summary:hover {
      --accordion-item-bg: var(--color-contrast-200);
    }

    :host([variant='flat']) {
      --accordion-item-bg: var(--color-contrast-100);
    }

    :host([variant='flat']) summary:hover {
      --accordion-item-bg: var(--color-contrast-200);
    }

    :host([variant='bordered']) {
      --accordion-item-bg: var(--color-contrast-100);
      --accordion-item-border-color: var(--color-contrast-300);

      box-shadow: var(--inset-shadow-xs), var(--shadow-2xs);
    }

    :host([variant='bordered']) summary:hover {
      background: var(--color-contrast-200);
    }

    :host([variant='outline']) {
      --accordion-item-bg: transparent;
      --accordion-item-border-color: var(--color-contrast-300);
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
      background: transparent;
    }

    /* Glass & Frost - Shared Styles */
    :host([variant='glass']) details,
    :host([variant='frost']) details {
      border-radius: inherit;
    }

    :host([variant='glass']) summary,
    :host([variant='frost']) summary {
      border-radius: inherit;
      backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    }

    :host([variant='glass']) .content-wrapper,
    :host([variant='frost']) .content-wrapper {
      backdrop-filter: blur(var(--blur-lg)) saturate(180%);
      border-radius: 0;
    }

    /* Glass */
    :host([variant='glass']) {
      --accordion-item-bg: color-mix(in srgb, var(--color-secondary) 30%, var(--color-contrast) 10%);
      --accordion-item-border-color: transparent;
      --accordion-item-title-color: color-mix(in srgb, var(--color-secondary-contrast) 100%, transparent);
      --accordion-item-subtitle-color: color-mix(in srgb, var(--color-secondary-contrast) 60%, transparent);
    --accordion-item-body-color: color-mix(in srgb, var(--color-secondary-contrast) 80%, transparent);
  }

  :host([variant='glass']) summary {
    text-shadow: var(--text-shadow-xs);
  }

  :host([variant='glass']) summary:hover {
    background: color-mix(in srgb, var(--color-secondary) 20%, transparent);
  }

  :host([variant='glass']) .content-wrapper {
    filter: brightness(1.05);
  }

  /* Frost */
  :host([variant='frost']) {
    --accordion-item-bg: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    --accordion-item-border-color: transparent;
  }

  :host([variant='frost']) summary {
    text-shadow: var(--text-shadow-2xs);
  }

  :host([variant='frost']) summary:hover {
    background: color-mix(in srgb, var(--color-canvas) 20%, transparent);
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='sm']) {
    --accordion-item-details-padding: var(--size-2) var(--size-4);
    --accordion-item-summary-padding: var(--size-1) var(--size-5);
    --accordion-item-title: var(--text-sm);
    --accordion-item-subtitle-size: var(--text-xs);
    --accordion-item-body: var(--text-xs);
  }

  :host(:not([size])),
  :host([size='md']) {
    --accordion-item-details-padding: var(--size-3) var(--size-4);
    --accordion-item-summary-padding: var(--size-1) var(--size-5);
    --accordion-item-title: var(--text-base);
    --accordion-item-subtitle-size: var(--text-sm);
    --accordion-item-body: var(--text-sm);
  }

  :host([size='lg']) {
    --accordion-item-details-padding: var(--size-4) var(--size-4);
    --accordion-item-summary-padding: var(--size-1) var(--size-5);
    --accordion-item-title: var(--text-lg);
    --accordion-item-subtitle-size: var(--text-base);
    --accordion-item-body: var(--text-base);
  }

  /* ========================================
     States
     ======================================== */

  :host([disabled]) {
    opacity: 0.6;
    pointer-events: none;
  }

  /* ========================================
     Chevron Animation
     ======================================== */

  .chevron {
    width: var(--size-5);
    height: var(--size-5);
    transition: transform var(--accordion-item-transition);
    margin-left: auto;
  }

  details[open] .chevron {
    transform: rotate(-90deg);
  }

  /* Expanded state - adjust border radius */
  :host([expanded]) {
    --accordion-details-radius: var(--rounded-md) var(--rounded-md) 0 0;
    --accordion-summary-radius: 0 0 var(--rounded-md) var(--rounded-md);
  }
  }
`;

/**
 * Accordion Item Component Properties
 *
 * An individual expandable/collapsible section using native HTML details/summary elements.
 *
 * ## Slots
 * - **prefix**: Content before the title (e.g., icons)
 * - **title**: Main accordion item title
 * - **subtitle**: Optional subtitle text
 * - **suffix**: Content after the title (e.g., badges)
 * - **default**: Accordion item content (shown when expanded)
 *
 * ## Events
 * - **expand**: Emitted when item expands
 * - **collapse**: Emitted when item collapses
 *
 * @example
 * ```html
 * <!-- Basic item -->
 * <bit-accordion-item>
 *   <span slot="title">Click to expand</span>
 *   <p>Hidden content revealed on click</p>
 * </bit-accordion-item>
 *
 * <!-- With subtitle -->
 * <bit-accordion-item expanded>
 *   <span slot="title">Main Title</span>
 *   <span slot="subtitle">Additional info</span>
 *   <p>Content here</p>
 * </bit-accordion-item>
 *
 * <!-- With prefix icon -->
 * <bit-accordion-item variant="bordered" size="lg">
 *   <svg slot="prefix">...</svg>
 *   <span slot="title">Section with Icon</span>
 *   <p>Content</p>
 * </bit-accordion-item>
 *
 * <!-- Disabled -->
 * <bit-accordion-item disabled>
 *   <span slot="title">Cannot expand</span>
 *   <p>Content</p>
 * </bit-accordion-item>
 * ```
 */
export interface AccordionItemProps {
  /** Whether the item is expanded/open */
  expanded?: boolean;
  /** Disable accordion item interaction */
  disabled?: boolean;
  /** Item size */
  size?: ComponentSize;
  /** Visual style variant */
  variant?: VisualVariant;
}

/**
 * Accordion Item Toggle Event Detail
 */
export interface AccordionItemToggleEvent extends AccordionEventDetail {}

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

    // Initial sync
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
