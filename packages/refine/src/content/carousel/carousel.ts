import { define, html, prop } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';

import type { ThemeColor } from '../../types';

import { warn } from '../../_warn';
import '../../content/icon/icon';
import '../../feedback/progress/progress';
import { announce, createSwipeControl } from '../../headless';
import componentStyles from './carousel.css?inline';
import './carousel-slide';

export { CAROUSEL_SLIDE_TAG } from './carousel-slide';

// ── Types ──────────────────────────────────────────────────────────────────────

export type CarouselOrientation = 'horizontal' | 'vertical';
export type CarouselVariant = 'default' | 'fade' | 'filmstrip' | 'gallery' | 'marquee';

export type OreCarouselEvents = {
  /** Fired when the active slide changes. */
  change: { index: number };
};

export type OreCarouselProps = {
  /**
   * Whether to advance slides automatically. Defaults to `false`.
   * Opt in explicitly — autoplay on by default is a WCAG 2.1 SC 2.2.2 violation for many use cases.
   */
  autoplay?: boolean;
  /** Interval in milliseconds between automatic slide advances. Defaults to `5000`. */
  'autoplay-interval'?: number;
  /** Theme color passed to the prev/next navigation buttons. */
  color?: ThemeColor;
  /** Accessible label for the carousel region. */
  label?: string;
  /**
   * Whether the carousel loops from the last slide back to the first. Defaults to `true`.
   *
   * > **Note for `marquee` variant:** `loop="false"` runs the scroll animation once then stops,
   * > rather than controlling navigation wrap-around (marquee navigation always loops).
   * > If you intend to stop wrapping navigation in another variant, use `loop` there as expected.
   */
  loop?: boolean;
  /**
   * Duration in seconds for one full marquee loop cycle. Defaults to `10`.
   * Shorter values = faster scroll; longer values = slower scroll.
   */
  'marquee-duration'?: number;
  /** Carousel orientation. Defaults to `'horizontal'`. */
  orientation?: CarouselOrientation;
  /** Show next/prev navigation buttons. Defaults to `true`. */
  'show-controls'?: boolean;
  /** Show dot/indicator navigation. Defaults to `true`. */
  'show-indicators'?: boolean;
  /** Index of the currently active slide (zero-based). Defaults to `0`. */
  'slide-index'?: number;
  /**
   * Layout variant.
   * - `'default'`   — slides translate in/out (default)
   * - `'fade'`      — slides crossfade; no movement
   * - `'filmstrip'` — all slides visible side-by-side; active expands
   * - `'gallery'`   — active slide fills the majority; adjacent slides show as thumbnails
   * - `'marquee'`   — continuous auto-scroll ticker; `loop` controls whether it repeats
   */
  variant?: CarouselVariant;
};

// ── Internal marquee instance type ────────────────────────────────────────────

type MarqueeInstance = {
  cleanup: () => void;
  seekTo: (index: number, slideSnapshot: HTMLElement[]) => void;
};

