import { define, getHost, html, onMounted, prop } from '@vielzeug/ore';
import { watch } from '@vielzeug/ripple';

import type { ThemeColor } from '../../types';

import '../icon/icon';
import '../../inputs/button/button';
import componentStyles from './marquee.css?inline';

export type MarqueeDirection = 'left' | 'right';

export type OreMarqueeProps = {
  /** Theme color for the navigation controls. */
  color?: ThemeColor;
  /** Scroll direction. Defaults to `'left'`. */
  direction?: MarqueeDirection;
  /** Duration in seconds for one complete ticker cycle. Defaults to `20`. */
  duration?: number;
  /** Pause the ticker while it is hovered. Defaults to `false`. */
  'pause-on-hover'?: boolean;
  /** Show previous/next navigation controls. Defaults to `true`. */
  'show-controls'?: boolean;
};

/**
 * A CSS-driven, continuously scrolling ticker.
 *
 * Direct child elements are duplicated internally for a seamless loop. Cloned
 * content is inert and hidden from assistive technology, so author interactive
 * content only in the original children.
 *
 * @element ore-marquee
 *
 * @attr {string} color - Theme color for the navigation controls.
 * @attr {number} duration - Duration in seconds for one ticker cycle (default: 20)
 * @attr {string} direction - 'left' (default) | 'right'
 * @attr {boolean} pause-on-hover - Pause while hovered (default: false)
 * @attr {boolean} show-controls - Show previous/next controls (default: true)
 *
 * @cssprop --marquee-gap - Gap between ticker items (default: var(--size-4))
 *
 * @part track - The animated ticker track.
 * @example
 * ```html
 * <ore-marquee duration="24" pause-on-hover>
 *   <span>Free shipping</span>
 *   <span>New arrivals</span>
 * </ore-marquee>
 * ```
 */
export const MARQUEE_TAG = 'ore-marquee' as const;

define<OreMarqueeProps>(MARQUEE_TAG, {
  props: {
    color: prop.string<ThemeColor>(),
    direction: prop.string<MarqueeDirection>('left'),
    duration: prop.number(20),
    'pause-on-hover': prop.bool(false),
    'show-controls': prop.bool(true),
  },
  setup(props) {
    const el = getHost();
    let activeIndex = 0;
    let clones: HTMLElement[] = [];
    let items: HTMLElement[] = [];
    let layoutFrame: number | null = null;
    let loopWidth = 0;
    let resizeObserver: ResizeObserver | null = null;
    let track: HTMLElement | null = null;

    const seekTo = (index: number): void => {
      if (!track || items.length === 0) return;

      activeIndex = (index + items.length) % items.length;

      const item = items[activeIndex];

      if (!item || loopWidth === 0) return;

      const duration = props.duration.value ?? 20;
      const delay = -((item.offsetLeft / loopWidth) * duration);

      track.style.setProperty('animation-delay', `${delay}s`);
    };

    watch(
      props.duration,
      (duration) => {
        el.style.setProperty('--_marquee-duration', `${duration ?? 20}s`);
      },
      { immediate: true },
    );

    onMounted(() => {
      track = el.shadowRoot?.querySelector<HTMLElement>('.track') ?? null;

      const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot') ?? null;

      const removeClones = (): void => {
        clones.forEach((clone) => {
          clone.remove();
        });
        clones = [];
      };

      const appendCloneSet = (): void => {
        clones.push(
          ...items.map((item) => {
            const clone = item.cloneNode(true) as HTMLElement;

            clone.setAttribute('aria-hidden', 'true');
            clone.setAttribute('data-marquee-clone', '');
            clone.setAttribute('inert', '');
            el.appendChild(clone);

            return clone;
          }),
        );
      };

      const syncLoop = (): void => {
        if (!track || items.length === 0) return;

        const marqueeTrack = track;

        if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);

        removeClones();
        loopWidth = 0;
        marqueeTrack.style.removeProperty('--_marquee-translate');
        appendCloneSet();

        layoutFrame = requestAnimationFrame(() => {
          layoutFrame = null;

          const firstClone = clones[0];
          const firstItem = items[0];

          if (!firstClone || !firstItem) return;

          loopWidth = firstClone.offsetLeft - firstItem.offsetLeft;

          if (loopWidth <= 0) return;

          const requiredSets = Math.max(2, Math.ceil((el.clientWidth + loopWidth) / loopWidth));

          for (let set = 2; set < requiredSets; set += 1) appendCloneSet();

          marqueeTrack.style.setProperty('--_marquee-translate', `-${loopWidth}px`);
        });
      };

      const refreshItems = (): void => {
        const nextItems = (slot?.assignedElements() ?? []).filter(
          (child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute('data-marquee-clone'),
        );
        const itemsChanged =
          nextItems.length !== items.length || nextItems.some((item, index) => item !== items[index]);

        if (!itemsChanged) return;

        items = nextItems;
        activeIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));
        syncLoop();
      };

      resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncLoop);
      resizeObserver?.observe(el);
      slot?.addEventListener('slotchange', refreshItems);
      refreshItems();

      return () => {
        if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);

        resizeObserver?.disconnect();
        slot?.removeEventListener('slotchange', refreshItems);
        removeClones();
        track = null;
        items = [];
        loopWidth = 0;
      };
    });

    return html`
      <div class="track" part="track" aria-live="off">
        <slot></slot>
      </div>
      ${() =>
        props['show-controls'].value !== false
          ? html`
              <div class="controls" part="controls">
                <ore-button
                  class="nav-btn prev-btn"
                  part="prev-btn"
                  variant="ghost"
                  color=${() => props.color.value}
                  rounded
                  icon-only
                  label="Previous item"
                  @click=${(event: Event) => {
                    event.stopPropagation();
                    seekTo(activeIndex - 1);
                  }}>
                  <ore-icon name="chevron-left" size="16" stroke-width="2" aria-hidden="true"></ore-icon>
                </ore-button>
                <ore-button
                  class="nav-btn next-btn"
                  part="next-btn"
                  variant="ghost"
                  color=${() => props.color.value}
                  rounded
                  icon-only
                  label="Next item"
                  @click=${(event: Event) => {
                    event.stopPropagation();
                    seekTo(activeIndex + 1);
                  }}>
                  <ore-icon name="chevron-right" size="16" stroke-width="2" aria-hidden="true"></ore-icon>
                </ore-button>
              </div>
            `
          : null}
    `;
  },
  styles: [componentStyles],
});
