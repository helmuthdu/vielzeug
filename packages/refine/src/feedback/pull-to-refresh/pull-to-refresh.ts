import { createPanGesture, type PanGesture } from '@vielzeug/gesture';
import { type SpringHandle, spring } from '@vielzeug/necromancer';
import { define, getHost, html, onCleanup, onMounted, prop, ref, useEmit } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { getMotionMode } from '../../motion';
import componentStyles from './pull-to-refresh.css?inline';

/**
 * Refresh phases, reported through the `phase` property and `data-phase`:
 *
 * - `idle`: at rest, nothing pending.
 * - `pulling`: an active drag, not yet past the threshold.
 * - `ready`: an active drag past the threshold: releasing starts the refresh.
 * - `refreshing`: a refresh is in flight; the indicator holds at the threshold.
 * - `done`: the refresh ended; the indicator springs back to rest.
 */
export type PullToRefreshPhase = 'done' | 'idle' | 'pulling' | 'ready' | 'refreshing';

/** Pull-to-refresh props */
export type OrePullToRefreshProps = {
  /** Disable the pull gesture */
  disabled?: boolean;
  /** Distance in px the content must be dragged before release starts the refresh */
  threshold?: number;
};

/** Events emitted by the pull-to-refresh component */
export type OrePullToRefreshEvents = {
  /**
   * Emitted when a pull commits and the indicator settles at the refresh
   * position. The refresh stays in flight until {@link PullToRefreshElement.refreshed}
   * is called.
   */
  refresh: undefined;
};

/** Element interface exposing the imperative API for `ore-pull-to-refresh`. */
export interface PullToRefreshElement extends HTMLElement {
  /** End the in-flight refresh and retract the indicator. */
  refreshed(): void;
}

/** Default pull distance (px) past which a release commits the refresh. */
const DEFAULT_THRESHOLD = 64;

/**
 * A pull-to-refresh scroll container: drag the (already scrolled-to-top)
 * content down past the threshold and release to trigger a refresh. A
 * spring-physics indicator tracks the finger, rubber-bands past the threshold,
 * carries the release momentum, and holds at the refresh position until the
 * consumer calls `refreshed()`.
 *
 * The component owns the gesture and the motion; the consumer owns the data.
 * Listen for `refresh`, load, then call `refreshed()` on the element when the
 * load resolves.
 *
 * @element ore-pull-to-refresh
 *
 * @attr {number} threshold - Pull distance in px before release commits (default: 64)
 * @attr {boolean} disabled - Disable the pull gesture
 *
 * @fires refresh - Emitted when a pull commits. Call `refreshed()` when the load finishes.
 *
 * @slot - The scrollable content.
 *
 * @cssprop --pull-to-refresh-spinner-size - Spinner diameter (default: 24px)
 * @cssprop --pull-to-refresh-spinner-color - Spinner color (defaults to the primary color)
 *
 * @part indicator - The indicator region holding the spinner.
 * @part spinner - The spinner element.
 * @part content - The dragged content wrapper.
 *
 * @example
 * ```html
 * <ore-pull-to-refresh id="feed">
 *   <ul>...</ul>
 * </ore-pull-to-refresh>
 * <script>
 *   feed.addEventListener('refresh', async () => {
 *     await reloadFeed();
 *     feed.refreshed();
 *   });
 * </script>
 * ```
 */
