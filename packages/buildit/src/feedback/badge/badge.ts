import { computed, css, define, html, prop } from '@vielzeug/craftit';
import { colorThemeMixin, frostVariantMixin, roundedVariantMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_bg: var(--badge-bg, var(--_theme-backdrop));
      --_color: var(--badge-color, var(--_theme-base));
      --_border-color: var(--badge-border-color, var(--_theme-border));
      --_radius: var(--badge-radius, var(--rounded-full));
      --_font-size: var(--badge-font-size, var(--text-xs));
      --_font-weight: var(--badge-font-weight, var(--font-semibold));
      --_padding-x: var(--badge-padding-x, var(--size-1-5));
      --_padding-y: var(--badge-padding-y, var(--size-0-5));
      --_gap: var(--badge-gap, var(--size-1));

      display: inline-flex;
      vertical-align: middle;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--_gap);
      background: var(--_bg);
      color: var(--_color);
      border: var(--border) solid var(--_border-color);
      border-radius: var(--_radius);
      font-size: var(--_font-size);
      font-weight: var(--_font-weight);
      padding: var(--_padding-y) var(--_padding-x);
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: var(--badge-max-width, 24ch);
      /* Dot-only (no text slot) gets circular shape */
      min-width: var(--size-2);
    }

    ::slotted([slot='icon']) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 1em;
      height: 1em;
    }
  }

  @layer buildit.variants {
    /* Solid (Default) - Full theme color background */
    :host(:not([variant])),
    :host([variant='solid']) {
      --_bg: var(--badge-bg, var(--_theme-base));
      --_color: var(--badge-color, var(--_theme-contrast));
      --_border-color: var(--badge-border-color, var(--_theme-base));
    }

    /* Flat - Subtle background with theme color text */
    :host([variant='flat']) {
      --_bg: var(--badge-bg, color-mix(in srgb, var(--_theme-backdrop) 8%, var(--color-contrast-100)));
      --_color: var(--badge-color, var(--_theme-base));
      --_border-color: var(--badge-border-color, color-mix(in srgb, var(--_theme-focus) 20%, transparent));
    }

    /* Bordered - Outlined with filled background */
    :host([variant='bordered']) {
      --_bg: var(--badge-bg, var(--_theme-backdrop));
      --_color: var(--badge-color, var(--_theme-base));
      --_border-color: var(--badge-border-color, var(--_theme-border));
    }

    /* Outline - Transparent with colored border */
    :host([variant='outline']) {
      --_bg: var(--badge-bg, transparent);
      --_color: var(--badge-color, var(--_theme-base));
      --_border-color: var(--badge-border-color, var(--_theme-base));
    }

    /* Dot-only mode */
    :host([dot]) .badge {
      padding: var(--size-1);
      min-width: unset;
      line-height: 0;
    }
  }


  @layer buildit.overrides {
    /* Dot — always force badge background and border regardless of variant */
    :host([dot]) {
      --_bg: var(--badge-bg, var(--_theme-base));
      --_border-color: var(--badge-border-color, var(--_theme-base));
    }

    /* ========================================
       Anchor overlay mode
       ======================================== */

    :host([anchor]) {
      display: inline-flex;
      position: relative;
    }

    /*
     * Per-direction multiplier: +1 in LTR, -1 in RTL.
     * Used to flip the translateX offset so the badge always overflows
     * the correct physical edge that corresponds to its logical corner.
     */
    :host { --_dir: 1; }
    :host(:dir(rtl)) { --_dir: -1; }

    /* Default position: top-end */
    :host([anchor]) .badge {
      position: absolute;
      z-index: 1;
      top: 0;
      inset-inline-end: 0;
      transform: translate(calc(var(--_dir) * 50%), -50%);
    }

    :host([anchor='top-start']) .badge {
      inset-inline-end: unset;
      inset-inline-start: 0;
      transform: translate(calc(var(--_dir) * -50%), -50%);
    }

    :host([anchor='bottom-end']) .badge {
      top: unset;
      bottom: 0;
      transform: translate(calc(var(--_dir) * 50%), 50%);
    }

    :host([anchor='bottom-start']) .badge {
      inset-inline-end: unset;
      inset-inline-start: 0;
      top: unset;
      bottom: 0;
      transform: translate(calc(var(--_dir) * -50%), 50%);
    }
  }
