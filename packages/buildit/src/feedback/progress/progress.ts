import { define, prop, computed, effect, html, styleMap, when } from '@vielzeug/craftit';

import type { ComponentSize, ThemeColor } from '../../types';

import { sizableBundle, themableBundle } from '../../inputs/shared/bundles';
import { colorThemeMixin, forcedColorsMixin, reducedMotionMixin } from '../../styles';
import componentStyles from './progress.css?inline';

/** Progress bar component properties */
export type BitProgressProps = {
  /** Theme color for the fill bar */
  color?: ThemeColor;
  /** Floating chip centered above the fill endpoint (linear only). Hidden in indeterminate mode. Position formula: left = fill% − half chip width (CSS: left:X%; transform:translateX(−50%)). */
  'floating-label'?: string;
  /** When true, shows an infinite animation — use when progress is unknown. */
  indeterminate?: boolean;
  /** Accessible name AND visible text label.
   * - Linear without `title`: rendered at the end of the bar.
   * - Linear with `title`: moved into the header row above the bar.
   * - Circular: large text centered inside the ring. */
  label?: string;
  /** Maximum value. Defaults to 100. */
  max?: number;
  /** Size variant controlling bar height */
  size?: ComponentSize;
  /** Title text.
   * - Linear: displayed as a header above the bar; moves `label` into the header row.
   * - Circular: smaller text displayed below the `label` inside the ring. */
  title?: string;
  /** 'linear' (default) or 'circular' */
  type?: 'linear' | 'circular';
  /** Current progress value (0 to `max`). Ignored when `indeterminate`. */
  value?: number;
  /** Human-readable value text for screen readers (e.g. "Step 2 of 5", "75%"). Overrides the raw aria-valuenow when set. */
  'value-text'?: string;
};

/**
 * A linear progress bar for conveying operation progress.
 * Supports determinate (known value) and indeterminate (unknown duration) modes.
 *
 * @element bit-progress
 *
 * @attr {number} value   - Current value (0–max). Defaults to 0.
 * @attr {number} max     - Maximum value. Defaults to 100.
 * @attr {boolean} indeterminate - Show infinite animation (ignores value/max).
 * @attr {string} color   - Theme color: 'primary' | 'success' | 'warning' | 'error' | …
 * @attr {string} size    - Bar height: 'sm' | 'md' | 'lg'
 * @attr {string} label          - Visible text label + accessible name. Linear: at bar end (or header row with title). Circular: large text centered inside the ring.
 * @attr {string} title          - Title text. Linear: header above the bar (moves label to header row). Circular: smaller text below the label inside the ring.
 * @attr {string} floating-label - Floating chip centered above the fill endpoint (linear only); hidden when indeterminate.
 *
 * @cssprop --progress-height               - Bar height override
 * @cssprop --progress-track-bg             - Track background color
 * @cssprop --progress-fill                 - Fill bar color
 * @cssprop --progress-radius               - Border radius
 * @cssprop --progress-label-gap            - Gap between header/bar row and between bar and trailing label (default 0.25 rem)
 * @cssprop --progress-title-color          - Title text color (defaults to currentColor)
 * @cssprop --progress-label-color          - Label text color (defaults to currentColor)
 * @cssprop --progress-circle-size          - Circular indicator diameter (default 6rem)
 * @cssprop --progress-circular-label-size  - Font size of the label inside the ring (default --text-xl)
 * @cssprop --progress-circular-title-size  - Font size of the title inside the ring (default --text-xs)
 *
 * @example
 * ```html
 * <bit-progress value="45"></bit-progress>
 * <bit-progress value="75" max="100" color="success" size="lg"></bit-progress>
 * <bit-progress indeterminate color="primary" label="Loading…"></bit-progress>
 * ```
 */
export const PROGRESS_TAG = define<BitProgressProps>('bit-progress', {
  props: {
    ...themableBundle,
    ...sizableBundle,
    'floating-label': undefined,
    indeterminate: false,
    label: undefined,
    max: 100,
    title: undefined,
    type: prop.oneOf(['linear', 'circular'] as const, 'linear'),
    value: 0,
    'value-text': undefined,
  },

  setup(props, { host }) {
    // The SVG circle circumference for a radius of 45 (viewBox 0 0 100 100)
    const RADIUS = 45;
    const CIRC = 2 * Math.PI * RADIUS; // ~282.7

    const percent = computed(() => {
      const v = Math.max(0, Math.min(Number(props.value.value), Number(props.max.value)));
      const m = Math.max(1, Number(props.max.value));

      return `${(v / m) * 100}%`;
    });

    const dashoffset = computed(() => {
      const v = Math.max(0, Math.min(Number(props.value.value), Number(props.max.value)));
      const m = Math.max(1, Number(props.max.value));

      return CIRC - (v / m) * CIRC;
    });

    const ariaValueNow = () => (props.indeterminate.value ? null : String(props.value.value));
    const ariaLabel = () => props.label.value ?? props.title.value ?? 'Progress';
    const circularStyle = styleMap({ '--_circ': `${CIRC}px` });
    const strokeDasharray = () => (props.indeterminate.value ? undefined : `${CIRC}px`);
    const strokeDashoffset = () => (props.indeterminate.value ? undefined : `${dashoffset.value}px`);
    const linearFillStyle = styleMap({ width: () => (!props.indeterminate.value ? percent.value : null) });

    effect(() => {
      host.el.style.setProperty('--_percent', props.indeterminate.value ? '0%' : percent.value);
    });

    return () => html`
      ${when(
        () => props.type.value === 'circular',
        () =>
          html` <div
            class="circular-track"
            role="progressbar"
            :aria-valuenow="${ariaValueNow}"
            aria-valuemin="0"
            :aria-valuemax="${props.max}"
            :aria-label="${ariaLabel}"
            :aria-valuetext="${props['value-text']}"
            :style="${circularStyle}">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle class="circle-bg" cx="50" cy="50" r="${RADIUS}"></circle>
              <circle
                class="circle-fill"
                cx="50"
                cy="50"
                r="${RADIUS}"
                :stroke-dasharray="${strokeDasharray}"
                :stroke-dashoffset="${strokeDashoffset}"></circle>
            </svg>
            <div class="circular-inner">
              <span class="circular-label">${() => props.label.value ?? ''}</span>
              <span class="circular-title">${() => props.title.value ?? ''}</span>
            </div>
          </div>`,
        () =>
          html` <div class="wrapper">
            <div class="header">
              <span class="progress-title">${() => props.title.value ?? ''}</span>
              <span class="end-label header-label">${() => props.label.value ?? ''}</span>
            </div>
            <div class="bar-row">
              <div class="track-outer">
                <div
                  class="track"
                  role="progressbar"
                  :aria-valuenow="${ariaValueNow}"
                  aria-valuemin="0"
                  :aria-valuemax="${props.max}"
                  :aria-label="${ariaLabel}"
                  :aria-valuetext="${props['value-text']}">
                  <div class="fill" part="fill" :style="${linearFillStyle}"></div>
                </div>
                <span class="floating-label">${props['floating-label']}</span>
              </div>
              <span class="end-label row-label">${() => props.label.value ?? ''}</span>
            </div>
          </div>`,
      )}
    `;
  },

  styles: [colorThemeMixin, forcedColorsMixin, reducedMotionMixin, componentStyles],
});
