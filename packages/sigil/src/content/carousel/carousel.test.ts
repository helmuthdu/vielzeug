import { type Fixture, mount } from '@vielzeug/craft/testing';

const getSlides = (f: Fixture<HTMLElement>): HTMLElement[] =>
  Array.from(f.element.querySelectorAll<HTMLElement>('sg-carousel-slide'));

const activeSlide = (f: Fixture<HTMLElement>): HTMLElement | null =>
  f.element.querySelector<HTMLElement>('sg-carousel-slide[data-active]');

const dots = (f: Fixture<HTMLElement>): HTMLElement[] => f.queryAll<HTMLElement>('.indicator');

const prevBtn = (f: Fixture<HTMLElement>): HTMLElement | null => f.query<HTMLElement>('.prev-btn');

const nextBtn = (f: Fixture<HTMLElement>): HTMLElement | null => f.query<HTMLElement>('.next-btn');

const track = (f: Fixture<HTMLElement>): HTMLElement | null => f.query<HTMLElement>('.track');

const SLIDES_HTML = `
  <sg-carousel-slide>Slide 1</sg-carousel-slide>
  <sg-carousel-slide>Slide 2</sg-carousel-slide>
  <sg-carousel-slide>Slide 3</sg-carousel-slide>
`;

describe('sg-carousel', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../../feedback/progress/progress');
    await import('./carousel');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  const slides = SLIDES_HTML;

  // ── Core Functionality ───────────────────────────────────────────────────────

  describe('Core functionality', () => {
    it('renders with minimal props and activates first slide', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all.length).toBe(3);
      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('renders track, controls, and indicators', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      expect(fixture.query('.track')).toBeTruthy();
      expect(fixture.query('.controls')).toBeTruthy();
      expect(fixture.query('.indicators')).toBeTruthy();
    });

    it('has autoplay disabled by default', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      expect((fixture.element as HTMLElement & { autoplay: boolean }).autoplay).toBe(false);
    });

    it('hides controls when show-controls is false', async () => {
      fixture = await mount('sg-carousel', { attrs: { 'show-controls': 'false' }, html: slides });
      await fixture.flush();

      expect(fixture.query('.controls')).toBeNull();
    });

    it('hides indicators when show-indicators is false', async () => {
      fixture = await mount('sg-carousel', { attrs: { 'show-indicators': 'false' }, html: slides });
      await fixture.flush();

      expect(fixture.query('.indicators')).toBeNull();
    });

    it('advances to next slide on next button click', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });

    it('goes to previous slide on prev button click', async () => {
      fixture = await mount('sg-carousel', { attrs: { 'slide-index': '1' }, html: slides });
      await fixture.flush();

      prevBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('emits change event when slide changes', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect((onChange.mock.calls[0][0] as CustomEvent).detail.index).toBe(1);
    });

    it('jumps to slide via indicator dot click', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      dots(fixture)[2]?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });

    it('syncs when slide-index prop changes', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      (fixture.element as HTMLElement & { 'slide-index': number })['slide-index'] = 2;
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });

    it('renders correct number of indicator dots', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      expect(dots(fixture).length).toBe(3);
    });

    it('marks active dot with dot-active class', async () => {
      fixture = await mount('sg-carousel', { attrs: { 'slide-index': '1' }, html: slides });
      await fixture.flush();

      expect(dots(fixture)[1]?.classList.contains('indicator-active')).toBe(true);
      expect(dots(fixture)[0]?.classList.contains('indicator-active')).toBe(false);
    });
  });

  // ── Loop behavior ────────────────────────────────────────────────────────────

  describe('Loop behavior', () => {
    it('loops from last to first when loop is true', async () => {
      fixture = await mount('sg-carousel', { attrs: { 'slide-index': '2' }, html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('loops from first to last when loop is true', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      prevBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });

    it('disables next button at last slide when loop is false', async () => {
      fixture = await mount('sg-carousel', {
        attrs: { loop: 'false', 'slide-index': '2' },
        html: slides,
      });
      await fixture.flush();

      expect(nextBtn(fixture)?.hasAttribute('disabled')).toBe(true);
    });

    it('disables prev button at first slide when loop is false', async () => {
      fixture = await mount('sg-carousel', { attrs: { loop: 'false' }, html: slides });
      await fixture.flush();

      expect(prevBtn(fixture)?.hasAttribute('disabled')).toBe(true);
    });

    it('does not advance past last slide when loop is false', async () => {
      fixture = await mount('sg-carousel', {
        attrs: { loop: 'false', 'slide-index': '2' },
        html: slides,
      });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(onChange).not.toHaveBeenCalled();
      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });
  });

  // ── Accessibility ────────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('sets role="region" on host', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      expect(fixture.element.getAttribute('role')).toBe('region');
    });

    it('sets aria-roledescription="carousel" on host', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      expect(fixture.element.getAttribute('aria-roledescription')).toBe('carousel');
    });

    it('sets aria-label on host from label prop', async () => {
      fixture = await mount('sg-carousel', { attrs: { label: 'Hero banners' }, html: slides });
      await fixture.flush();

      expect(fixture.element.getAttribute('aria-label')).toBe('Hero banners');
    });

    it('sets role="group" and aria-roledescription="slide" on each slide', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      const all = getSlides(fixture);

      all.forEach((slide) => {
        expect(slide.getAttribute('role')).toBe('group');
        expect(slide.getAttribute('aria-roledescription')).toBe('slide');
      });
    });

    it('sets aria-hidden="true" on inactive slides', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all[0]?.getAttribute('aria-hidden')).toBe('false');
      expect(all[1]?.getAttribute('aria-hidden')).toBe('true');
      expect(all[2]?.getAttribute('aria-hidden')).toBe('true');
    });

    it('sets aria-live="polite" on track by default (autoplay off)', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      expect(fixture.query('.track')?.getAttribute('aria-live')).toBe('polite');
    });

    it('sets aria-live="off" on track when autoplay is on', async () => {
      fixture = await mount('sg-carousel', { attrs: { autoplay: 'true' }, html: slides });
      await fixture.flush();

      expect(fixture.query('.track')?.getAttribute('aria-live')).toBe('off');
    });

    it('labels prev/next buttons accessibly', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      expect(prevBtn(fixture)?.getAttribute('aria-label')).toBe('Previous slide');
      expect(nextBtn(fixture)?.getAttribute('aria-label')).toBe('Next slide');
    });

    it('sets role="tablist" and aria-label on indicators container', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      const ind = fixture.query('.indicators');

      expect(ind?.getAttribute('role')).toBe('tablist');
      expect(ind?.getAttribute('aria-label')).toBe('Slide indicators');
    });

    it('sets role="tab" and aria-selected on indicator dots', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      const d = dots(fixture);

      expect(d[0]?.getAttribute('role')).toBe('tab');
      expect(d[0]?.getAttribute('aria-selected')).toBe('true');
      expect(d[1]?.getAttribute('aria-selected')).toBe('false');
    });

    it('navigates with ArrowRight / ArrowLeft keyboard keys', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('jumps to first/last slide with Home/End keys', async () => {
      fixture = await mount('sg-carousel', { attrs: { 'slide-index': '1' }, html: slides });
      await fixture.flush();

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('uses ArrowUp/ArrowDown for vertical orientation', async () => {
      fixture = await mount('sg-carousel', { attrs: { orientation: 'vertical' }, html: slides });
      await fixture.flush();

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });
  });

  // ── Variants ─────────────────────────────────────────────────────────────────

  describe('Variants', () => {
    it('sets data-variant="default" on slides by default', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('default');
      });
    });

    it('sets data-variant="fade" on slides when variant=fade', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'fade' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('fade');
      });
    });

    it('sets data-variant="filmstrip" on slides when variant=filmstrip (horizontal)', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'filmstrip' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('filmstrip');
        expect(slide.getAttribute('data-orientation')).toBe('horizontal');
      });
    });

    it('sets data-variant="filmstrip" + data-orientation="vertical" when variant=filmstrip + orientation=vertical', async () => {
      fixture = await mount('sg-carousel', {
        attrs: { orientation: 'vertical', variant: 'filmstrip' },
        html: slides,
      });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('filmstrip');
        expect(slide.getAttribute('data-orientation')).toBe('vertical');
      });
    });

    it('does not set data-before/data-after in filmstrip mode', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'filmstrip' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.hasAttribute('data-before')).toBe(false);
        expect(slide.hasAttribute('data-after')).toBe(false);
      });
    });

    it('sets data-before/data-after on non-filmstrip variants', async () => {
      fixture = await mount('sg-carousel', { attrs: { 'slide-index': '1', variant: 'fade' }, html: slides });
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all[0]?.hasAttribute('data-before')).toBe(true);
      expect(all[1]?.hasAttribute('data-active')).toBe(true);
      expect(all[2]?.hasAttribute('data-after')).toBe(true);
    });

    it('navigates correctly in fade variant', async () => {
      fixture = await mount('sg-carousel', { attrs: { autoplay: 'false', variant: 'fade' }, html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });

    it('updates data-variant on all slides when variant prop changes', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'default' }, html: slides });
      await fixture.flush();

      (fixture.element as HTMLElement & { variant: string }).variant = 'fade';
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('fade');
      });
    });

    it('updates data-orientation on all slides when orientation prop changes', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      (fixture.element as HTMLElement & { orientation: string }).orientation = 'vertical';
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-orientation')).toBe('vertical');
      });
    });

    // ── Gallery ────────────────────────────────────────────────────────────────

    it('sets data-variant="gallery" + data-orientation on slides when variant=gallery', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'gallery' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('gallery');
        expect(slide.getAttribute('data-orientation')).toBe('horizontal');
      });
    });

    it('sets data-orientation="vertical" on slides when orientation=vertical', async () => {
      fixture = await mount('sg-carousel', { attrs: { orientation: 'vertical', variant: 'gallery' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('gallery');
        expect(slide.getAttribute('data-orientation')).toBe('vertical');
      });
    });

    it('gallery: at index 1, slides 0+1+2 visible, slide 3 hidden', async () => {
      const fourSlides = `
        <sg-carousel-slide>S1</sg-carousel-slide>
        <sg-carousel-slide>S2</sg-carousel-slide>
        <sg-carousel-slide>S3</sg-carousel-slide>
        <sg-carousel-slide>S4</sg-carousel-slide>
      `;

      fixture = await mount('sg-carousel', { attrs: { 'slide-index': '1', variant: 'gallery' }, html: fourSlides });
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all[0]?.hasAttribute('data-gallery-visible')).toBe(true);
      expect(all[1]?.hasAttribute('data-active')).toBe(true);
      expect(all[1]?.hasAttribute('data-gallery-visible')).toBe(true);
      expect(all[2]?.hasAttribute('data-gallery-visible')).toBe(true);
      expect(all[3]?.hasAttribute('data-gallery-visible')).toBe(false);
    });

    it('gallery: at index 0 (first), no wrap-around — only active + next visible', async () => {
      const fourSlides = `
        <sg-carousel-slide>S1</sg-carousel-slide>
        <sg-carousel-slide>S2</sg-carousel-slide>
        <sg-carousel-slide>S3</sg-carousel-slide>
        <sg-carousel-slide>S4</sg-carousel-slide>
      `;

      fixture = await mount('sg-carousel', { attrs: { 'slide-index': '0', variant: 'gallery' }, html: fourSlides });
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all[0]?.hasAttribute('data-active')).toBe(true);
      expect(all[0]?.hasAttribute('data-gallery-visible')).toBe(true);
      expect(all[1]?.hasAttribute('data-gallery-visible')).toBe(true);
      expect(all[2]?.hasAttribute('data-gallery-visible')).toBe(false);
      expect(all[3]?.hasAttribute('data-gallery-visible')).toBe(false);
    });

    it('gallery: at last index, no wrap-around — only prev + active visible', async () => {
      const fourSlides = `
        <sg-carousel-slide>S1</sg-carousel-slide>
        <sg-carousel-slide>S2</sg-carousel-slide>
        <sg-carousel-slide>S3</sg-carousel-slide>
        <sg-carousel-slide>S4</sg-carousel-slide>
      `;

      fixture = await mount('sg-carousel', { attrs: { 'slide-index': '3', variant: 'gallery' }, html: fourSlides });
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all[0]?.hasAttribute('data-gallery-visible')).toBe(false);
      expect(all[1]?.hasAttribute('data-gallery-visible')).toBe(false);
      expect(all[2]?.hasAttribute('data-gallery-visible')).toBe(true);
      expect(all[3]?.hasAttribute('data-active')).toBe(true);
      expect(all[3]?.hasAttribute('data-gallery-visible')).toBe(true);
    });

    it('gallery: does not set data-before/data-after', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'gallery' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.hasAttribute('data-before')).toBe(false);
        expect(slide.hasAttribute('data-after')).toBe(false);
      });
    });

    it('gallery: navigates correctly', async () => {
      fixture = await mount('sg-carousel', { attrs: { autoplay: 'false', variant: 'gallery' }, html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });

    // ── Marquee ────────────────────────────────────────────────────────────────

    it('sets data-variant="marquee" + data-orientation on slides when variant=marquee', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'marquee' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('marquee');
        expect(slide.getAttribute('data-orientation')).toBe('horizontal');
      });
    });

    it('marquee: sets data-orientation="vertical" when orientation=vertical', async () => {
      fixture = await mount('sg-carousel', { attrs: { orientation: 'vertical', variant: 'marquee' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('marquee');
        expect(slide.getAttribute('data-orientation')).toBe('vertical');
      });
    });

    it('marquee: shows controls and indicators by default', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'marquee' }, html: slides });
      await fixture.flush();

      expect(fixture.query('.controls')).toBeTruthy();
      expect(fixture.query('.indicators')).toBeTruthy();
    });

    it('marquee: hides controls when show-controls=false', async () => {
      fixture = await mount('sg-carousel', { attrs: { 'show-controls': 'false', variant: 'marquee' }, html: slides });
      await fixture.flush();

      expect(fixture.query('.controls')).toBeNull();
    });

    it('marquee: loop=false sets animation-iteration-count:1 on track', async () => {
      fixture = await mount('sg-carousel', { attrs: { loop: 'false', variant: 'marquee' }, html: slides });
      await fixture.flush();

      const track = fixture.query<HTMLElement>('.track');

      expect(track?.style.getPropertyValue('animation-iteration-count')).toBe('1');
    });

    it('marquee: loop=true (default) does not set animation-iteration-count on track', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'marquee' }, html: slides });
      await fixture.flush();

      const track = fixture.query<HTMLElement>('.track');

      expect(track?.style.getPropertyValue('animation-iteration-count')).toBe('');
    });

    it('marquee: all slides are aria-hidden=false', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'marquee' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('aria-hidden')).toBe('false');
      });
    });
  });

  // ── Programmatic state reflection ──────────────────────────────────────────

  describe('State reflection', () => {
    it('reflects slide-index attribute on host after navigation', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(fixture.element.getAttribute('slide-index')).toBe('1');
    });

    it('reflects slide-index attribute after indicator click', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      dots(fixture)[2]?.click();
      await fixture.flush();

      expect(fixture.element.getAttribute('slide-index')).toBe('2');
    });

    it('restarts autoplay when autoplay-interval changes', async () => {
      fixture = await mount('sg-carousel', { attrs: { autoplay: 'true', 'autoplay-interval': '5000' }, html: slides });
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');

      (fixture.element as HTMLElement & { 'autoplay-interval': number })['autoplay-interval'] = 100;
      await fixture.flush();

      await vi.waitFor(
        () => {
          expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
        },
        { timeout: 500 },
      );
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles zero slides gracefully', async () => {
      fixture = await mount('sg-carousel', {});
      await fixture.flush();

      expect(activeSlide(fixture)).toBeNull();
    });

    it('handles a single slide (no indicators rendered)', async () => {
      fixture = await mount('sg-carousel', {
        html: '<sg-carousel-slide>Only</sg-carousel-slide>',
      });
      await fixture.flush();

      expect(fixture.query('.indicators')).toBeNull();
      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Only');
    });

    it('clamps navigation at last slide when loop is false', async () => {
      fixture = await mount('sg-carousel', { attrs: { loop: 'false', 'slide-index': '2' }, html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });

    it('does not emit change when navigating to the same slide', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      dots(fixture)[0]?.click();
      await fixture.flush();

      expect(onChange).not.toHaveBeenCalled();
    });

    it('updates active slide when slides are added dynamically', async () => {
      fixture = await mount('sg-carousel', { html: slides });
      await fixture.flush();

      const newSlide = document.createElement('sg-carousel-slide');

      newSlide.textContent = 'Slide 4';
      fixture.element.appendChild(newSlide);
      await fixture.flush();

      expect(getSlides(fixture).length).toBe(4);
    });

    it('does not call goTo when slide-index watcher fires with the current index', async () => {
      fixture = await mount('sg-carousel', { attrs: { 'slide-index': '1' }, html: slides });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      // Write the same value back — should not trigger a navigation.
      (fixture.element as HTMLElement & { 'slide-index': number })['slide-index'] = 1;
      await fixture.flush();

      expect(onChange).not.toHaveBeenCalled();
      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });
  });

  // ── Marquee seek & hover-pause ────────────────────────────────────────────────
  // In jsdom halfSize=0 (no layout), so seekTo takes the instant path.
  // In a real browser it CSS-transitions to the target then hands back to
  // the keyframe animation via a negative animation-delay.

  describe('Marquee seek', () => {
    it('seeks to slide via next button: sets animation-delay (instant path in jsdom)', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'marquee' }, html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      // jsdom has no layout engine — seekTo takes the instant path (halfSize=0)
      // or transitions with no real layout. Either way the animation must not
      // be left permanently paused and navigation state must be updated.
      const t = track(fixture)!;

      // The active slide should have advanced.
      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
      // animation-play-state must not be stuck paused after an instant seek.
      expect(t.style.getPropertyValue('animation-play-state')).toBe('');
    });

    it('seeks to slide via indicator: active slide has data-active', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'marquee' }, html: slides });
      await fixture.flush();

      dots(fixture)[2]?.click();
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all[2]?.hasAttribute('data-active')).toBe(true);
      expect(all[0]?.hasAttribute('data-active')).toBe(false);
    });

    it('emits change event when seeking via controls', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'marquee' }, html: slides });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect((onChange.mock.calls[0][0] as CustomEvent).detail.index).toBe(1);
    });

    it('does not seek when clicking the already-active indicator', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'marquee' }, html: slides });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      dots(fixture)[0]?.click();
      await fixture.flush();

      expect(onChange).not.toHaveBeenCalled();
    });

    it('pauses animation on mouseenter and resumes on mouseleave', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'marquee' }, html: slides });
      await fixture.flush();

      const t = track(fixture)!;

      fixture.element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      await fixture.flush();

      expect(t.style.getPropertyValue('animation-play-state')).toBe('paused');

      fixture.element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
      await fixture.flush();

      expect(t.style.getPropertyValue('animation-play-state')).toBe('');
    });

    it('seek keeps animation paused while hovered, resumes on mouseleave', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'marquee' }, html: slides });
      await fixture.flush();

      const t = track(fixture)!;

      // Hover to pause.
      fixture.element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      await fixture.flush();

      expect(t.style.getPropertyValue('animation-play-state')).toBe('paused');

      // Seek while hovered — animation stays paused.
      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(t.style.getPropertyValue('animation-play-state')).toBe('paused');

      // Move mouse out — animation resumes.
      fixture.element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
      await fixture.flush();

      expect(t.style.getPropertyValue('animation-play-state')).toBe('');
    });

    it('warns in dev when loop="false" is used on marquee variant', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      fixture = await mount('sg-carousel', { attrs: { loop: 'false', variant: 'marquee' }, html: slides });
      await fixture.flush();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sigil]'));
      warnSpy.mockRestore();
    });

    it('cleans up animation-delay when switching away from marquee variant', async () => {
      fixture = await mount('sg-carousel', { attrs: { variant: 'marquee' }, html: slides });
      await fixture.flush();

      // Seek to slide 1 to set animation-delay.
      nextBtn(fixture)?.click();
      await fixture.flush();

      // Switch variant — cleanup should remove the marquee inline styles.
      (fixture.element as HTMLElement & { variant: string }).variant = 'default';
      await fixture.flush();

      const t = track(fixture)!;

      expect(t.style.getPropertyValue('transition')).toBe('');
      expect(t.style.getPropertyValue('transform')).toBe('');
      expect(t.style.getPropertyValue('animation-delay')).toBe('');
      expect(t.style.getPropertyValue('animation-play-state')).toBe('');
      expect(t.style.getPropertyValue('--_marquee-duration')).toBe('');
    });
  });
});
