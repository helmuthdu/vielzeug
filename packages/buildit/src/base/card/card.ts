import { colorThemeMixin, frostVariantMixin } from '../../styles';
import type { ElevationLevel, PaddingSize, ThemeColor } from '../../types';

const styles = /* css */ `
  /* Color themes - mixin already defines @layer buildit.themes */
  ${colorThemeMixin()}

  @layer buildit.base {
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
       Card Structure
       ======================================== */

    .card-media {
      overflow: hidden;
      flex-shrink: 0;
    }

    .card-media img {
      width: 100%;
      height: auto;
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
  }

  @layer buildit.variants {
    /* Variant-specific host styles */
    :host(:not([variant])) {
      --_bg: var(--_theme-backdrop);
      --_border-color: var(--_theme-border);
    }

    /* Frost - Translucent effect with backdrop blur */
    :host([variant='frost']:not([color])) {
      --_bg: color-mix(in srgb, var(--color-canvas) 55%, transparent);
      --_border-color: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    }

    :host([variant='frost'][color]) {
      --_bg: color-mix(in srgb, var(--_theme-base) 70%, var(--color-contrast) 10%);
      --_border-color: color-mix(in srgb, var(--_theme-focus) 60%, transparent);
      --_color: color-mix(in srgb, var(--color-contrast) 90%, transparent);
    }

    /* Default with color gets subtle hover effect */
    :host(:not([variant])[color]:hover) .card {
      --_bg: color-mix(in srgb, var(--_theme-base) 16%, var(--color-contrast-50));
      --_border-color: var(--_theme-focus);
    }

    /* ========================================
       Card-Specific Variant Element Styles
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
    :host([variant='glass']) .card {
      backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
      -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
      box-shadow: var(--shadow-md), var(--inset-shadow-xs);
      border: var(--_border) solid var(--_border-color);
      text-shadow: var(--text-shadow-xs);
    }

    /* Card-specific hover states for glass/frost */
    :host([variant='glass']) .card:hover {
      --_bg: color-mix(in srgb, var(--color-secondary) 60%, var(--color-contrast) 20%);
      backdrop-filter: blur(var(--blur-xl)) saturate(200%) brightness(1.1);
      -webkit-backdrop-filter: blur(var(--blur-xl)) saturate(200%) brightness(1.1);
      box-shadow: var(--shadow-xl), var(--inset-shadow-sm);
    }

    :host([variant='glass'][clickable]) .card:hover {
      box-shadow: var(--shadow-2xl), var(--inset-shadow-sm);
    }
  }

  ${frostVariantMixin('.card')}

  @layer buildit.utilities {
    /* Elevation & Padding - IN utilities layer for proper cascade */
    :host([elevation='0']) {
      --_shadow: none;
    }
    :host([elevation='1']) {
      --_shadow: var(--shadow-sm);
    }
    :host([elevation='2']) {
      --_shadow: var(--shadow-md);
    }
    :host([elevation='3']) {
      --_shadow: var(--shadow-lg);
    }
    :host([elevation='4']) {
      --_shadow: var(--shadow-xl);
    }
    :host([elevation='5']) {
      --_shadow: var(--shadow-2xl);
    }

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
    :host([padding='xl']) {
      --_padding: var(--size-8);
    }
  }

  @layer buildit.overrides {
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

    /* ========================================
       Orientation
       ======================================== */

    :host([orientation='horizontal']) .card {
      flex-direction: row;
    }

    :host([orientation='horizontal']) .card-media {
      width: 30%;
      min-width: 192px;
      max-width: 320px;
    }

    :host([orientation='horizontal']) .card-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    :host([orientation='horizontal']) .card-body {
      flex: 1;
    }
  }

  /* Loading animation - unlayered for easy override */
  @keyframes loading-bar {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

/**
 * Card Component Properties
 *
 * A versatile card container with semantic slots for structured content display.
 *
 * ## Slots
 * - **media**: Media content (images, videos) displayed at top/left
 * - **header**: Card header (title, subtitle)
 * - **default**: Main card content
 * - **footer**: Card footer content
 * - **actions**: Action buttons or links
 *
 * ## Events
 * - **cardclick**: Emitted when a clickable card is clicked
 *
 * ## CSS Custom Properties
 * - `--card-bg`: Background color
 * - `--card-color`: Text color
 * - `--card-border`: Border style
 * - `--card-border-color`: Border color
 * - `--card-radius`: Border radius
 * - `--card-padding`: Internal padding
 * - `--card-shadow`: Box shadow
 * - `--card-hover-shadow`: Shadow on hover
 * - `--card-gap`: Gap between sections
 *
 * @example
 * ```html
 * <!-- Basic card -->
 * <bit-card elevation="2">
 *   <h3 slot="header">Article Title</h3>
 *   <p>Article content goes here...</p>
 *   <button slot="actions">Read more</button>
 * </bit-card>
 *
 * <!-- Card with media -->
 * <bit-card variant="solid" color="primary">
 *   <img slot="media" src="image.jpg" alt="Cover">
 *   <h2 slot="header">Product Name</h2>
 *   <p>Product description</p>
 *   <span slot="footer">$99.99</span>
 * </bit-card>
 *
 * <!-- Clickable card -->
 * <bit-card clickable hoverable elevation="1">
 *   <h3 slot="header">Click me</h3>
 *   <p>This entire card is clickable</p>
 * </bit-card>
 *
 * <!-- Horizontal layout -->
 * <bit-card orientation="horizontal" elevation="2">
 *   <img slot="media" src="thumb.jpg">
 *   <h4 slot="header">News Headline</h4>
 *   <p>News summary...</p>
 * </bit-card>
 *
 * <!-- Frost variant -->
 * <bit-card variant="frost" color="secondary" padding="lg">
 *   <h2 slot="header">Frosted Card</h2>
 *   <p>Beautiful glassmorphism effect</p>
 * </bit-card>
 * ```
 */
export interface CardProps {
  /** Visual style variant */
  variant?: 'solid' | 'flat' | 'frost';
  /** Theme color */
  color?: ThemeColor;
  /** Internal padding size */
  padding?: PaddingSize;
  /** Shadow elevation level (0-5) */
  elevation?: `${ElevationLevel}`;
  /** Card orientation */
  orientation?: 'vertical' | 'horizontal';
  /** Show hover effects */
  hoverable?: boolean;
  /** Enable click interaction */
  clickable?: boolean;
  /** Disable card interaction */
  disabled?: boolean;
  /** Show loading state */
  loading?: boolean;
}

/**
 * A versatile card container with semantic slots for header, body, and footer content.
 *
 * @element bit-card
 *
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'frost'
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
 * @attr {string} padding - Internal padding: 'none' | 'sm' | 'md' | 'lg' | 'xl'
 * @attr {string} elevation - Shadow elevation: '0' | '1' | '2' | '3' | '4' | '5'
 * @attr {string} orientation - Card orientation: 'vertical' | 'horizontal'
 * @attr {boolean} hoverable - Show hover effects
 * @attr {boolean} clickable - Enable click interaction
 * @attr {boolean} disabled - Disable card interaction
 * @attr {boolean} loading - Show loading state
 *
 * @fires cardclick - Emitted when a clickable card is clicked
 *
 * @slot media - Media content (images, videos) displayed at top/left
 * @slot header - Card header (title, subtitle)
 * @slot - Main card content
 * @slot footer - Card footer content
 * @slot actions - Action buttons or links
 *
 * @cssprop --card-bg - Background color
 * @cssprop --card-color - Text color
 * @cssprop --card-border - Border width
 * @cssprop --card-border-color - Border color
 * @cssprop --card-radius - Border radius
 * @cssprop --card-padding - Internal padding
 * @cssprop --card-shadow - Box shadow
 * @cssprop --card-hover-shadow - Shadow on hover
 * @cssprop --card-gap - Gap between sections
 */
class BitCard extends HTMLElement {
  static observedAttributes = [
    'variant',
    'color',
    'padding',
    'elevation',
    'orientation',
    'hoverable',
    'clickable',
    'disabled',
    'loading',
  ] as const;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();

    const shadowRoot = this.shadowRoot;
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
    if (mediaSlot) mediaSlot.addEventListener('slotchange', updateSectionVisibility);
    if (headerSlot) headerSlot.addEventListener('slotchange', updateSectionVisibility);
    if (footerSlot) footerSlot.addEventListener('slotchange', updateSectionVisibility);
    if (actionsSlot) actionsSlot.addEventListener('slotchange', updateSectionVisibility);

    // Setup ARIA and keyboard handling for clickable cards
    const isClickable = this.hasAttribute('clickable');
    const isDisabled = this.hasAttribute('disabled');

    if (isClickable) {
      this.setAttribute('role', 'button');
      this.setAttribute('tabindex', isDisabled ? '-1' : '0');
      this.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    }

    // Handle click events for clickable cards
    if (isClickable) {
      this.addEventListener('click', (e) => {
        if (this.hasAttribute('disabled')) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // Emit custom cardclick event with card details
        this.dispatchEvent(
          new CustomEvent('cardclick', {
            bubbles: true,
            composed: true,
            detail: {
              color: this.getAttribute('color'),
              originalEvent: e,
              variant: this.getAttribute('variant'),
            },
          }),
        );
      });

      // Keyboard support
      this.addEventListener('keydown', (e) => {
        const kbEvent = e as KeyboardEvent;
        if (this.hasAttribute('disabled')) return;

        if (kbEvent.key === 'Enter' || kbEvent.key === ' ') {
          kbEvent.preventDefault();
          this.click();
        }
      });
    }
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    // Update ARIA attributes for clickable/disabled states
    if (name === 'clickable') {
      if (newValue !== null) {
        this.setAttribute('role', 'button');
        this.setAttribute('tabindex', this.hasAttribute('disabled') ? '-1' : '0');
      } else {
        this.removeAttribute('role');
        this.removeAttribute('tabindex');
      }
    }

    if (name === 'disabled') {
      const isDisabled = newValue !== null;
      this.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

      if (this.hasAttribute('clickable')) {
        this.setAttribute('tabindex', isDisabled ? '-1' : '0');
      }
    }
  }

  render() {
    this.shadowRoot!.innerHTML = /* html */ `
      <style>${styles}</style>
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
    `;
  }
}

if (!customElements.get('bit-card')) {
  customElements.define('bit-card', BitCard);
}

export default {};