export const PULL_TO_REFRESH_TAG = 'ore-pull-to-refresh' as const;
define<OrePullToRefreshProps>(PULL_TO_REFRESH_TAG, {
  props: {
    disabled: prop.bool(false),
    threshold: prop.number(DEFAULT_THRESHOLD),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OrePullToRefreshEvents>();

    const scrollRef = ref<HTMLDivElement>();
    const contentRef = ref<HTMLDivElement>();

    const phase = signal<PullToRefreshPhase>('idle');
    /** Current indicator offset in px: the single animated value the drag and spring both write. */
    const offset = signal(0);

    const thresholdPx = computed(() => {
      const raw = Number(props.threshold.value);

      return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_THRESHOLD;
    });

    let pan: PanGesture | undefined;
    let springHandle: SpringHandle | undefined;
    let dragBase = 0;

    const setPhase = (next: PullToRefreshPhase): void => {
      if (phase.value === next) return;

      phase.value = next;
      el.setAttribute('data-phase', next);
    };

    /** Render the animated offset onto the indicator height and content transform. */
    const paint = (value: number): void => {
      offset.value = value;

      // Clamped, not the raw spring value: settling back to 0 is seeded with the release velocity,
      // and the default damping sits just under critical, so the tail overshoots a few pixels past
      // the target. A negative length is an invalid value, which drops the entire `height`
      // declaration and lets the indicator snap to auto height for a frame, popping the clipped
      // spinner row into layout. The spring itself keeps its unclamped value, so a drag that
      // interrupts mid-overshoot still resumes from the true position.
      const rendered = Math.max(0, value);

      const content = contentRef.value;

      if (content) content.style.transform = `translateY(${rendered}px)`;
    };

    /** Animate the indicator to `target` on a spring, replacing any flight. */
    const settleTo = (target: number, velocity: number, onRest?: () => void): void => {
      // Detaching the outgoing flight first matters on the early-return path too: disposing it
      // settles its promise, and the `finally` below compares against `springHandle`. Left set,
      // that callback would see its own handle, clear nothing, and run the previous `onRest`
      // alongside the new one.
      const outgoing = springHandle;
      springHandle = undefined;
      outgoing?.dispose();

      if (offset.value === target) {
        onRest?.();

        return;
      }

      const handle = spring(offset.value, target, paint, { motion: getMotionMode(), velocity });

      springHandle = handle;
      void handle.result.finally(() => {
        // A newer flight (or a drag) took over: this one has nothing left to do.
        if (springHandle !== handle) return;

        springHandle = undefined;
        paint(target);
        onRest?.();
      });
    };

    /** Rubber-band the overscroll: past the threshold the content keeps moving with diminishing returns. */
    const rubberBand = (pull: number): number => {
      const threshold = thresholdPx.value;

      return pull <= threshold ? pull : threshold + Math.sqrt(Math.max(0, pull - threshold) * threshold);
    };

    const endRefresh = (): void => {
      if (phase.value !== 'refreshing') return;

      setPhase('done');
      settleTo(0, 0, () => {
        if (phase.value === 'done') setPhase('idle');
      });
    };

    const startRefresh = (velocity: number): void => {
      setPhase('refreshing');
      settleTo(thresholdPx.value, velocity);
      emit('refresh');
    };

    const pullAt = (distance: number): number => dragBase + Math.max(0, distance);

    onMounted(() => {
      const scrollEl = scrollRef.value;
      const content = contentRef.value;

      if (!scrollEl || !content) return;

      pan = createPanGesture(scrollEl, {
        axis: 'y',
        disabled: () => props.disabled.value,
        onEnd: ({ distance, velocity, reason }) => {
          if (phase.value === 'refreshing') return;

          if (reason === 'release' && pullAt(distance) >= thresholdPx.value) {
            startRefresh(velocity);

            return;
          }

          settleTo(0, reason === 'release' ? velocity : 0);
          setPhase('idle');
        },
        onMove: ({ distance }) => {
          const pull = rubberBand(pullAt(distance));

          paint(pull);
          setPhase(pull >= thresholdPx.value ? 'ready' : 'pulling');
        },
        onStart: () => {
          springHandle?.dispose();
          springHandle = undefined;
          dragBase = offset.value;
        },
        pointerCapture: false,
        // A pull only starts from the top of the scroll: mid-scroll drags
        // belong to the scroller.
        shouldStart: () =>
          !props.disabled.value && phase.value !== 'refreshing' && (scrollRef.value?.scrollTop ?? 0) <= 0,
      });
    });

    (el as PullToRefreshElement).refreshed = endRefresh;

    onCleanup(() => {
      pan?.dispose();
      springHandle?.dispose();
    });

    return html`
      <div class="scroll" part="scroll" ref=${scrollRef}>
        <div class="indicator" part="indicator" style=${() => `height: ${Math.max(0, offset.value)}px`}>
          <div class="spinner" part="spinner" role="status" aria-live="polite">
            <span class="spinner-ring" aria-hidden="true"></span>
            <span class="spinner-label">Refreshing</span>
          </div>
        </div>
        <div class="content" part="content" ref=${contentRef}>
          <slot></slot>
        </div>
      </div>
    `;
  },
  styles: [componentStyles],
});
