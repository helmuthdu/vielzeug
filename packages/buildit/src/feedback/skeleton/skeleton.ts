import { define, computed, html, onMount, signal, watch } from '@vielzeug/craftit';
import { intersectionObserver } from '@vielzeug/craftit/observers';

import type { ComponentSize } from '../../types';

import { type PropBundle, sizableBundle } from '../../inputs/shared/bundles';
import { reducedMotionMixin } from '../../styles';
import componentStyles from './skeleton.css?inline';

/** Skeleton loader component properties */
export type BitSkeletonProps = {
  /** Toggle shimmer animation */
  animated?: boolean;
  /** Height override (e.g. '1rem', '3rem') */
  height?: string;
  /** Number of text lines for `variant='text'` */
  lines?: number;
  /** Radius override (e.g. '9999px', 'var(--rounded-xl)') */
  radius?: string;
  /** Size preset controlling line height and circle size */
  size?: ComponentSize;
  /** Render diagonal stripes instead of the shimmer — useful as a design-mode placeholder */
  striped?: boolean;
  /** Visual variant: 'rect' (default), 'circle', or 'text' */
  variant?: 'rect' | 'circle' | 'text';
  /** Width override (e.g. '12rem', '70%') */
  width?: string;
};

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
 * @attr {boolean} striped  - Replace shimmer with diagonal stripes
 *
 * @cssprop --skeleton-bg          - Base shimmer color
 * @cssprop --skeleton-highlight - Shimmer highlight color
 * @cssprop --skeleton-radius    - Border radius
 * @cssprop --skeleton-size      - Circle fallback size
 * @cssprop --skeleton-width     - Width (default: 100%)
 * @cssprop --skeleton-height    - Height (default: var(--size-4))
 * @cssprop --skeleton-line-gap  - Vertical gap between text lines
 * @cssprop --skeleton-last-line-width - Width of the final text line
 * @cssprop --skeleton-duration    - Shimmer animation duration
 * @cssprop --skeleton-stripe-size  - Width of each diagonal stripe (default: 6px)
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
export const SKELETON_TAG = define<BitSkeletonProps>('bit-skeleton', {
  props: {
    ...sizableBundle,
    animated: true,
    height: undefined,
    lines: 1,
    radius: undefined,
    striped: false,
    variant: 'rect',
    width: undefined,
  } satisfies PropBundle<BitSkeletonProps>,
  setup({ host, props }) {
    const isPaused = signal(false);
    const lineCount = computed(() => {
      const value = Math.floor(Number(props.lines.value));

      return Number.isFinite(value) && value > 0 ? value : 1;
    });
    const renderLineCount = computed(() => (props.variant.value === 'text' ? lineCount.value : 1));
    const styleDeps = computed(
      () =>
        `${props.width.value ?? ''}|${props.height.value ?? ''}|${props.radius.value ?? ''}|${props.animated.value === false ? '0' : '1'}`,
    );

    watch(
      styleDeps,
      () => {
        if (props.width.value) host.el.style.setProperty('--skeleton-width', props.width.value);
        else host.el.style.removeProperty('--skeleton-width');

        if (props.height.value) host.el.style.setProperty('--skeleton-height', props.height.value);
        else host.el.style.removeProperty('--skeleton-height');

        if (props.radius.value) host.el.style.setProperty('--skeleton-radius', props.radius.value);
        else host.el.style.removeProperty('--skeleton-radius');

        const rawAnimated = host.el.getAttribute('animated');
        const isAnimated = rawAnimated !== 'false' && props.animated.value !== false;

        host.el.setAttribute('data-animated', isAnimated ? 'true' : 'false');
      },
      { immediate: true },
    );

    host.bind('attr', {
      'data-paused': () => (isPaused.value ? true : undefined),
    });

    onMount(() => {
      const entry = intersectionObserver(host.el, { threshold: 0 });

      watch(entry, (e) => {
        const paused =
          typeof e === 'object' && e !== null && 'isIntersecting' in e
            ? !(e as IntersectionObserverEntry).isIntersecting
            : false;

        isPaused.value = paused;
      });
    });

    return html`
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
    `;
  },
  styles: [reducedMotionMixin, componentStyles],
});
