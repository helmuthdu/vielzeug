import { bind, define, html, prop, useSlots } from '@vielzeug/ore';
import { disablableBundle, loadableBundle, roundableBundle, sizableBundle, themableBundle } from '../../shared';
import {
  colorThemeMixin,
  forcedColorsMixin,
  reducedMotionMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
import type { ComponentSize, RoundedSize, ThemeColor } from '../../types';
import componentStyles from './stats.css?inline';

export type StatsTrendDirection = 'down' | 'neutral' | 'up';
export type StatsVariant = 'outlined' | 'plain' | 'solid';

export type OreStatsProps = {
  color?: ThemeColor;
  description?: string;
  disabled?: boolean;
  label?: string;
  loading?: boolean;
  rounded?: RoundedSize;
  size?: ComponentSize;
  trend?: string;
  'trend-direction'?: StatsTrendDirection;
  value?: string;
  variant?: StatsVariant;
};

/**
 * A focused metric card for a label, primary value, supporting context, trend, icon, and optional visual.
 *
 * @element ore-stats
 *
 * @attr {string} label - Metric label
 * @attr {string} value - Primary metric value
 * @attr {string} description - Supporting context
 * @attr {string} trend - Trend text
 * @attr {string} trend-direction - Trend direction: 'up' | 'down' | 'neutral'
 * @attr {string} variant - Visual variant: 'outlined' | 'plain' | 'solid'
 * @attr {string} color - Semantic theme color
 * @attr {string} size - Size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius size
 * @attr {boolean} loading - Show loading state
 * @attr {boolean} disabled - Show unavailable state
 *
 * @slot icon - Leading metric icon
 * @slot label - Replaces label text
 * @slot value - Replaces value text
 * @slot visual - Compact chart, progress, or other metric visual
 * @slot trend - Replaces trend text
 * @slot description - Replaces supporting context
 *
 * @cssprop --stats-bg - Card background
 * @cssprop --stats-color - Card foreground color
 * @cssprop --stats-border-color - Card border color
 * @cssprop --stats-radius - Card border radius
 * @cssprop --stats-padding - Card padding
 * @cssprop --stats-min-height - Minimum card height
 * @cssprop --stats-value-size - Primary value font size
 * @cssprop --stats-icon-bg - Icon surface background
 * @cssprop --stats-trend-up - Positive trend color
 * @cssprop --stats-trend-down - Negative trend color
 *
 * @part card - Card surface
 * @part loading - Loading indicator
 * @part header - Label and icon row
 * @part icon - Icon container
 * @part label - Label container
 * @part body - Value and visual row
 * @part value - Primary value container
 * @part visual - Visual slot container
 * @part footer - Trend and description row
 * @part trend - Trend container
 * @part description - Description container
 *
 * @example
 * ```html
 * <ore-stats label="Revenue" value="$42,800" trend="+12%" trend-direction="up">
 *   <ore-icon slot="icon" name="chart-line"></ore-icon>
 * </ore-stats>
 * ```
 */
export const STATS_TAG = 'ore-stats' as const;
define<OreStatsProps>(STATS_TAG, {
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    ...loadableBundle,
    ...roundableBundle,
    description: prop.string(),
    label: prop.string(),
    trend: prop.string(),
    'trend-direction': prop.oneOf<StatsTrendDirection>(['up', 'down', 'neutral'], 'neutral'),
    value: prop.string(),
    variant: prop.oneOf<StatsVariant>(['outlined', 'plain', 'solid'], 'outlined'),
  },
  setup(props) {
    const slots = useSlots<'description' | 'icon' | 'label' | 'trend' | 'value' | 'visual'>();
    const hasDescription = () => Boolean(props.description.value) || slots.has('description').value;
    const hasIcon = () => slots.has('icon').value;
    const hasLabel = () => Boolean(props.label.value) || slots.has('label').value;
    const hasTrend = () => Boolean(props.trend.value) || slots.has('trend').value;
    const hasValue = () => Boolean(props.value.value) || slots.has('value').value;
    const hasVisual = () => slots.has('visual').value;

    bind({
      attr: {
        ariaBusy: () => String(Boolean(props.loading.value)),
        ariaDisabled: () => String(Boolean(props.disabled.value)),
      },
    });

    return html`
      <article class="stats" part="card">
        <span class="loading" part="loading" aria-hidden="true"></span>
        <header class="header" part="header" ?hidden=${() => !hasIcon() && !hasLabel()}>
          <span class="icon" part="icon" ?hidden=${() => !hasIcon()}><slot name="icon"></slot></span>
          <span class="label" part="label" ?hidden=${() => !hasLabel()}><slot name="label">${props.label}</slot></span>
        </header>
        <div class="body" part="body" ?hidden=${() => !hasValue() && !hasVisual()}>
          <strong class="value" part="value" ?hidden=${() => !hasValue()}><slot name="value">${props.value}</slot></strong>
          <span class="visual" part="visual" ?hidden=${() => !hasVisual()}><slot name="visual"></slot></span>
        </div>
        <footer class="footer" part="footer" ?hidden=${() => !hasTrend() && !hasDescription()}>
          <span class="trend" part="trend" data-direction=${props['trend-direction']} ?hidden=${() => !hasTrend()}><slot name="trend">${props.trend}</slot></span>
          <span class="description" part="description" ?hidden=${() => !hasDescription()}><slot name="description">${props.description}</slot></span>
        </footer>
      </article>
    `;
  },
  styles: [
    colorThemeMixin,
    roundedVariantMixin,
    sizeVariantMixin({
      lg: {
        '--_icon-size': 'var(--size-10)',
        '--_min-height': 'var(--stats-min-height, var(--size-36))',
        '--_value-size': 'var(--stats-value-size, var(--text-3xl))',
        gap: 'var(--size-4)',
        padding: 'var(--stats-padding, var(--size-5))',
      },
      md: {
        '--_icon-size': 'var(--size-9)',
        '--_min-height': 'var(--stats-min-height, var(--size-32))',
        '--_value-size': 'var(--stats-value-size, var(--text-2xl))',
        gap: 'var(--size-3)',
        padding: 'var(--stats-padding, var(--size-4))',
      },
      sm: {
        '--_icon-size': 'var(--size-8)',
        '--_min-height': 'var(--stats-min-height, var(--size-24))',
        '--_value-size': 'var(--stats-value-size, var(--text-xl))',
        gap: 'var(--size-2)',
        padding: 'var(--stats-padding, var(--size-3))',
      },
    }),
    reducedMotionMixin,
    forcedColorsMixin,
    componentStyles,
  ],
});