`;

type BadgeVariant = Extract<VisualVariant, 'solid' | 'flat' | 'bordered' | 'outline' | 'frost'>;

/** Badge component properties */
export interface BadgeProps {
  /** Theme color */
  color?: ThemeColor;
  /** Visual style variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: ComponentSize;
  /** Numeric count to display */
  count?: number;
  /** Max count — displays "<max>+" when count exceeds this value */
  max?: number;
  /** Render as a small dot with no label */
  dot?: boolean;
  /** Border radius override */
  rounded?: RoundedSize;
  /**
   * When set, switches to overlay mode: the host becomes `position:relative`
   * and the badge pins to a corner over the slotted content.
   * Value controls which corner: 'top-end' (default) | 'top-start' | 'bottom-end' | 'bottom-start'
   */
  anchor?: 'top-end' | 'top-start' | 'bottom-end' | 'bottom-start';
  /** Accessible label for assistive technology. Recommended for count-only and dot mode. */
  ariaLabel?: string;
}

/**
 * A compact badge/chip for counts, statuses, and labels.
 * Supports numeric counts with overflow, dot mode, and icon slots.
 *
 * @element bit-badge
 *
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'frost'
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * @attr {number} count - Numeric count to display
 * @attr {number} max - Max count before showing "<max>+"
 * @attr {boolean} dot - Render as a dot indicator (no text)
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'full' etc.
 *
 * @slot - Badge label text
 * @slot icon - Icon displayed before the label
 * @slot target - Element the badge is anchored to (used with the anchor attribute)
 *
 * @cssprop --badge-bg - Badge background color
 * @cssprop --badge-color - Badge text color
 * @cssprop --badge-border-color - Badge border color
 * @cssprop --badge-radius - Border radius
 * @cssprop --badge-font-size - Font size
 * @cssprop --badge-font-weight - Font weight
 * @cssprop --badge-padding-x - Horizontal padding
 * @cssprop --badge-padding-y - Vertical padding
 * @cssprop --badge-gap - Gap between icon and label
 *
 * @example
 * ```html
 * <bit-badge color="primary">New</bit-badge>
 * <bit-badge color="error" count="5"></bit-badge>
 * <bit-badge color="error" count="120" max="99"></bit-badge>
 * <bit-badge color="success" dot></bit-badge>
 * <bit-badge color="warning" variant="flat">Beta</bit-badge>
 * ```
 */
export const TAG = define('bit-badge', () => {
  const countProp = prop('count', undefined as number | undefined);
  const maxProp = prop('max', undefined as number | undefined);
  const ariaLabelProp = prop('aria-label', undefined as string | undefined);

  const label = computed(() => {
    const count = countProp.value != null ? Number(countProp.value) : undefined;
    const max = maxProp.value != null ? Number(maxProp.value) : undefined;
    if (count === undefined || Number.isNaN(count)) return undefined;
    if (max !== undefined && !Number.isNaN(max) && count > max) return `${max}+`;
    return String(count);
  });

  return {
    styles: [
      colorThemeMixin,
      roundedVariantMixin,
      frostVariantMixin('.badge'),
      sizeVariantMixin({
        lg: { '--_padding-x': 'var(--size-2-5)', '--_padding-y': 'var(--size-1)', fontSize: 'var(--text-sm)' },
        md: { '--_padding-x': 'var(--size-2)', '--_padding-y': 'var(--size-0-5)', fontSize: 'var(--text-xs)' },
        sm: { '--_padding-x': 'var(--size-1-5)', '--_padding-y': 'var(--size-px)', fontSize: 'var(--text-xs)' },
      }),
      componentStyles,
    ],
    template: html`<span class="badge" part="badge" aria-label=${() => ariaLabelProp.value}>
      <slot name="icon"></slot>
      <span ?hidden=${() => label.value == null}>${() => label.value}</span>
      <slot ?hidden=${() => label.value != null}></slot>
    </span>
    <slot name="target"></slot>`,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-badge': HTMLElement & BadgeProps;
  }
}
