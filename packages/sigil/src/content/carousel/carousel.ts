import { computed, define, html, onMounted, prop, signal, watch } from '@vielzeug/craft';

import type { ThemeColor } from '../../types';

import '../../content/icon/icon';
import '../../feedback/progress/progress';
import { announce } from '../../headless';
import { createSwipeControl } from '../../headless';
import componentStyles from './carousel.css?inline';

// ── Types ──────────────────────────────────────────────────────────────────────

export type CarouselOrientation = 'horizontal' | 'vertical';

export type BitCarouselEvents = {
  /** Fired when the active slide changes. */
  change: { index: number };
};

export type BitCarouselProps = {
  /** Whether to advance slides automatically. Defaults to `false`. */
  autoplay?: boolean;
  /** Interval in milliseconds between automatic slide advances. Defaults to `4000`. */
  'autoplay-interval'?: number;
  /** Theme color passed to the prev/next navigation buttons. */
  color?: ThemeColor;
  /** Accessible label for the carousel region. */
  label?: string;
  /** Whether the carousel loops from the last slide back to the first. Defaults to `true`. */
  loop?: boolean;
  /** Carousel orientation. Defaults to `'horizontal'`. */
  orientation?: CarouselOrientation;
  /** Show next/prev navigation buttons. Defaults to `true`. */
  'show-controls'?: boolean;
  /** Show dot/indicator navigation. Defaults to `true`. */
  'show-indicators'?: boolean;
  /** Index of the currently active slide (zero-based). Defaults to `0`. */
  'slide-index'?: number;
};

/**
 * An accessible, keyboard-navigable carousel / slideshow with optional
 * autoplay, swipe support, and indicator dots.
 *
 * Place `<bit-carousel-slide>` elements as direct children.
 *
 * @element bit-carousel
 *
 * @attr {string} color - Theme color for navigation buttons: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {boolean} autoplay - Advance slides automatically
 * @attr {number} autoplay-interval - Milliseconds between automatic advances (default 4000)
 * @attr {string} label - Accessible label for the carousel region
 * @attr {boolean} loop - Loop from last slide to first (default true)
 * @attr {string} orientation - 'horizontal' (default) | 'vertical'
 * @attr {boolean} show-controls - Show prev/next buttons (default true)
 * @attr {boolean} show-indicators - Show indicator dots (default true)
 * @attr {number} slide-index - Active slide index (zero-based, default 0)
 *
 * @fires change - Fires when the active slide changes. detail: { index: number }
 *
 * @slot - Place `<bit-carousel-slide>` elements here
 *
 * @cssprop --carousel-bg - Slide area background
 * @cssprop --carousel-radius - Border radius of the carousel
 * @cssprop --carousel-dot-bg - Inactive indicator color (default: var(--color-contrast-300))
 * @cssprop --carousel-dot-active-bg - Active indicator / fill color (default: var(--color-contrast-700))
 * @cssprop --carousel-transition-duration - Slide transition duration (default 0.35s)
 * @cssprop --carousel-min-height - Minimum height when no explicit height is set (default 240px)
 *
 * @part track - The scrolling slide track element
 * @part controls - The prev/next button container
 * @part indicators - The indicator dots container
 * @part prev-btn - The previous-slide button
 * @part next-btn - The next-slide button
 *
 * @example
 * ```html
 * <bit-carousel label="Product highlights" loop>
 *   <bit-carousel-slide>Slide 1</bit-carousel-slide>
 *   <bit-carousel-slide>Slide 2</bit-carousel-slide>
 *   <bit-carousel-slide>Slide 3</bit-carousel-slide>
 * </bit-carousel>
 * ```
 */
export const CAROUSEL_TAG = 'bit-carousel' as const;
export const CAROUSEL_SLIDE_TAG = 'bit-carousel-slide' as const;

// ── bit-carousel-slide ───────────────────────────────────────────────────────