/**
 * An accessible, keyboard-navigable carousel / slideshow with optional
 * autoplay, swipe support, and indicator dots.
 *
 * Place `<ore-carousel-slide>` elements as direct children.
 *
 * @element ore-carousel
 * @element ore-carousel-slide - Child element for individual slides
 *
 * @attr {string}  color             - Theme color for navigation buttons: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {boolean} autoplay          - Advance slides automatically (default false)
 * @attr {number}  autoplay-interval - Milliseconds between automatic advances (default 5000)
 * @attr {string}  label             - Accessible label for the carousel region
 * @attr {boolean} loop              - Loop from last slide to first (default true); in marquee mode: repeat vs run-once
 * @attr {string}  orientation       - 'horizontal' (default) | 'vertical'
 * @attr {string}  variant           - 'default' | 'fade' | 'filmstrip' | 'gallery' | 'marquee'
 * @attr {boolean} show-controls     - Show prev/next buttons (default true)
 * @attr {boolean} show-indicators   - Show indicator dots (default true)
 * @attr {number}  slide-index       - Active slide index (zero-based, default 0)
 * @attr {number}  marquee-duration  - Loop cycle duration in seconds for marquee variant (default 10)
 *
 * @fires change - Fires when the active slide changes. detail: { index: number }
 *
 * @slot - Place `<ore-carousel-slide>` elements here
 *
 * @cssprop --carousel-bg                  - Slide area background
 * @cssprop --carousel-radius              - Border radius of the carousel
 * @cssprop --carousel-dot-bg              - Inactive indicator color (default: var(--color-contrast-300))
 * @cssprop --carousel-dot-active-bg       - Active indicator / fill color (default: var(--color-contrast-700))
 * @cssprop --carousel-transition-duration - Slide transition duration (default 0.35s; 0s under prefers-reduced-motion). Also controls marquee seek animation duration.
 * @cssprop --carousel-min-height          - Minimum height when no explicit height is set (default 240px)
 * @cssprop --carousel-filmstrip-inactive  - Width (horizontal) or height (vertical) of inactive slides in filmstrip mode
 * @cssprop --carousel-filmstrip-gap       - Gap between slides in filmstrip mode
 * @cssprop --carousel-gallery-thumbnail   - Width (horizontal) or height (vertical) of thumbnail slides in gallery mode (default var(--size-24))
 * @cssprop --carousel-gallery-gap         - Gap between slides in gallery mode (default var(--size-2))
 * @cssprop --carousel-marquee-gap         - Gap between slides in marquee mode (default var(--size-4))
 *
 * @part track      - The scrolling slide track element
 * @part controls   - The prev/next button container
 * @part indicators - The indicator dots container
 * @part prev-btn   - The previous-slide button
 * @part next-btn   - The next-slide button
 *
 * @example
 * ```html
 * <ore-carousel label="Product highlights" loop>
 *   <ore-carousel-slide>Slide 1</ore-carousel-slide>
 *   <ore-carousel-slide>Slide 2</ore-carousel-slide>
 *   <ore-carousel-slide>Slide 3</ore-carousel-slide>
 * </ore-carousel>
 * ```
 */
export const CAROUSEL_TAG = 'ore-carousel' as const;

// ── Slide-state sync helpers ──────────────────────────────────────────────────
// Each function handles exactly one variant's attribute bookkeeping.
// Called from a dispatch table in syncActiveState.

const syncDefaultSlides = (slides: HTMLElement[], current: number): void => {
  const count = slides.length;

  slides.forEach((slide, i) => {
    const active = i === current;

    slide.toggleAttribute('data-active', active);
    slide.setAttribute('aria-hidden', String(!active));
    slide.setAttribute('aria-label', slide.getAttribute('aria-label') ?? `Slide ${i + 1} of ${count}`);
    slide.removeAttribute('data-gallery-visible');
    slide.toggleAttribute('data-before', i < current);
    slide.toggleAttribute('data-after', i > current);
  });
};

const syncFilmstripSlides = (slides: HTMLElement[], current: number): void => {
  const count = slides.length;

  slides.forEach((slide, i) => {
    const active = i === current;

    slide.toggleAttribute('data-active', active);
    slide.setAttribute('aria-hidden', String(!active));
    slide.setAttribute('aria-label', slide.getAttribute('aria-label') ?? `Slide ${i + 1} of ${count}`);
    slide.removeAttribute('data-gallery-visible');
    slide.removeAttribute('data-before');
    slide.removeAttribute('data-after');
  });
};

const syncGallerySlides = (slides: HTMLElement[], current: number): void => {
  const count = slides.length;

  slides.forEach((slide, i) => {
    const active = i === current;
    const isPrev = current > 0 && i === current - 1;
    const isNext = current < count - 1 && i === current + 1;

    slide.toggleAttribute('data-active', active);
    slide.setAttribute('aria-hidden', String(!active));
    slide.setAttribute('aria-label', slide.getAttribute('aria-label') ?? `Slide ${i + 1} of ${count}`);
    slide.removeAttribute('data-before');
    slide.removeAttribute('data-after');
    slide.toggleAttribute('data-gallery-visible', active || isPrev || isNext);
  });
};

const syncMarqueeSlides = (slides: HTMLElement[], current: number): void => {
  slides.forEach((slide, i) => {
    slide.toggleAttribute('data-active', i === current);
    slide.setAttribute('aria-hidden', 'false');
    slide.removeAttribute('data-before');
    slide.removeAttribute('data-after');
    slide.removeAttribute('data-gallery-visible');
  });
};

