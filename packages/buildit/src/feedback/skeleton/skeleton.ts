import { computed, defineComponent, html, onMount, watch } from '@vielzeug/craftit';
import { observeIntersection } from '@vielzeug/craftit/labs';

import type { ComponentSize } from '../../types';

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
export const SKELETON_TAG = defineComponent<BitSkeletonProps>({
  props: {
    animated: { default: true },
    height: { default: undefined },
    lines: { default: 1 },
    radius: { default: undefined },
    size: { default: undefined },
    striped: { default: false },
    variant: { default: 'rect' },
    width: { default: undefined },
  },
  setup({ host, props }) {
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
    onMount(() => {
      const entry = observeIntersection(host, { threshold: 0 });

      watch(entry, (e) => {
        host.toggleAttribute('data-paused', e !== null && !e.isIntersecting);
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
  tag: 'bit-skeleton',
});
