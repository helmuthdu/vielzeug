import { define, html, prop } from '@vielzeug/ore';
import { intersectionObserver } from '@vielzeug/ore/observers';
import { computed, signal, watch } from '@vielzeug/ripple';

import type { ComponentSize } from '../../types';

import { sizableBundle } from '../../shared';
import { reducedMotionMixin } from '../../styles';
import { safeCSSLength } from '../../utils';
import componentStyles from './skeleton.css?inline';

/** Skeleton loader component properties */
export type OreSkeletonProps = {
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
 * @element ore-skeleton
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
 * @part stack - Stack container.
 * @part bone - Skeleton bone element.
 * @example
 * ```html
 * <!-- Paragraph lines -->
 * <ore-skeleton variant="text" lines="3" width="100%"></ore-skeleton>
 *
 * <!-- Avatar -->
 * <ore-skeleton variant="circle" size="md"></ore-skeleton>
 *
 * <!-- Card image -->
 * <ore-skeleton width="100%" height="10rem"></ore-skeleton>
 * ```
 */
export const SKELETON_TAG = 'ore-skeleton' as const;
define<OreSkeletonProps>(SKELETON_TAG, {
  props: {
    ...sizableBundle,
    animated: prop.bool(true),
    height: prop.string(),
    lines: prop.number(1),
    radius: prop.string(),
    striped: prop.bool(false),
    variant: prop.oneOf(['rect', 'circle', 'text'] as const, 'rect'),
    width: prop.string(),
  },
  setup(props, { bind, el, onMounted }) {
    const isPaused = signal(false);
    const lineCount = () => {
      const value = Math.floor(Number(props.lines.value));

      return Number.isFinite(value) && value > 0 ? value : 1;
    };
    const renderLineCount = () => (props.variant.value === 'text' ? lineCount() : 1);
    const styleDeps = () =>
      `${props.width.value ?? ''}|${props.height.value ?? ''}|${props.radius.value ?? ''}|${props.animated.value === false ? '0' : '1'}`;

    watch(
      computed(styleDeps),
      () => {
        const safeWidth = safeCSSLength(props.width.value);
        const safeHeight = safeCSSLength(props.height.value);
        const safeRadius = safeCSSLength(props.radius.value);

        if (safeWidth) el.style.setProperty('--skeleton-width', safeWidth);
        else el.style.removeProperty('--skeleton-width');

        if (safeHeight) el.style.setProperty('--skeleton-height', safeHeight);
        else el.style.removeProperty('--skeleton-height');

        if (safeRadius) el.style.setProperty('--skeleton-radius', safeRadius);
        else el.style.removeProperty('--skeleton-radius');

        const rawAnimated = el.getAttribute('animated');
        const isAnimated = rawAnimated !== 'false' && props.animated.value !== false;

        el.setAttribute('data-animated', isAnimated ? 'true' : 'false');
      },
      { immediate: true },
    );

    bind({
      attr: {
        'data-paused': () => (isPaused.value ? true : undefined),
      },
    });

    onMounted(() => {
      const entry = intersectionObserver(el, { threshold: 0 });

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
          Array.from({ length: renderLineCount() }, (_, index) => {
            const isLastLine =
              props.variant.value === 'text' && renderLineCount() > 1 && index === renderLineCount() - 1;

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
