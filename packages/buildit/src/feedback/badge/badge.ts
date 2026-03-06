import { computed, css, define, html, prop } from '@vielzeug/craftit';
import { colorThemeMixin, frostVariantMixin, roundedVariantMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';

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
      align-items: center;
      justify-content: center;
      gap: var(--_gap);
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


    /* Dot indicator — rendered when count < 0 and no slot content */
    .dot {
      display: inline-block;
      width: var(--size-2);
      height: var(--size-2);
      border-radius: var(--rounded-full);
      background: var(--_theme-base);
      flex-shrink: 0;
    }
  }

  @layer buildit.variants {
    /* Solid (Default) - Full theme color background */
    :host(:not([variant])) .badge,
    :host([variant='solid']) .badge {
      background: var(--_theme-base);
      color: var(--_theme-contrast);
      border-color: var(--_theme-base);
    }

    /* Flat - Subtle background with theme color text */
    :host([variant='flat']) .badge {
      background: color-mix(in srgb, var(--_theme-backdrop) 8%, var(--color-contrast-100));
      color: var(--_theme-base);
      border-color: color-mix(in srgb, var(--_theme-focus) 20%, transparent);
    }

    /* Bordered - Outlined with filled background */
    :host([variant='bordered']) .badge {
      background: var(--_theme-backdrop);
      color: var(--_theme-base);
      border-color: var(--_theme-border);
    }

    /* Outline - Transparent with colored border */
    :host([variant='outline']) .badge {
      background: transparent;
      color: var(--_theme-base);
      border-color: var(--_theme-base);
    }


    /* Dot-only mode */
    :host([dot]) .badge {
      padding: var(--size-1);
      min-width: unset;
      line-height: 0;
    }
  }


  @layer buildit.overrides {
    /* Dot variant in solid mode */
    :host([dot]:not([variant])) .dot,
    :host([dot][variant='solid']) .dot {
      background: var(--_theme-content);
    }

    :host([dot][variant='flat']) .dot,
    :host([dot][variant='outline']) .dot {
      background: var(--_theme-base);
    }

    /* Empty badge (no text, no count) becomes a circular dot */
    :host([dot]) .badge {
      background: var(--_theme-base);
      border-color: var(--_theme-base);
    }
  }
`;

/** Badge component properties */
export interface BadgeProps {
  /** Theme color */
  color?: ThemeColor;
  /** Visual style variant */
  variant?: 'solid' | 'flat' | 'bordered' | 'outline' | 'frost';
  /** Badge size */
  size?: ComponentSize;
  /** Numeric count to display; omit or set to -1 for dot-only mode */
  count?: number;
  /** Max count — displays "<max>+" when count exceeds this value */
  max?: number;
  /** Render as a small dot with no label */
  dot?: boolean;
  /** Border radius override */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
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
define('bit-badge', () => {
  const countProp = prop('count', undefined as number | undefined);
  const maxProp = prop('max', undefined as number | undefined);

  const label = computed(() => {
    const count = countProp.value;
    const max = maxProp.value;
    if (count === undefined || count < 0) return undefined;
    if (max !== undefined && count > max) return `${max}+`;
    return String(count);
  });

  const showLabel = computed(() => label.value !== undefined);

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
    template: html`<span class="badge" part="badge">
      <slot name="icon"></slot>
      <span ?hidden=${() => !showLabel.value}>${() => label.value}</span>
      <slot ?hidden=${() => showLabel.value}></slot>
    </span>`,
  };
});

export default {};
