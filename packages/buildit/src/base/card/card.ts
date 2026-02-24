import { css, defineElement, html } from '@vielzeug/craftit';
import { boxBaseCss } from '../../layout/box/box-base.css';

/**
 * bit-card - A versatile card container component
 *
 * Built on the Box theming foundation, adding semantic slots and interactive states.
 *
 * @element bit-card
 *
 * @attr {string} variant - Card style variant: 'frost'
 * @attr {string} color - Color theme: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} padding - Padding size: 'none' | 'sm' | 'md' | 'lg' | 'xl'
 * @attr {string} elevation - Shadow elevation: '0' | '1' | '2' | '3' | '4' | '5'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string} orientation - Card layout: 'vertical' | 'horizontal'
 * @attr {boolean} hoverable - Enable hover effect
 * @attr {boolean} clickable - Enable clickable state with cursor pointer
 * @attr {boolean} disabled - Disable the card (prevents interaction)
 * @attr {boolean} loading - Show loading state
 *
 * @slot - Default slot for card content
 * @slot header - Header section of the card
 * @slot media - Media/image section at the top
 * @slot footer - Footer section of the card
 * @slot actions - Action buttons section (typically in footer)
 *
 * @cssprop --card-bg - Background color
 * @cssprop --card-color - Text color
 * @cssprop --card-border - Border style
 * @cssprop --card-border-color - Border color
 * @cssprop --card-radius - Border radius
 * @cssprop --card-padding - Inner padding
 * @cssprop --card-shadow - Box shadow
 * @cssprop --card-hover-shadow - Hover state shadow
 * @cssprop --card-gap - Gap between sections
 *
 * @fires click - Native click event (when clickable attribute is set and not disabled)
 * @fires cardclick - Custom event with card details (when clickable)
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
      backdrop-filter var(--transition-slow),
      box-shadow var(--transition-normal),
      transform var(--transition-normal),
      background var(--transition-normal),
      border-color var(--transition-normal),
      opacity var(--transition-normal);
    will-change: box-shadow, transform;
    position: relative;
  }

  /* ========================================
     Card-Specific Variant Element Styles (Base variant styles come from box base css)
     ======================================== */

  /* Solid & Flat - Apply borders and shadows to .card element */
  :host(:not([variant])) .card,
  :host([variant='solid']) .card {
    box-shadow: var(--_shadow);
    border: var(--_border) solid var(--_border-color);
  }

  :host([variant='flat']) .card {
    border: var(--_border) solid var(--_border-color);
  }

  /* Glass & Frost - Apply backdrop filters to .card element */
  :host([variant='glass']) .card,
  :host([variant='frost']) .card {
    backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    box-shadow: var(--shadow-md);
    border: var(--_border) solid var(--_border-color);
  }

  :host([variant='glass']) .card {
    backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
    box-shadow: var(--shadow-md), var(--inset-shadow-xs);
    text-shadow: var(--text-shadow-xs);
  }

  :host([variant='frost']) .card {
    text-shadow: var(--text-shadow-2xs);
  }

  /* Card-specific hover states for glass/frost */
  :host([variant='glass']) .card:hover {
    --_bg: color-mix(in srgb, var(--color-secondary) 60%, var(--color-contrast) 20%);
    backdrop-filter: blur(var(--blur-xl)) saturate(200%) brightness(1.1);
    box-shadow: var(--shadow-xl), var(--inset-shadow-sm);
  }

  :host([variant='glass'][clickable]) .card:hover {
    box-shadow: var(--shadow-2xl), var(--inset-shadow-sm);
  }

  :host([variant='frost']) .card:hover {
    --_bg: color-mix(in srgb, var(--color-canvas) 65%, transparent);
    backdrop-filter: blur(var(--blur-xl)) saturate(200%);
    box-shadow: var(--shadow-xl);
  }

  :host([variant='frost'][clickable]) .card:hover {
    box-shadow: var(--shadow-2xl);
  }

  /* ========================================
     Hover Shadow Enhancement
     (Elevation hover states come from boxTheming)
     ======================================== */

  :host([elevation='0']) {
    --_hover-shadow: var(--shadow-sm);
  }

  :host([elevation='1']) {
    --_hover-shadow: var(--shadow-md);
  }

  :host([elevation='2']) {
    --_hover-shadow: var(--shadow-lg);
  }

  :host([elevation='3']) {
    --_hover-shadow: var(--shadow-xl);
  }

  :host([elevation='4']) {
    --_hover-shadow: var(--shadow-2xl);
  }

  :host([elevation='5']) {
    --_hover-shadow: var(--shadow-2xl);
  }

  /* ========================================
     Orientation
     ======================================== */

  :host([orientation='horizontal']) .card {
    flex-direction: row;
  }

  :host([orientation='horizontal']) .card-media {
    width: 30%;
    min-width: 192px;
  }

  :host([orientation='horizontal']) .card-body {
    flex: 1;
  }

  /* ========================================
     States: Disabled & Loading
     ======================================== */

  :host([disabled]) {
    pointer-events: none;
    opacity: 0.6;
  }

  :host([disabled]) .card {
    cursor: not-allowed;
  }

  :host([loading]) .card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--_theme-base, var(--color-primary)), transparent);
    animation: loading-bar 1.5s ease-in-out infinite;
  }

  @keyframes loading-bar {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* ========================================
     Card Structure
     ======================================== */

  .card-media {
    overflow: hidden;
    flex-shrink: 0;
  }

  .card-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0; /* Enable proper flex shrinking */
  }

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

  .card-actions {
    display: flex;
    gap: var(--size-2);
    padding: var(--_padding);
    padding-top: calc(var(--_padding) / 2);
    align-items: center;
    flex-wrap: wrap;
  }

  /* Hidden state for empty sections */
  .card-media[hidden],
  .card-header[hidden],
  .card-footer[hidden],
  .card-actions[hidden] {
    display: none;
  }

  /* Adjust content padding when siblings are visible */
  .card-header:not([hidden]) + .card-content {
    padding-top: calc(var(--_padding) / 2);
  }

  .card-content:has(+ .card-footer:not([hidden])) {
    padding-bottom: calc(var(--_padding) / 2);
  }

  .card-content:has(+ .card-actions:not([hidden])) {
    padding-bottom: calc(var(--_padding) / 2);
  }

  /* ========================================
     Interactive States
     ======================================== */

  :host([hoverable]:hover) .card,
  :host([clickable]:hover) .card {
    box-shadow: var(--_hover-shadow);
    transform: translateY(calc(-1 * var(--size-1))) scale(1.01);
  }

  :host([clickable]) .card {
    cursor: pointer;
  }

  :host([clickable]:active) .card {
    transform: translateY(0) scale(0.99);
    box-shadow: var(--_shadow);
    transition:
      box-shadow var(--transition-fast),
      transform var(--transition-fast);
  }
