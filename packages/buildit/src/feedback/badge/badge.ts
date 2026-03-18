import { computed, define, html, prop } from '@vielzeug/craftit';

import type { ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';

import { colorThemeMixin, frostVariantMixin, roundedVariantMixin, sizeVariantMixin } from '../../styles';
import componentStyles from './badge.css?inline';

type BadgeVariant = Extract<VisualVariant, 'solid' | 'flat' | 'bordered' | 'outline' | 'frost'>;

/** Badge component properties */
export type BitBadgeProps = {
  /**
   * When set, switches to overlay mode: the host becomes `position:relative`
   * and the badge pins to a corner over the slotted content.
   * Value controls which corner: 'top-end' (default) | 'top-start' | 'bottom-end' | 'bottom-start'
   */
  anchor?: 'top-end' | 'top-start' | 'bottom-end' | 'bottom-start';
  /** Accessible label for assistive technology. Recommended for count-only and dot mode. */
  ariaLabel?: string;
  /** Theme color */
  color?: ThemeColor;
  /** Numeric count to display */
  count?: number;
  /** Render as a small dot with no label */
  dot?: boolean;
  /** Max count — displays "<max>+" when count exceeds this value */
  max?: number;
  /** Border radius override */
  rounded?: RoundedSize;
  /** Badge size */
  size?: ComponentSize;
  /** Visual style variant */
  variant?: BadgeVariant;
};

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
export const BADGE_TAG = define(
  'bit-badge',
  () => {
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

    return html`<span class="badge" part="badge" aria-label=${() => ariaLabelProp.value}>
        <slot name="icon"></slot>
        <span ?hidden=${() => label.value == null}>${() => label.value}</span>
        <slot ?hidden=${() => label.value != null}></slot>
      </span>
      <slot name="target"></slot>`;
  },
  {
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
  },
);
