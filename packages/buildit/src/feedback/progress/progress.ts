import { computed, css, define, defineProps, html, watch } from '@vielzeug/craftit';
import { colorThemeMixin, forcedColorsMixin, reducedMotionMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_height: var(--progress-height, var(--size-2, 0.5rem));
      --_radius: var(--progress-radius, var(--rounded-full, 9999px));
      --_circle-size: var(--progress-circle-size, 2rem);

      display: block;
      /* Stretch to fill the parent container (matches native <progress> behaviour).
         The host's width is set against its parent, so % widths inside shadow DOM
         (.track, .fill) resolve correctly in any flex/grid/block context. */
      width: 100%;
    }

    /* ========================================
       Linear Bar
       ======================================== */

    .track {
      overflow: hidden;
      /* contrast-300 (88% lightness) gives a visible groove in light mode */
      background: var(--progress-track-bg, var(--color-contrast-300, #ddd));
      border-radius: var(--_radius);
      height: var(--_height);
      width: 100%;
    }

    .fill {
      height: 100%;
      width: var(--_percent, 0%);
      background: var(--progress-fill, var(--_theme-base, #3b82f6));
      border-radius: inherit;
      transform-origin: left;
      transition: var(--_motion-transition, width var(--transition-normal));
    }

    /* In RTL the fill grows from the inline-end (physical right) side */
    :host(:dir(rtl)) .fill {
      transform-origin: right;
    }

    /* Indeterminate: sliding bar */
    @keyframes bit-progress-slide {
      0%   { transform: translateX(-150%) scaleX(0.6); }
      50%  { transform: translateX(50%)   scaleX(1); }
      100% { transform: translateX(300%)  scaleX(0.6); }
    }

    :host([indeterminate]) .fill {
      width: 40%;
      animation: var(--_motion-animation, bit-progress-slide 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite);
    }

    /* In RTL the indeterminate bar sweeps right-to-left */
    :host(:dir(rtl)[indeterminate]) .fill {
      animation-direction: reverse;
    }

    /* ========================================
       Circular variant
       ======================================== */

    .circular-track {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_circle-size);
      height: var(--_circle-size);
    }

    .circular-track svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
      overflow: visible;
    }

    .circle-bg {
      fill: none;
      stroke: var(--progress-track-bg, var(--color-contrast-300, #ddd));
      stroke-width: var(--progress-stroke-width, calc(var(--_height) * 1.2));
    }

    .circle-fill {
      fill: none;
      stroke: var(--progress-fill, var(--_theme-base, #3b82f6));
      stroke-linecap: round;
      stroke-width: var(--progress-stroke-width, calc(var(--_height) * 1.2));
      transition: var(--_motion-transition, stroke-dashoffset var(--transition-normal));
    }

    @keyframes bit-progress-spin {
      from { transform: rotate(-90deg); }
      to   { transform: rotate(270deg); }
    }

    @keyframes bit-progress-dash {
      0%   { stroke-dashoffset: var(--_circ);                       stroke-dasharray: 1px var(--_circ); }
      40%  { stroke-dashoffset: calc(var(--_circ) * -0.1);          stroke-dasharray: calc(var(--_circ) * 0.75) var(--_circ); }
      60%  { stroke-dashoffset: calc(var(--_circ) * -0.1);          stroke-dasharray: calc(var(--_circ) * 0.75) var(--_circ); }
      100% { stroke-dashoffset: calc(var(--_circ) * -0.9);          stroke-dasharray: 1px var(--_circ); }
    }

    :host([indeterminate]) .circular-track svg {
      animation: var(--_motion-animation, bit-progress-spin 1.4s linear infinite);
    }

    :host([indeterminate]) .circle-fill {
      animation: var(--_motion-animation, bit-progress-dash 1.4s ease-in-out infinite);
    }
  }

  @layer buildit.utilities {
    :host([size='sm']) { --_height: var(--size-1, 0.25rem);    --_circle-size: 1.5rem; }
    :host([size='md']) { --_height: var(--size-2, 0.5rem);     --_circle-size: 2rem; }
    :host([size='lg']) { --_height: var(--size-3-5, 0.875rem); --_circle-size: 2.5rem; }
  }

  /* Extra indeterminate state overrides — cannot be expressed via CSS variables alone */
  @media (prefers-reduced-motion: reduce) {
    :host([indeterminate]) .fill { width: 100%; opacity: 0.6; }
    :host([indeterminate]) .circle-fill { stroke-dasharray: none; }
  }
`;

/** Progress bar component properties */
export interface ProgressProps {
  /** Current progress value (0 to `max`). Ignored when `indeterminate`. */
  value?: number;
  /** Maximum value. Defaults to 100. */
  max?: number;
  /** When true, shows an infinite animation — use when progress is unknown. */
  indeterminate?: boolean;
  /** Theme color for the fill bar */
  color?: ThemeColor;
  /** Size variant controlling bar height */
  size?: ComponentSize;
  /** 'linear' (default) or 'circular' */
  type?: 'linear' | 'circular';
  /** Accessible label for screen readers */
  label?: string;
  /** Human-readable value text for screen readers (e.g. "Step 2 of 5", "75%"). Overrides the raw aria-valuenow when set. */
  'value-text'?: string;
}

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
 * @attr {string} label   - Accessible label (default: "Progress")
 *
 * @cssprop --progress-height    - Bar height override
 * @cssprop --progress-track-bg  - Track background color
 * @cssprop --progress-fill      - Fill bar color
 * @cssprop --progress-radius    - Border radius
 *
 * @example
 * ```html
 * <bit-progress value="45"></bit-progress>
 * <bit-progress value="75" max="100" color="success" size="lg"></bit-progress>
 * <bit-progress indeterminate color="primary" label="Loading…"></bit-progress>
 * ```
 */
export const TAG = define('bit-progress', ({ host }) => {
  const props = defineProps<ProgressProps>({
    color: { default: undefined },
    indeterminate: { default: false },
    label: { default: 'Progress' },
    max: { default: 100 },
    size: { default: undefined },
    type: { default: 'linear' },
    value: { default: 0 },
    'value-text': { default: undefined },
  });

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

  const isCircular = computed(() => props.type.value === 'circular');

  // Use watch([...], fn, { immediate: true }) at setup-level so it fires during
  // connectedCallback (when attributes are already synced) rather than deferring
  // to onMount. The immediate flag triggers the first run synchronously.
  watch(
    [props.value, props.max, props.indeterminate],
    () => {
      host.style.setProperty('--_percent', props.indeterminate.value ? '0%' : percent.value);
    },
    { immediate: true },
  );

  return {
    styles: [colorThemeMixin, forcedColorsMixin, reducedMotionMixin, componentStyles],
    template: html`
      ${() =>
        isCircular.value
          ? html`
          <div
            class="circular-track"
            role="progressbar"
            :aria-valuenow="${() => (props.indeterminate.value ? null : String(props.value.value))}"
            aria-valuemin="0"
            :aria-valuemax="${() => String(props.max.value)}"
            :aria-label="${() => props.label.value}"
            :aria-valuetext="${() => props['value-text'].value ?? null}"
            :style="${() => `--_circ:${CIRC}px`}"
          >
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle
                class="circle-bg"
                cx="50" cy="50" r="${RADIUS}"
              ></circle>
              <circle
                class="circle-fill"
                cx="50" cy="50" r="${RADIUS}"
                :stroke-dasharray="${() => (props.indeterminate.value ? undefined : `${CIRC}px`)}"
                :stroke-dashoffset="${() => (props.indeterminate.value ? undefined : `${dashoffset.value}px`)}"
              ></circle>
            </svg>
          </div>`
          : html`
          <div
            class="track"
            role="progressbar"
            :aria-valuenow="${() => (props.indeterminate.value ? null : String(props.value.value))}"
            aria-valuemin="0"
            :aria-valuemax="${() => String(props.max.value)}"
            :aria-label="${() => props.label.value}"
            :aria-valuetext="${() => props['value-text'].value ?? null}"
          >
            <div
              class="fill"
              part="fill"
              :style="${() => (!props.indeterminate.value ? `width:${percent.value}` : null)}"
            ></div>
          </div>`}
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-progress': HTMLElement & ProgressProps;
  }
}