`;

// -------------------- Props Type --------------------
export type CardProps = {
  variant?: 'solid' | 'flat' | 'glass' | 'frost';
  color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  elevation?: '0' | '1' | '2' | '3' | '4' | '5';
  orientation?: 'vertical' | 'horizontal';
  hoverable?: boolean;
  clickable?: boolean;
  disabled?: boolean;
  loading?: boolean;
};

// -------------------- Component Definition --------------------
defineElement<HTMLElement, CardProps>('bit-card', {
  observedAttributes: [
    'variant',
    'color',
    'padding',
    'elevation',
    'orientation',
    'hoverable',
    'clickable',
    'disabled',
    'loading',
  ] as const,

  onAttributeChanged(name, _oldValue, newValue, el) {
    const host = el as unknown as HTMLElement;

    // Update ARIA attributes for clickable/disabled states
    if (name === 'clickable') {
      if (newValue !== null) {
        host.setAttribute('role', 'button');
        host.setAttribute('tabindex', host.hasAttribute('disabled') ? '-1' : '0');
      } else {
        host.removeAttribute('role');
        host.removeAttribute('tabindex');
      }
    }

    if (name === 'disabled') {
      const isDisabled = newValue !== null;
      host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

      if (host.hasAttribute('clickable')) {
        host.setAttribute('tabindex', isDisabled ? '-1' : '0');
      }
    }
  },

  onConnected(el) {
    const host = el as unknown as HTMLElement;
    const shadowRoot = host.shadowRoot;

    if (!shadowRoot) return;

    // Get references to slots and containers
    const mediaSlot = shadowRoot.querySelector('slot[name="media"]') as HTMLSlotElement;
    const headerSlot = shadowRoot.querySelector('slot[name="header"]') as HTMLSlotElement;
    const footerSlot = shadowRoot.querySelector('slot[name="footer"]') as HTMLSlotElement;
    const actionsSlot = shadowRoot.querySelector('slot[name="actions"]') as HTMLSlotElement;

    const cardMedia = shadowRoot.querySelector('.card-media') as HTMLElement;
    const cardHeader = shadowRoot.querySelector('.card-header') as HTMLElement;
    const cardFooter = shadowRoot.querySelector('.card-footer') as HTMLElement;
    const cardActions = shadowRoot.querySelector('.card-actions') as HTMLElement;

    // Helper to update section visibility
    const updateSectionVisibility = () => {
      if (mediaSlot && cardMedia) {
        const hasMediaContent = mediaSlot.assignedElements().length > 0;
        cardMedia.toggleAttribute('hidden', !hasMediaContent);
      }

      if (headerSlot && cardHeader) {
        const hasHeaderContent = headerSlot.assignedElements().length > 0;
        cardHeader.toggleAttribute('hidden', !hasHeaderContent);
      }

      if (footerSlot && cardFooter) {
        const hasFooterContent = footerSlot.assignedElements().length > 0;
        cardFooter.toggleAttribute('hidden', !hasFooterContent);
      }

      if (actionsSlot && cardActions) {
        const hasActionsContent = actionsSlot.assignedElements().length > 0;
        cardActions.toggleAttribute('hidden', !hasActionsContent);
      }
    };

    // Initial sync
    requestAnimationFrame(() => {
      updateSectionVisibility();
    });

    // Listen for slot changes
    if (mediaSlot) el.on(mediaSlot, 'slotchange', updateSectionVisibility);
    if (headerSlot) el.on(headerSlot, 'slotchange', updateSectionVisibility);
    if (footerSlot) el.on(footerSlot, 'slotchange', updateSectionVisibility);
    if (actionsSlot) el.on(actionsSlot, 'slotchange', updateSectionVisibility);

    // Setup ARIA and keyboard handling for clickable cards
    const isClickable = host.hasAttribute('clickable');
    const isDisabled = host.hasAttribute('disabled');

    if (isClickable) {
      host.setAttribute('role', 'button');
      host.setAttribute('tabindex', isDisabled ? '-1' : '0');
      host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    }

    // Handle click events for clickable cards
    if (isClickable) {
      el.on('click', (e) => {
        if (host.hasAttribute('disabled')) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // Emit custom cardclick event with card details
        el.emit('cardclick', {
          color: host.getAttribute('color'),
          originalEvent: e,
          variant: host.getAttribute('variant'),
        });
      });

      // Keyboard support
      el.on('keydown', (e) => {
        if (host.hasAttribute('disabled')) return;

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          host.click();
        }
      });
    }
  },

  styles: [boxBaseCss, styles], // Shared theming + Card-specific styles

  template: () => html`
    <div class="card">
      <div class="card-media">
        <slot name="media"></slot>
      </div>
      <div class="card-body">
        <div class="card-header">
          <slot name="header"></slot>
        </div>
        <div class="card-content">
          <slot></slot>
        </div>
        <div class="card-footer">
          <slot name="footer"></slot>
        </div>
        <div class="card-actions">
          <slot name="actions"></slot>
        </div>
      </div>
    </div>
  `,
});

export default {};

