import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-card - A versatile card container component
 *
 * @element bit-card
 *
 * @attr {string} variant - Card style variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost'
 * @attr {string} padding - Padding size: 'none' | 'sm' | 'md' | 'lg'
 * @attr {boolean} hoverable - Enable hover effect
 * @attr {boolean} clickable - Enable clickable state with cursor pointer (native click events bubble normally)
 *
 * @slot - Default slot for card content
 * @slot header - Header section of the card
 * @slot footer - Footer section of the card
 *
 * @cssprop --card-bg - Background color
 * @cssprop --card-color - Text color
 * @cssprop --card-border - Border style
 * @cssprop --card-border-color - Border color
 * @cssprop --card-radius - Border radius
 * @cssprop --card-padding - Inner padding
 * @cssprop --card-shadow - Box shadow
 * @cssprop --card-hover-shadow - Hover state shadow
 * @cssprop --card-gap - Gap between header, content, and footer
 *
 * @fires click - Native click event (when clickable attribute is set)
 */

// -------------------- Styles --------------------
const styles = css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    --_bg: var(--card-bg, var(--color-contrast-50));
    --_color: var(--card-color, var(--color-contrast-900));
    --_border: var(--card-border, var(--border));
    --_border-color: var(--card-border-color, var(--color-contrast-300));
    --_radius: var(--card-radius, var(--rounded-md));
    --_padding: var(--card-padding, var(--size-4));
    --_shadow: var(--card-shadow, var(--shadow-sm));
    --_hover-shadow: var(--card-hover-shadow, var(--shadow-md));
    --_gap: var(--card-gap, var(--size-3));

    display: block;
    position: relative;
  }

  .card {
    display: flex;
    flex-direction: column;
    background: var(--_bg);
    color: var(--_color);
    border-radius: var(--_radius);
    overflow: hidden;
    transition:
      box-shadow var(--transition-normal),
      transform var(--transition-normal),
      border-color var(--transition-normal);
  }

  /* ========================================
     Variant Styles
     ======================================== */

  /* Default: Solid */
  :host(:not([variant])),
  :host([variant='solid']) {
    --_bg: var(--card-bg, var(--color-contrast-50));
    --_shadow: var(--card-shadow, var(--shadow-md));
  }

  :host(:not([variant])) .card,
  :host([variant='solid']) .card {
    box-shadow: var(--_shadow);
    border: var(--_border) solid var(--_border-color);
  }

  /* Flat */
  :host([variant='flat']) {
    --_bg: var(--card-bg, var(--color-contrast-100));
    --_border-color: transparent;
    --_shadow: var(--inset-shadow-2xs);
  }

  :host([variant='flat']) .card {
    box-shadow: var(--_shadow);
    border: none;
  }

  /* Bordered */
  :host([variant='bordered']) {
    --_bg: var(--card-bg, var(--color-contrast-100));
    --_border-color: var(--card-border-color, var(--color-contrast-300));
    --_shadow: none;
  }

  :host([variant='bordered']) .card {
    box-shadow: var(--_shadow);
    border: var(--_border) solid var(--_border-color);
  }

  /* Outline */
  :host([variant='outline']) {
    --_bg: transparent;
    --_border-color: var(--card-border-color, var(--color-contrast-300));
    --_shadow: none;
  }

  :host([variant='outline']) .card {
    box-shadow: none;
    border: var(--_border) solid var(--_border-color);
  }

  /* Ghost */
  :host([variant='ghost']) {
    --_bg: transparent;
    --_border-color: transparent;
    --_shadow: none;
  }

  :host([variant='ghost']) .card {
    box-shadow: none;
    border: none;
  }

  :host([variant='ghost']) .card:hover {
    --_bg: var(--color-contrast-100);
  }

  /* Text */
  :host([variant='text']) {
    --_bg: transparent;
    --_border-color: transparent;
    --_shadow: none;
  }

  :host([variant='text']) .card {
    box-shadow: none;
    border: none;
  }

  /* ========================================
     Glass & Frost Variants
     ======================================== */

  :host([variant='glass']) {
    --_bg: var(--card-bg, color-mix(in srgb, var(--color-secondary) 70%, var(--color-contrast) 10%));
    --_border-color: color-mix(in srgb, var(--color-secondary-focus) 60%, transparent);
    --_color: var(--card-color, color-mix(in srgb, var(--color-secondary-contrast) 90%, transparent));
  }

  :host([variant='glass']) .card {
    backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
    box-shadow: var(--shadow-md), var(--inset-shadow-xs);
    border: var(--_border) solid var(--_border-color);
    text-shadow: var(--text-shadow-xs);
  }

  :host([variant='glass']) .card:hover {
    --_bg: color-mix(in srgb, var(--color-secondary) 60%, var(--color-contrast) 20%);
  }

  :host([variant='frost']) {
    --_bg: var(--card-bg, color-mix(in srgb, var(--color-canvas) 55%, transparent));
    --_border-color: color-mix(in srgb, var(--color-canvas) 55%, transparent);
  }

  :host([variant='frost']) .card {
    backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    box-shadow: var(--shadow-md);
    border: var(--_border) solid var(--_border-color);
    text-shadow: var(--text-shadow-2xs);
  }

  :host([variant='frost']) .card:hover {
    --_bg: color-mix(in srgb, var(--color-canvas) 65%, transparent);
  }

  /* ========================================
     Padding Variants
     ======================================== */

  :host([padding='none']) {
    --_padding: var(--size-0);
  }

  :host([padding='sm']) {
    --_padding: var(--size-3);
  }

  :host([padding='md']) {
    --_padding: var(--size-4);
  }

  :host([padding='lg']) {
    --_padding: var(--size-6);
  }

  /* ========================================
     Interactive States
     ======================================== */

  :host([hoverable]) .card,
  :host([clickable]) .card {
    transition:
      box-shadow var(--transition-normal),
      transform var(--transition-normal),
      border-color var(--transition-normal);
  }

  :host([hoverable]:hover) .card,
  :host([clickable]:hover) .card {
    --_shadow: var(--shadow-xl);
    transform: translateY(calc(-1 * var(--size-1)));
  }

  :host([clickable]) .card {
    cursor: pointer;
  }

  :host([clickable]:active) .card {
    transform: translateY(0);
    box-shadow: var(--_shadow);
  }

  /* ========================================
     Card Structure
     ======================================== */

  .card-header,
  .card-content,
  .card-footer {
    padding: var(--_padding);
  }

  .card-header {
    padding-bottom: calc(var(--_padding) / 2);
  }

  .card-footer {
    padding-top: calc(var(--_padding) / 2);
  }

  .card-content {
    flex: 1;
  }

  /* Hidden state for empty sections */
  .card-header[hidden],
  .card-footer[hidden] {
    display: none;
  }

  /* Adjust content padding when siblings are visible */
  .card-header:not([hidden]) + .card-content {
    padding-top: calc(var(--_padding) / 2);
  }

  .card-content:has(+ .card-footer:not([hidden])) {
    padding-bottom: calc(var(--_padding) / 2);
  }
