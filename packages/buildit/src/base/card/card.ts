import { aria, css, define, defineEmits, defineProps, guard, handle, html, watch } from '@vielzeug/craftit';
import { colorThemeMixin, frostVariantMixin } from '../../styles';
import type { ElevationLevel, PaddingSize, ThemeColor } from '../../types';

const styles = /* css */ css`
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

    /* Hide sections when no content is slotted */
    :host:not(:has([slot='media'])) .card-media,
    :host:not(:has([slot='header'])) .card-header,
    :host:not(:has([slot='footer'])) .card-footer,
    :host:not(:has([slot='actions'])) .card-actions {
      display: none;
    }

    /* Adjust content padding when adjacent sections are visible */
    :host(:has([slot='header'])) .card-header + .card-content {
      padding-top: calc(var(--_padding) / 2);
    }

    :host(:has([slot='footer'])) .card-content:has(+ .card-footer) {
      padding-bottom: calc(var(--_padding) / 2);
    }

    :host(:has([slot='actions'])) .card-content:has(+ .card-actions) {
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

/** Card component properties */
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
 *
 * @example
 * ```html
 * <bit-card elevation="2"><h3 slot="header">Title</h3><p>Content</p></bit-card>
 * <bit-card clickable hoverable><h3 slot="header">Click me</h3></bit-card>
 * <bit-card variant="frost" color="secondary">Frosted card</bit-card>
 * ```
 */
define('bit-card', ({ host }) => {
  const props = defineProps({
    clickable: { default: false },
    color: { default: undefined as ThemeColor | undefined },
    disabled: { default: false },
    elevation: { default: undefined as `${ElevationLevel}` | undefined },
    hoverable: { default: false },
    loading: { default: false },
    orientation: { default: undefined as 'vertical' | 'horizontal' | undefined },
    padding: { default: undefined as PaddingSize | undefined },
    variant: { default: undefined as 'solid' | 'flat' | 'frost' | undefined },
  });

  const emit = defineEmits<{
    cardclick: { color: ThemeColor | undefined; originalEvent: Event; variant: string | undefined };
  }>();

  aria({ disabled: () => (props.clickable.value ? props.disabled.value : null) });

  // Role/tabindex for clickable cards
  watch(
    [props.clickable, props.disabled],
    () => {
      if (props.clickable.value) {
        host.setAttribute('role', 'button');
        host.setAttribute('tabindex', props.disabled.value ? '-1' : '0');
      } else {
        host.removeAttribute('role');
        host.removeAttribute('tabindex');
      }
    },
    { immediate: true },
  );

  const handleClick = guard(
    () => props.clickable.value,
    (e: MouseEvent) => {
      if (props.disabled.value) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      emit('cardclick', { color: props.color.value, originalEvent: e, variant: props.variant.value });
    },
  );

  const handleKeydown = guard(
    () => props.clickable.value && !props.disabled.value,
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        host.click();
      }
    },
  );

  handle(host, 'click', handleClick);
  handle(host, 'keydown', handleKeydown);

  return {
    styles: [styles],
    template: html` <div class="card" part="card">
      <div class="card-media" part="media">
        <slot name="media"></slot>
      </div>
      <div class="card-body" part="body">
        <div class="card-header" part="header">
          <slot name="header"></slot>
        </div>
        <div class="card-content" part="content">
          <slot></slot>
        </div>
        <div class="card-footer" part="footer">
          <slot name="footer"></slot>
        </div>
        <div class="card-actions" part="actions">
          <slot name="actions"></slot>
        </div>
      </div>
    </div>`,
  };
});

export default {};
