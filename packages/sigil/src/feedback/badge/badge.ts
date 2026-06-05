import { computed, define, html, prop } from '@vielzeug/craft';

import type { RoundedSize, ThemeColor, VisualVariant } from '../../types';

import { roundableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, frostVariantMixin, roundedVariantMixin, sizeVariantMixin } from '../../styles';
import componentStyles from './badge.css?inline';

type BadgeVariant = Extract<VisualVariant, 'solid' | 'flat' | 'bordered' | 'outline' | 'frost'>;
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

/** Badge component properties */
export type SgBadgeProps = {
  /**
   * When set, switches to overlay mode: the host becomes `position:relative`
   * and the badge pins to a corner over the slotted content.
   * Value controls which corner: 'top-end' (default) | 'top-start' | 'bottom-end' | 'bottom-start'
   */
  anchor?: 'top-end' | 'top-start' | 'bottom-end' | 'bottom-start';
  /** Theme color */
  color?: ThemeColor;
  /** Numeric count to display */
  count?: number;
  /** Render as a small dot with no label */
  dot?: boolean;
  /** Accessible label for assistive technology. Recommended for count-only and dot mode. */
  label?: string;
  /** Max count — displays "<max>+" when count exceeds this value */
  max?: number;
  /** Border radius override */
  rounded?: RoundedSize;
  /** Badge size */
  size?: BadgeSize;
  /** Visual style variant */
  variant?: BadgeVariant;
};

/**
 * A compact badge/chip for counts, statuses, and labels.
 * Supports numeric counts with overflow, dot mode, and icon slots.
 *
 * @element sg-badge
 *
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'frost'
 * @attr {string} size - Component size: 'xs' | 'sm' | 'md' | 'lg'
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
 * @part badge - Shadow part for the `badge` element.
 * @example
 * ```html
 * <sg-badge color="primary">New</sg-badge>
 * <sg-badge color="error" count="5"></sg-badge>
 * <sg-badge color="error" count="120" max="99"></sg-badge>
 * <sg-badge color="success" dot></sg-badge>
 * <sg-badge color="warning" variant="flat">Beta</sg-badge>
 * ```
 */
export const BADGE_TAG = 'sg-badge' as const;
define<SgBadgeProps>(BADGE_TAG, {
  props: {
    ...themableBundle,
    size: prop.string<BadgeSize>(),
    ...roundableBundle,
    anchor: prop.string<'top-end' | 'top-start' | 'bottom-end' | 'bottom-start'>(),
    count: prop.json(undefined as number | undefined),
    dot: prop.bool(false),
    label: prop.string(),
    max: prop.json(undefined as number | undefined),
    variant: prop.string<BadgeVariant>(),
  },
  setup(props) {
    const label = computed(() => {
      const count = props.count.value != null ? Number(props.count.value) : undefined;
      const max = props.max.value != null ? Number(props.max.value) : undefined;

      if (count === undefined || Number.isNaN(count)) return undefined;

      if (max !== undefined && !Number.isNaN(max) && count > max) return `${max}+`;

      return String(count);
    });

    return html`<span class="badge" part="badge" aria-label="${props.label}">
        <slot name="icon"></slot>
        <span ?hidden="${() => label.value == null}">${label}</span>
        <span class="badge-label" ?hidden="${() => label.value != null}"><slot></slot></span>
      </span>
      <slot name="target"></slot>`;
  },
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
});