const SLIDE_STYLES = `
  :host {
    display: block;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transition:
      transform var(--carousel-transition-duration, 0.35s) ease,
      opacity var(--carousel-transition-duration, 0.35s) ease;
    opacity: 0;
    pointer-events: none;
    transform: translateX(100%);
  }
  :host([data-before]) { transform: translateX(-100%); }
  :host([data-active])  { opacity: 1; pointer-events: auto; transform: translateX(0); }
`;

define(CAROUSEL_SLIDE_TAG, {
  props: {},
  setup(_props, { bind }) {
    bind({
      attr: {
        'aria-roledescription': () => 'slide',
        role: () => 'group',
      },
    });

    return html`<slot></slot>`;
  },
  styles: [SLIDE_STYLES],
});

// ── bit-carousel ──────────────────────────────────────────────────────────────

define<BitCarouselProps, BitCarouselEvents>(CAROUSEL_TAG, {
  props: {
    autoplay: prop.bool(false),
    'autoplay-interval': prop.number(4000),
    color: prop.string<ThemeColor>(),
    label: prop.string('Carousel'),
    loop: prop.bool(true),
    orientation: prop.string<CarouselOrientation>('horizontal'),
    'show-controls': prop.bool(true),
    'show-indicators': prop.bool(true),
    'slide-index': prop.number(0),
  },

  setup(props, { bind, el, emit }) {
    // ── State ────────────────────────────────────────────────────────────────

    const activeIndex = signal<number>(props['slide-index'].value ?? 0);
    const isHovered = signal(false);
    const isFocused = signal(false);
    let autoplayTimer: ReturnType<typeof setInterval> | null = null;

    const getSlides = (): HTMLElement[] =>
      Array.from(el.querySelectorAll<HTMLElement>(`:scope > ${CAROUSEL_SLIDE_TAG}`));

    const slideCount = signal(0);

    const updateSlideCount = (): void => {
      slideCount.value = getSlides().length;
    };

    const isHorizontal = computed(() => props.orientation.value !== 'vertical');
    const looping = computed(() => props.loop.value !== false);
    const showControls = computed(() => props['show-controls'].value !== false);
    const showIndicators = computed(() => props['show-indicators'].value !== false);

    const canGoPrev = computed(() => looping.value || activeIndex.value > 0);
    const canGoNext = computed(() => looping.value || activeIndex.value < slideCount.value - 1);

    // ── Navigation ───────────────────────────────────────────────────────────

    const goTo = (index: number, announce_: boolean = true): void => {
      const count = getSlides().length;

      if (count === 0) return;

      // eslint-disable-next-line no-useless-assignment
      let next = index;

      if (looping.value) {
        next = ((index % count) + count) % count;
      } else {
        next = Math.max(0, Math.min(index, count - 1));
      }

      if (next === activeIndex.value) return;

      activeIndex.value = next;
      emit('change', { index: next });

      if (announce_) {
        const slides = getSlides();
        const slide = slides[next];
        const label = slide?.getAttribute('aria-label') ?? `Slide ${next + 1} of ${count}`;

        announce(label);
      }
    };

    const prev = (): void => goTo(activeIndex.value - 1);
    const next = (): void => goTo(activeIndex.value + 1);

    // ── Sync prop → state ────────────────────────────────────────────────────

    watch(props['slide-index'], (v) => {
      if (typeof v === 'number') goTo(v, false);
    });

    // ── Sync state → slides DOM ──────────────────────────────────────────────

    const syncSlides = (): void => {
      const slides = getSlides();
      const count = slides.length;
      const current = activeIndex.value;

      slides.forEach((slide, i) => {
        const active = i === current;

        slide.setAttribute('aria-hidden', String(!active));
        slide.setAttribute('aria-label', slide.getAttribute('aria-label') ?? `Slide ${i + 1} of ${count}`);
        slide.toggleAttribute('data-active', active);
        slide.toggleAttribute('data-before', i < current);
        slide.toggleAttribute('data-after', i > current);
      });
    };

    updateSlideCount();
    watch(activeIndex, syncSlides, { immediate: true });

    // ── Autoplay ─────────────────────────────────────────────────────────────

    const startAutoplay = (): void => {
      if (autoplayTimer !== null) return;

      const interval = props['autoplay-interval'].value ?? 4000;

      autoplayTimer = setInterval(() => {
        if (!isHovered.value && !isFocused.value) next();
      }, interval);
    };

    const stopAutoplay = (): void => {
      if (autoplayTimer !== null) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    };

    watch(
      computed(() => props.autoplay.value),
      (enabled) => {
        if (enabled) startAutoplay();
        else stopAutoplay();
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
      disabled: () => false,
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
        role: () => 'region',
      },
      on: {
        focusin: () => {
          isFocused.value = true;
        },
        focusout: () => {
          isFocused.value = false;
        },
        keydown: handleKeydown,
        pointercancel: (e: PointerEvent) => swipe.handlePointerCancel(e),
        pointerdown: (e: PointerEvent) => {
          const path = e.composedPath();
          const onButton = path.some(
            (n) => n instanceof HTMLElement && (n.tagName === 'BUTTON' || n.tagName === 'BIT-BUTTON'),
          );

          if (!onButton) swipe.handlePointerDown(e);
        },
        pointerenter: () => {
          isHovered.value = true;
        },
        pointerleave: () => {
          isHovered.value = false;
        },
        pointermove: (e: PointerEvent) => swipe.handlePointerMove(e),
        pointerup: (e: PointerEvent) => swipe.handlePointerUp(e),
      },
    });

    // ── Lifecycle ────────────────────────────────────────────────────────────

    onMounted(() => {
      updateSlideCount();
      syncSlides();

      const observer = new MutationObserver(() => {
        updateSlideCount();
        syncSlides();
      });

      observer.observe(el, { childList: true });

      if (props.autoplay.value) startAutoplay();

      return () => {
        stopAutoplay();
        swipe.cleanup();
        observer.disconnect();
      };
    });

    // ── Template ─────────────────────────────────────────────────────────────

    return html`
      <div class="track" part="track" :aria-live=${() => (props.autoplay.value ? 'off' : 'polite')}>
        <slot></slot>
      </div>

      ${() =>
        showControls.value
          ? html`<div class="controls" part="controls">
              <bit-button
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
                <bit-icon
                  :name=${() => (isHorizontal.value ? 'chevron-left' : 'chevron-up')}
                  size="20"
                  stroke-width="2"
                  aria-hidden="true"></bit-icon>
              </bit-button>
              <bit-button
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
                <bit-icon
                  :name=${() => (isHorizontal.value ? 'chevron-right' : 'chevron-down')}
                  size="20"
                  stroke-width="2"
                  aria-hidden="true"></bit-icon>
              </bit-button>
            </div>`
          : html``}
      ${() =>
        showIndicators.value && slideCount.value > 1
          ? html`<div class="indicators" part="indicators" role="tablist" aria-label="Slide indicators">
              ${() =>
                Array.from(
                  { length: slideCount.value },
                  (_, i) =>
                    html`<bit-progress
                      role="tab"
                      :class=${() => `indicator${i === activeIndex.value ? ' indicator-active' : ''}`}
                      :color=${() => props.color.value}
                      :value=${() => (i === activeIndex.value ? 100 : 0)}
                      :aria-selected=${() => String(i === activeIndex.value)}
                      :aria-label=${`Go to slide ${i + 1}`}
                      :style=${() =>
                        `--carousel-timeout:${props['autoplay-interval'].value ?? 4000};--carousel-animation-name:${i === activeIndex.value && props.autoplay.value ? 'carousel-fill' : 'none'}`}
                      @click=${() => goTo(i)}></bit-progress>`,
                )}
            </div>`
          : html``}
    `;
  },
  styles: [componentStyles],
});