// ── ore-carousel ──────────────────────────────────────────────────────────────

define<OreCarouselProps, OreCarouselEvents>(CAROUSEL_TAG, {
  props: {
    autoplay: prop.bool(false),
    'autoplay-interval': prop.number(5000),
    color: prop.string<ThemeColor>(),
    label: prop.string('Carousel'),
    loop: prop.bool(true),
    'marquee-duration': prop.number(10),
    orientation: prop.string<CarouselOrientation>('horizontal'),
    'show-controls': prop.bool(true),
    'show-indicators': prop.bool(true),
    'slide-index': prop.number(0),
    variant: prop.string<CarouselVariant>('default'),
  },

  setup(props, { bind, el, emit, onMounted }) {
    // ── State ────────────────────────────────────────────────────────────────

    const activeIndex = signal<number>(props['slide-index'].value ?? 0);
    const isMarquee = computed(() => props.variant.value === 'marquee');
    let autoplayTimer: ReturnType<typeof setInterval> | null = null;

    // Slide cache — populated immediately, refreshed on slotchange.
    let slides: HTMLElement[] = Array.from(el.querySelectorAll<HTMLElement>(':scope > ore-carousel-slide'));
    const slideCount = signal(slides.length);

    const refreshSlides = (): void => {
      slides = Array.from(el.querySelectorAll<HTMLElement>(':scope > ore-carousel-slide'));
      slideCount.value = slides.length;
    };

    const isHorizontal = computed(() => props.orientation.value !== 'vertical');
    const looping = computed(() => props.loop.value !== false);
    const showControls = computed(() => props['show-controls'].value !== false);
    const showIndicators = computed(() => props['show-indicators'].value !== false);

    const canGoPrev = computed(() => looping.value || activeIndex.value > 0);
    const canGoNext = computed(() => looping.value || activeIndex.value < slideCount.value - 1);

    // ── Navigation ───────────────────────────────────────────────────────────

    // marqueeInstance is set in onMounted; accessed here via module-level ref
    // stored on the setup closure. No separate side-channel variable needed.
    let marqueeInstance: MarqueeInstance | null = null;

    const goTo = (index: number, announce_: boolean = true): void => {
      const count = slideCount.value;

      if (count === 0) return;

      const next = looping.value ? ((index % count) + count) % count : Math.max(0, Math.min(index, count - 1));

      if (next === activeIndex.value) return;

      activeIndex.value = next;
      el.setAttribute('slide-index', String(next));
      emit('change', { index: next });
      // Pass current slides snapshot so seekTo never reads a stale closure.
      marqueeInstance?.seekTo(next, slides);

      if (announce_) {
        announce(slides[next]?.getAttribute('aria-label') ?? `Slide ${next + 1} of ${count}`);
      }
    };

    const prev = (): void => goTo(activeIndex.value - 1);
    const next = (): void => goTo(activeIndex.value + 1);

    // ── Sync prop → state ────────────────────────────────────────────────────

    watch(props['slide-index'], (v) => {
      if (typeof v === 'number' && v !== activeIndex.value) goTo(v, false);
    });

    // ── Sync variant + orientation → slides ──────────────────────────────────

    const syncSlideVariants = (): void => {
      const variant = props.variant.value ?? 'default';
      const orientation = props.orientation.value ?? 'horizontal';

      slides.forEach((slide) => {
        slide.setAttribute('data-variant', variant);
        slide.setAttribute('data-orientation', orientation);
      });
    };

    watch(
      computed(() => ({ orientation: props.orientation.value, variant: props.variant.value })),
      syncSlideVariants,
      { immediate: true },
    );

    // ── Sync active index → slides — dispatch table ───────────────────────────

    const syncTable: Record<CarouselVariant, (slides: HTMLElement[], current: number) => void> = {
      default: syncDefaultSlides,
      fade: syncDefaultSlides,
      filmstrip: syncFilmstripSlides,
      gallery: syncGallerySlides,
      marquee: syncMarqueeSlides,
    };

    const syncActiveState = (): void => {
      const variant = (props.variant.value ?? 'default') as CarouselVariant;

      syncTable[variant](slides, activeIndex.value);
    };

    watch(activeIndex, syncActiveState, { immediate: true });

    // ── Autoplay ─────────────────────────────────────────────────────────────

    const startAutoplay = (): void => {
      if (autoplayTimer !== null) return;

      autoplayTimer = setInterval(next, props['autoplay-interval'].value ?? 5000);
    };

    const stopAutoplay = (): void => {
      if (autoplayTimer !== null) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    };

    watch(
      computed(() => ({ enabled: props.autoplay.value, interval: props['autoplay-interval'].value })),
      ({ enabled }) => {
        stopAutoplay();

        if (enabled) startAutoplay();
      },
    );

    // ── Keyboard navigation ──────────────────────────────────────────────────

    const handleKeydown = (e: KeyboardEvent): void => {
      const isH = isHorizontal.value;
      const prevKey = isH ? 'ArrowLeft' : 'ArrowUp';
      const nextKey = isH ? 'ArrowRight' : 'ArrowDown';

      if (e.key === prevKey) {
        e.preventDefault();
        prev();
      } else if (e.key === nextKey) {
        e.preventDefault();
        next();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goTo(slideCount.value - 1);
      }
    };

    // ── Swipe ────────────────────────────────────────────────────────────────

    const swipe = createSwipeControl({
      axis: () => (isHorizontal.value ? 'x' : 'y'),
      onCommit: (detail) => {
        if (detail.distance < 0) next();
        else prev();
      },
      threshold: () => 48,
    });

    // ── Host bindings ────────────────────────────────────────────────────────

    bind({
      attr: {
        'aria-label': () => props.label.value ?? 'Carousel',
        'aria-roledescription': () => 'carousel',
        orientation: () => props.orientation.value ?? 'horizontal',
        role: () => 'region',
        style: () => `touch-action:${isHorizontal.value ? 'pan-y' : 'pan-x'}`,
        variant: () => props.variant.value ?? 'default',
      },
      on: {
        focusin: () => {
          stopAutoplay();
        },
        focusout: () => {
          if (props.autoplay.value) startAutoplay();
        },
        keydown: handleKeydown,
        pointercancel: (e: PointerEvent) => swipe.handlePointerCancel(e),
        pointerdown: (e: PointerEvent) => {
          const path = e.composedPath();
          const onButton = path.some(
            (n) =>
              n instanceof HTMLElement &&
              (n.tagName === 'BUTTON' || n.tagName === 'ORE-BUTTON' || n.tagName === 'ORE-PROGRESS'),
          );

          if (!onButton) swipe.handlePointerDown(e);
        },
        pointerenter: () => {
          stopAutoplay();
        },
        pointerleave: () => {
          if (props.autoplay.value) startAutoplay();
        },
        pointermove: (e: PointerEvent) => swipe.handlePointerMove(e),
        pointerup: (e: PointerEvent) => swipe.handlePointerUp(e),
      },
    });

    // ── Marquee ───────────────────────────────────────────────────────────────
    // Clones slides for a seamless loop. Seek uses WAAPI when available
    // (all modern browsers) so it can be cancelled cleanly. Falls back to
    // instant negative-delay repositioning in environments without WAAPI
    // (e.g. jsdom in tests).

    const setupMarquee = (track: HTMLElement): MarqueeInstance => {
      const orientation = props.orientation.value ?? 'horizontal';
      const horizontal = orientation !== 'vertical';

      if (isMarquee.value && props.loop.value === false) {
        warn(
          'ore-carousel: loop="false" on the marquee variant stops the scroll animation rather than ' +
            'disabling navigation wrap-around. Navigation in marquee always loops. ' +
            'This is different from loop="false" on other variants.',
        );
      }

      const clones = slides.map((s) => {
        const clone = s.cloneNode(true) as HTMLElement;

        clone.setAttribute('aria-hidden', 'true');
        clone.setAttribute('data-variant', 'marquee');
        clone.setAttribute('data-orientation', orientation);
        clone.setAttribute('data-marquee-clone', '');
        track.appendChild(clone);

        return clone;
      });

      track.style.setProperty('--_marquee-duration', `${props['marquee-duration'].value ?? 10}s`);

      if (!looping.value) {
        track.style.setProperty('animation-iteration-count', '1');
      }

      let isHovered = false;

      const pause = (): void => {
        isHovered = true;
        track.style.setProperty('animation-play-state', 'paused');
      };

      const resume = (): void => {
        isHovered = false;
        track.style.removeProperty('animation-play-state');
      };

      // mouseenter/mouseleave fire only when the pointer crosses the host
      // boundary — never when moving between children (e.g. onto controls).
      // This means clicking buttons never accidentally resumes the animation.
      el.addEventListener('mouseenter', pause);
      el.addEventListener('mouseleave', resume);

      // ── Seek ──────────────────────────────────────────────────────────────
      // Smoothly slides to the target position using a CSS transition on the
      // inline transform (the CSS keyframe animation is paused throughout so
      // there is no compositing conflict). On transitionend, switches back to
      // the keyframe animation via a negative animation-delay.

      let seekTimer: ReturnType<typeof setTimeout> | null = null;

      const seekTo = (index: number, slideSnapshot: HTMLElement[]): void => {
        const slide = slideSnapshot[index];

        if (!slide) return;

        const targetOffset = horizontal ? slide.offsetLeft : slide.offsetTop;
        const halfSize = horizontal ? track.scrollWidth / 2 : track.scrollHeight / 2;
        const cycleDuration = props['marquee-duration'].value ?? 10;
        const delay = halfSize > 0 ? -((targetOffset / halfSize) * cycleDuration) : 0;

        // Cancel any in-flight seek timer.
        if (seekTimer !== null) {
          clearTimeout(seekTimer);
          seekTimer = null;
          // Snap the previous transition to its end state immediately.
          track.style.removeProperty('transition');
        }

        // No layout (jsdom): instant seek with no visual transition.
        if (halfSize === 0) {
          track.style.setProperty('animation-delay', `${delay}s`);

          if (!isHovered) {
            track.style.removeProperty('animation-play-state');
          }

          return;
        }

        const seekMs =
          parseFloat(getComputedStyle(el).getPropertyValue('--carousel-transition-duration') || '0.35') * 1000 || 350;

        const targetTransform = horizontal ? `translateX(-${targetOffset}px)` : `translateY(-${targetOffset}px)`;

        // 1. Read the current visual position from the live animation, then
        //    kill the animation entirely so nothing else drives transform.
        //    getBoundingClientRect() flushes layout so the matrix is current.
        void track.getBoundingClientRect();

        const computedTransform = getComputedStyle(track).transform;
        const matrixValues = computedTransform
          .match(/matrix\(([^)]+)\)/)?.[1]
          .split(',')
          .map(Number);
        const frozenOffset = horizontal ? (matrixValues?.[4] ?? 0) : (matrixValues?.[5] ?? 0);
        const frozenTransform = horizontal ? `translateX(${frozenOffset}px)` : `translateY(${frozenOffset}px)`;

        // Stop the CSS animation — inline transform is now the sole driver.
        track.style.setProperty('animation', 'none');
        track.style.setProperty('transform', frozenTransform);

        // 2. Next frame: apply transition and slide to target.
        requestAnimationFrame(() => {
          track.style.setProperty('transition', `transform ${seekMs}ms ease-in-out`);
          track.style.setProperty('transform', targetTransform);

          // 3. After the transition completes, restore the keyframe animation
          //    at the correct position via negative animation-delay.
          seekTimer = setTimeout(() => {
            seekTimer = null;
            track.style.removeProperty('transition');
            track.style.removeProperty('transform');
            track.style.removeProperty('animation');
            track.style.setProperty('animation-delay', `${delay}s`);

            if (isHovered) {
              track.style.setProperty('animation-play-state', 'paused');
            }
          }, seekMs);
        });
      };

      return {
        cleanup: () => {
          if (seekTimer !== null) clearTimeout(seekTimer);

          seekTimer = null;
          clones.forEach((c) => c.remove());
          track.style.removeProperty('transition');
          track.style.removeProperty('transform');
          track.style.removeProperty('animation');
          track.style.removeProperty('--_marquee-duration');
          track.style.removeProperty('animation-iteration-count');
          track.style.removeProperty('animation-delay');
          track.style.removeProperty('animation-play-state');
          el.removeEventListener('mouseenter', pause);
          el.removeEventListener('mouseleave', resume);
        },
        seekTo,
      };
    };

    // ── Lifecycle ────────────────────────────────────────────────────────────

    onMounted(() => {
      const shadowRoot = el.shadowRoot!;
      const track = shadowRoot.querySelector<HTMLElement>('.track')!;
      const slot = shadowRoot.querySelector<HTMLSlotElement>('slot')!;

      // slotchange replaces MutationObserver — fires exactly when assigned
      // nodes change, scoped to this component's slot, no polling overhead.
      const onSlotChange = (): void => {
        refreshSlides();
        syncSlideVariants();
        syncActiveState();

        if (isMarquee.value) {
          marqueeInstance?.cleanup();
          marqueeInstance = setupMarquee(track);
        }
      };

      slot.addEventListener('slotchange', onSlotChange);

      watch(
        computed(() => ({
          duration: props['marquee-duration'].value,
          isMarquee: isMarquee.value,
          loop: props.loop.value,
          orientation: props.orientation.value,
        })),
        ({ isMarquee: active }) => {
          marqueeInstance?.cleanup();
          marqueeInstance = active ? setupMarquee(track) : null;
        },
        { immediate: true },
      );

      if (props.autoplay.value) {
        startAutoplay();
      }

      return () => {
        stopAutoplay();
        swipe.dispose();
        slot.removeEventListener('slotchange', onSlotChange);
        marqueeInstance?.cleanup();
      };
    });

    // ── Template ─────────────────────────────────────────────────────────────

    const renderControls = () =>
      showControls.value
        ? html`<div class="controls" part="controls">
            <ore-button
              class="nav-btn prev-btn"
              part="prev-btn"
              variant="ghost"
              :color=${() => props.color.value}
              rounded
              icon-only
              aria-label="Previous slide"
              :disabled=${() => (!canGoPrev.value ? true : undefined)}
              @click=${(e: Event) => {
                e.stopPropagation();
                prev();
              }}>
              <ore-icon
                :name=${() => (isHorizontal.value ? 'chevron-left' : 'chevron-up')}
                size="16"
                stroke-width="2"
                aria-hidden="true"></ore-icon>
            </ore-button>
            <ore-button
              class="nav-btn next-btn"
              part="next-btn"
              variant="ghost"
              :color=${() => props.color.value}
              rounded
              icon-only
              aria-label="Next slide"
              :disabled=${() => (!canGoNext.value ? true : undefined)}
              @click=${(e: Event) => {
                e.stopPropagation();
                next();
              }}>
              <ore-icon
                :name=${() => (isHorizontal.value ? 'chevron-right' : 'chevron-down')}
                size="16"
                stroke-width="2"
                aria-hidden="true"></ore-icon>
            </ore-button>
          </div>`
        : html``;

    return html`
      <div class="track" part="track" :aria-live=${() => (props.autoplay.value ? 'off' : 'polite')}>
        <slot></slot>
      </div>

      ${() =>
        showIndicators.value && slideCount.value > 1 && !isMarquee.value
          ? html`<div class="indicators" part="indicators" role="tablist" aria-label="Slide indicators">
              ${() =>
                Array.from(
                  { length: slideCount.value },
                  (_, i) =>
                    html`<ore-progress
                      role="tab"
                      :class=${() =>
                        `indicator${!isMarquee.value && i === activeIndex.value ? ' indicator-active' : ''}`}
                      :color=${() => props.color.value}
                      :type=${() => (isHorizontal.value ? 'linear' : 'vertical')}
                      :value=${() => (!isMarquee.value && i === activeIndex.value ? 100 : 0)}
                      :aria-selected=${() => String(!isMarquee.value && i === activeIndex.value)}
                      :aria-label=${`Go to slide ${i + 1}`}
                      :style=${() => {
                        const fillAnim = isHorizontal.value ? 'carousel-fill' : 'carousel-fill-v';

                        return `--carousel-timeout:${props['autoplay-interval'].value ?? 5000};--carousel-animation-name:${!isMarquee.value && i === activeIndex.value && props.autoplay.value ? fillAnim : 'none'}`;
                      }}
                      @click=${() => goTo(i)}></ore-progress>`,
                )}
              ${renderControls}
            </div>`
          : html`${renderControls}`}
    `;
  },
  styles: [componentStyles],
});