`;

// -------------------- Props Type --------------------
export type CardProps = {
  variant?: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  clickable?: boolean;
};

// -------------------- Component Definition --------------------
defineElement<HTMLElement, CardProps>('bit-card', {
  observedAttributes: ['variant', 'padding', 'hoverable', 'clickable'] as const,

  onConnected(el) {
    const host = el as unknown as HTMLElement;
    const shadowRoot = host.shadowRoot;

    if (!shadowRoot) return;

    // Get references to slots and containers
    const headerSlot = shadowRoot.querySelector('slot[name="header"]') as HTMLSlotElement;
    const footerSlot = shadowRoot.querySelector('slot[name="footer"]') as HTMLSlotElement;
    const cardHeader = shadowRoot.querySelector('.card-header') as HTMLElement;
    const cardFooter = shadowRoot.querySelector('.card-footer') as HTMLElement;

    // Function to update header/footer visibility
    const updateSectionVisibility = () => {
      if (headerSlot && cardHeader) {
        // Use assignedElements() to ignore text nodes (like whitespace)
        const hasHeaderContent = headerSlot.assignedElements().length > 0;
        cardHeader.toggleAttribute('hidden', !hasHeaderContent);
      }

      if (footerSlot && cardFooter) {
        // Use assignedElements() to ignore text nodes (like whitespace)
        const hasFooterContent = footerSlot.assignedElements().length > 0;
        cardFooter.toggleAttribute('hidden', !hasFooterContent);
      }
    };

    // Use requestAnimationFrame to ensure DOM is fully ready
    requestAnimationFrame(() => {
      updateSectionVisibility();
    });

    // Listen for slot changes using el.on() for automatic cleanup
    if (headerSlot) {
      el.on(headerSlot, 'slotchange', updateSectionVisibility);
    }
    if (footerSlot) {
      el.on(footerSlot, 'slotchange', updateSectionVisibility);
    }
  },

  styles: [styles],

  template: () => html`
    <div class="card">
      <div class="card-header">
        <slot name="header"></slot>
      </div>
      <div class="card-content">
        <slot></slot>
      </div>
      <div class="card-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  `,
});

export default {};

