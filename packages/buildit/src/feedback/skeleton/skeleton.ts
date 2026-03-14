import { computed, css, define, defineProps, html, watch } from '@vielzeug/craftit';

import type { ComponentSize } from '../../types';

import { reducedMotionMixin } from '../../styles';

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_bg: var(--skeleton-bg, var(--color-contrast-200));
      --_highlight: var(--skeleton-highlight, var(--color-contrast-100));
      --_radius: var(--skeleton-radius, var(--rounded-md));
      --_circle-size: var(--skeleton-size, var(--size-10));
      --_width: var(--skeleton-width, 100%);
      --_height: var(--skeleton-height, var(--size-4));
      --_line-gap: var(--skeleton-line-gap, var(--size-2));
      --_last-line-width: var(--skeleton-last-line-width, 60%);
      --_duration: var(--skeleton-duration, 1.6s);

      display: inline-block;
      width: var(--_width);
      height: var(--_height);
    }

    .stack {
      display: grid;
      width: 100%;
      height: 100%;
      gap: var(--_line-gap);
    }

    .bone {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: var(--_radius);
      background: var(--_bg);
      overflow: hidden;
    }

    .bone::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, var(--_bg) 0%, var(--_highlight) 50%, var(--_bg) 100%);
      transform: translateX(-100%);
      animation: var(--_motion-animation, bit-skeleton-shimmer var(--_duration) linear infinite);
    }

    :host([data-animated='false']) .bone::after {
      display: none;
    }

    @keyframes bit-skeleton-shimmer {
      to {
        transform: translateX(100%);
      }
    }

    /* In RTL the shimmer should sweep right-to-left */
    :host(:dir(rtl)) .bone::after {
      animation-direction: reverse;
    }
  }

  @layer buildit.variants {
    /* Circle variant — avatars, icons */
    :host([variant='circle']) {
      --_radius: var(--rounded-full);
      width: var(--skeleton-width, var(--_circle-size));
      height: var(--skeleton-height, var(--_circle-size));
      aspect-ratio: 1 / 1;
    }

    /* Text variant — thinner, for inline text lines */
    :host([variant='text']) {
      --_height: var(--size-3);
      --_radius: var(--rounded-sm);
      height: auto;
    }

    :host([variant='text']) .stack {
      height: auto;
    }

    :host([variant='text']) .bone {
      height: var(--_height);
    }

    :host([variant='text']) .bone[data-last='true'] {
      width: var(--_last-line-width);
    }
  }

  @layer buildit.utilities {
    :host([size='sm']) {
      --_height: var(--size-3);
      --_circle-size: var(--size-8);
    }
    :host([size='md']) {
      --_height: var(--size-4);
      --_circle-size: var(--size-10);
    }
    :host([size='lg']) {
      --_height: var(--size-6);
      --_circle-size: var(--size-14);
    }
  }

  @media (forced-colors: active) {
    .bone {
      background: ButtonFace;
      border: 1px solid ButtonText;
    }

    .bone::after {
      display: none;
    }
  }
`;

/** Skeleton loader component properties */
export interface SkeletonProps {
  /** Visual variant: 'rect' (default), 'circle', or 'text' */
  variant?: 'rect' | 'circle' | 'text';
  /** Size preset controlling line height and circle size */
  size?: ComponentSize;
  /** Width override (e.g. '12rem', '70%') */
  width?: string;
  /** Height override (e.g. '1rem', '3rem') */
  height?: string;
  /** Radius override (e.g. '9999px', 'var(--rounded-xl)') */
  radius?: string;
  /** Toggle shimmer animation */
  animated?: boolean;
  /** Number of text lines for `variant='text'` */
  lines?: number;
}

/**
 * A shimmer placeholder that represents loading content.
 * Control dimensions via the `--skeleton-width` and `--skeleton-height` CSS custom properties,
 * or via `width` / `height` inline styles.
 *
 * @element bit-skeleton
 *
 * @attr {string}  variant  - Shape: 'rect' (default) | 'circle' | 'text'
 * @attr {string}  size     - Height/circle preset: 'sm' | 'md' | 'lg'
 * @attr {string}  width    - Width override (CSS length/percentage)
 * @attr {string}  height   - Height override (CSS length)
 * @attr {string}  radius   - Radius override
 * @attr {boolean} animated - Disable with `animated="false"`
 * @attr {number}  lines    - Text line count (only for `variant='text'`)
 *
 * @cssprop --skeleton-bg        - Base shimmer color
 * @cssprop --skeleton-highlight - Shimmer highlight color
 * @cssprop --skeleton-radius    - Border radius
 * @cssprop --skeleton-size      - Circle fallback size
 * @cssprop --skeleton-width     - Width (default: 100%)
 * @cssprop --skeleton-height    - Height (default: var(--size-4))
 * @cssprop --skeleton-line-gap  - Vertical gap between text lines
 * @cssprop --skeleton-last-line-width - Width of the final text line
 * @cssprop --skeleton-duration  - Shimmer animation duration
 *
 * @example
 * ```html
 * <!-- Paragraph lines -->
 * <bit-skeleton variant="text" lines="3" width="100%"></bit-skeleton>
 *
 * <!-- Avatar -->
 * <bit-skeleton variant="circle" size="md"></bit-skeleton>
 *
 * <!-- Card image -->
 * <bit-skeleton width="100%" height="10rem"></bit-skeleton>
 * ```
 */
export const TAG = define('bit-skeleton', ({ host }) => {
  const props = defineProps<SkeletonProps>({
    animated: { default: true },
    height: { default: undefined },
    lines: { default: 1 },
    radius: { default: undefined },
    size: { default: undefined },
    variant: { default: 'rect' },
    width: { default: undefined },
  });

  const lineCount = computed(() => {
    const value = Math.floor(Number(props.lines.value));

    return Number.isFinite(value) && value > 0 ? value : 1;
  });

  const renderLineCount = computed(() => (props.variant.value === 'text' ? lineCount.value : 1));

  watch(
    [props.width, props.height, props.radius, props.animated],
    () => {
      if (props.width.value) host.style.setProperty('--skeleton-width', props.width.value);
      else host.style.removeProperty('--skeleton-width');

      if (props.height.value) host.style.setProperty('--skeleton-height', props.height.value);
      else host.style.removeProperty('--skeleton-height');

      if (props.radius.value) host.style.setProperty('--skeleton-radius', props.radius.value);
      else host.style.removeProperty('--skeleton-radius');

      const rawAnimated = host.getAttribute('animated');
      const isAnimated = rawAnimated !== 'false' && props.animated.value !== false;

      host.setAttribute('data-animated', isAnimated ? 'true' : 'false');
    },
    { immediate: true },
  );

  return {
    styles: [reducedMotionMixin, componentStyles],
    template: html`
      <div class="stack" part="stack">
        ${() =>
          Array.from({ length: renderLineCount.value }, (_, index) => {
            const isLastLine =
              props.variant.value === 'text' && renderLineCount.value > 1 && index === renderLineCount.value - 1;

            return html`<div
              class="bone"
              part="bone"
              aria-hidden="true"
              :data-last="${() => (isLastLine ? 'true' : null)}"></div>`;
          })}
      </div>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-skeleton': HTMLElement & SkeletonProps;
  }
}
