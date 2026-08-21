import { type Fixture, mount } from '@vielzeug/ore/testing';

const getSlides = (f: Fixture<HTMLElement>): HTMLElement[] =>
  Array.from(f.element.querySelectorAll<HTMLElement>('ore-carousel-slide'));

const activeSlide = (f: Fixture<HTMLElement>): HTMLElement | null =>
  f.element.querySelector<HTMLElement>('ore-carousel-slide[data-active]');

const dots = (f: Fixture<HTMLElement>): HTMLElement[] => f.queryAll<HTMLElement>('.indicator');

const prevBtn = (f: Fixture<HTMLElement>): HTMLElement | null => f.query<HTMLElement>('.prev-btn');

const nextBtn = (f: Fixture<HTMLElement>): HTMLElement | null => f.query<HTMLElement>('.next-btn');

const SLIDES_HTML = `
  <ore-carousel-slide>Slide 1</ore-carousel-slide>
  <ore-carousel-slide>Slide 2</ore-carousel-slide>
  <ore-carousel-slide>Slide 3</ore-carousel-slide>
`;

describe('ore-carousel', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../../feedback/progress/progress');
    await import('./carousel');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  const slides = SLIDES_HTML;

  // ── Core Functionality ───────────────────────────────────────────────────────

  describe('Core functionality', () => {
    it('renders with minimal props and activates first slide', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all.length).toBe(3);
      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('renders track, controls, and indicators', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      expect(fixture.query('.track')).toBeTruthy();
      expect(fixture.query('.controls')).toBeTruthy();
      expect(fixture.query('.indicators')).toBeTruthy();
    });

    it('has autoplay disabled by default', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      expect((fixture.element as HTMLElement & { autoplay: boolean }).autoplay).toBe(false);
    });

    it('hides controls when show-controls is false', async () => {
      fixture = await mount('ore-carousel', { attrs: { 'show-controls': 'false' }, html: slides });
      await fixture.flush();

      expect(fixture.query('.controls')).toBeNull();
    });

    it('hides indicators when show-indicators is false', async () => {
      fixture = await mount('ore-carousel', { attrs: { 'show-indicators': 'false' }, html: slides });
      await fixture.flush();

      expect(fixture.query('.indicators')).toBeNull();
    });

    it('advances to next slide on next button click', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });

    it('goes to previous slide on prev button click', async () => {
      fixture = await mount('ore-carousel', { attrs: { 'slide-index': '1' }, html: slides });
      await fixture.flush();

      prevBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('emits change event when slide changes', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect((onChange.mock.calls[0][0] as CustomEvent).detail.index).toBe(1);
    });

    it('jumps to slide via indicator dot click', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      dots(fixture)[2]?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });

    it('syncs when slide-index prop changes', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      (fixture.element as HTMLElement & { 'slide-index': number })['slide-index'] = 2;
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });

    it('renders correct number of indicator dots', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      expect(dots(fixture).length).toBe(3);
    });

    it('marks active dot with dot-active class', async () => {
      fixture = await mount('ore-carousel', { attrs: { 'slide-index': '1' }, html: slides });
      await fixture.flush();

      expect(dots(fixture)[1]?.classList.contains('indicator-active')).toBe(true);
      expect(dots(fixture)[0]?.classList.contains('indicator-active')).toBe(false);
    });
  });

  // ── Loop behavior ────────────────────────────────────────────────────────────

  describe('Loop behavior', () => {
    it('loops from last to first when loop is true', async () => {
      fixture = await mount('ore-carousel', { attrs: { 'slide-index': '2' }, html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('loops from first to last when loop is true', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      prevBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });

    it('disables next button at last slide when loop is false', async () => {
      fixture = await mount('ore-carousel', {
        attrs: { loop: 'false', 'slide-index': '2' },
        html: slides,
      });
      await fixture.flush();

      expect(nextBtn(fixture)?.hasAttribute('disabled')).toBe(true);
    });

    it('disables prev button at first slide when loop is false', async () => {
      fixture = await mount('ore-carousel', { attrs: { loop: 'false' }, html: slides });
      await fixture.flush();

      expect(prevBtn(fixture)?.hasAttribute('disabled')).toBe(true);
    });

    it('does not advance past last slide when loop is false', async () => {
      fixture = await mount('ore-carousel', {
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

  describe('Pointer navigation', () => {
    it('changes slide only after a qualifying pan is released', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      const pointer = {
        bubbles: true,
        composed: true,
        isPrimary: true,
        pointerId: 1,
        pointerType: 'touch',
      } as const;

      fixture.element.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 100 }));
      fixture.element.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: 40 }));

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');

      fixture.element.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: 40 }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });
  });

  // ── Accessibility ────────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('sets role="region" on host', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      expect(fixture.element.getAttribute('role')).toBe('region');
    });

    it('sets aria-roledescription="carousel" on host', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      expect(fixture.element.getAttribute('aria-roledescription')).toBe('carousel');
    });

    it('sets aria-label on host from label prop', async () => {
      fixture = await mount('ore-carousel', { attrs: { label: 'Hero banners' }, html: slides });
      await fixture.flush();

      expect(fixture.element.getAttribute('aria-label')).toBe('Hero banners');
    });

    it('sets role="group" and aria-roledescription="slide" on each slide', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      const all = getSlides(fixture);

      all.forEach((slide) => {
        expect(slide.getAttribute('role')).toBe('group');
        expect(slide.getAttribute('aria-roledescription')).toBe('slide');
      });
    });

    it('sets aria-hidden="true" on inactive slides', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all[0]?.getAttribute('aria-hidden')).toBe('false');
      expect(all[1]?.getAttribute('aria-hidden')).toBe('true');
      expect(all[2]?.getAttribute('aria-hidden')).toBe('true');
    });

    it('sets aria-live="polite" on track by default (autoplay off)', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      expect(fixture.query('.track')?.getAttribute('aria-live')).toBe('polite');
    });

    it('sets aria-live="off" on track when autoplay is on', async () => {
      fixture = await mount('ore-carousel', { attrs: { autoplay: 'true' }, html: slides });
      await fixture.flush();

      expect(fixture.query('.track')?.getAttribute('aria-live')).toBe('off');
    });

    it('labels prev/next buttons accessibly', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      expect(prevBtn(fixture)?.getAttribute('aria-label')).toBe('Previous slide');
      expect(nextBtn(fixture)?.getAttribute('aria-label')).toBe('Next slide');
    });

    it('sets role="tablist" and aria-label on indicators container', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      const ind = fixture.query('.indicators');

      expect(ind?.getAttribute('role')).toBe('tablist');
      expect(ind?.getAttribute('aria-label')).toBe('Slide indicators');
    });

    it('sets role="tab" and aria-selected on indicator dots', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      const d = dots(fixture);

      expect(d[0]?.getAttribute('role')).toBe('tab');
      expect(d[0]?.getAttribute('aria-selected')).toBe('true');
      expect(d[1]?.getAttribute('aria-selected')).toBe('false');
    });

    it('indicator dots are real buttons with roving tabindex (only the active one is tabbable)', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      const d = dots(fixture);

      expect(d[0]?.tagName).toBe('BUTTON');
      expect(d[0]?.getAttribute('tabindex')).toBe('0');
      expect(d[1]?.getAttribute('tabindex')).toBe('-1');
    });

    it('the nested ore-progress visual is decorative, not a duplicate progressbar role', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      const progress = dots(fixture)[0]?.querySelector('ore-progress');

      expect(progress?.getAttribute('aria-hidden')).toBe('true');
    });

    it('activating a dot with Enter/Space navigates to that slide (native button semantics)', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      dots(fixture)[1]?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });

    it('ArrowRight on a focused indicator dot moves selection to the next dot', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      dots(fixture)[0]?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');

      const updated = dots(fixture);

      expect(updated[1]?.getAttribute('tabindex')).toBe('0');
      expect(updated[0]?.getAttribute('tabindex')).toBe('-1');
    });

    it('navigates with ArrowRight / ArrowLeft keyboard keys', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('jumps to first/last slide with Home/End keys', async () => {
      fixture = await mount('ore-carousel', { attrs: { 'slide-index': '1' }, html: slides });
      await fixture.flush();

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('uses ArrowUp/ArrowDown for vertical orientation', async () => {
      fixture = await mount('ore-carousel', { attrs: { orientation: 'vertical' }, html: slides });
      await fixture.flush();

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });
  });

  // ── Variants ─────────────────────────────────────────────────────────────────

  describe('Variants', () => {
    it('sets data-variant="default" on slides by default', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('default');
      });
    });

    it('sets data-variant="fade" on slides when variant=fade', async () => {
      fixture = await mount('ore-carousel', { attrs: { variant: 'fade' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('fade');
      });
    });

    it('sets data-variant="filmstrip" on slides when variant=filmstrip (horizontal)', async () => {
      fixture = await mount('ore-carousel', { attrs: { variant: 'filmstrip' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('filmstrip');
        expect(slide.getAttribute('data-orientation')).toBe('horizontal');
      });
    });

    it('sets data-variant="filmstrip" + data-orientation="vertical" when variant=filmstrip + orientation=vertical', async () => {
      fixture = await mount('ore-carousel', {
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
      fixture = await mount('ore-carousel', { attrs: { variant: 'filmstrip' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.hasAttribute('data-before')).toBe(false);
        expect(slide.hasAttribute('data-after')).toBe(false);
      });
    });

    it('sets data-before/data-after on non-filmstrip variants', async () => {
      fixture = await mount('ore-carousel', { attrs: { 'slide-index': '1', variant: 'fade' }, html: slides });
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all[0]?.hasAttribute('data-before')).toBe(true);
      expect(all[1]?.hasAttribute('data-active')).toBe(true);
      expect(all[2]?.hasAttribute('data-after')).toBe(true);
    });

    it('navigates correctly in fade variant', async () => {
      fixture = await mount('ore-carousel', { attrs: { autoplay: 'false', variant: 'fade' }, html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });

    it('updates data-variant on all slides when variant prop changes', async () => {
      fixture = await mount('ore-carousel', { attrs: { variant: 'default' }, html: slides });
      await fixture.flush();

      (fixture.element as HTMLElement & { variant: string }).variant = 'fade';
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('fade');
      });
    });

    it('updates data-orientation on all slides when orientation prop changes', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      (fixture.element as HTMLElement & { orientation: string }).orientation = 'vertical';
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-orientation')).toBe('vertical');
      });
    });

    // ── Gallery ────────────────────────────────────────────────────────────────

    it('sets data-variant="gallery" + data-orientation on slides when variant=gallery', async () => {
      fixture = await mount('ore-carousel', { attrs: { variant: 'gallery' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('gallery');
        expect(slide.getAttribute('data-orientation')).toBe('horizontal');
      });
    });

    it('sets data-orientation="vertical" on slides when orientation=vertical', async () => {
      fixture = await mount('ore-carousel', { attrs: { orientation: 'vertical', variant: 'gallery' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.getAttribute('data-variant')).toBe('gallery');
        expect(slide.getAttribute('data-orientation')).toBe('vertical');
      });
    });

    it('gallery: at index 1, slides 0+1+2 visible, slide 3 hidden', async () => {
      const fourSlides = `
        <ore-carousel-slide>S1</ore-carousel-slide>
        <ore-carousel-slide>S2</ore-carousel-slide>
        <ore-carousel-slide>S3</ore-carousel-slide>
        <ore-carousel-slide>S4</ore-carousel-slide>
      `;

      fixture = await mount('ore-carousel', { attrs: { 'slide-index': '1', variant: 'gallery' }, html: fourSlides });
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
        <ore-carousel-slide>S1</ore-carousel-slide>
        <ore-carousel-slide>S2</ore-carousel-slide>
        <ore-carousel-slide>S3</ore-carousel-slide>
        <ore-carousel-slide>S4</ore-carousel-slide>
      `;

      fixture = await mount('ore-carousel', { attrs: { 'slide-index': '0', variant: 'gallery' }, html: fourSlides });
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
        <ore-carousel-slide>S1</ore-carousel-slide>
        <ore-carousel-slide>S2</ore-carousel-slide>
        <ore-carousel-slide>S3</ore-carousel-slide>
        <ore-carousel-slide>S4</ore-carousel-slide>
      `;

      fixture = await mount('ore-carousel', { attrs: { 'slide-index': '3', variant: 'gallery' }, html: fourSlides });
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all[0]?.hasAttribute('data-gallery-visible')).toBe(false);
      expect(all[1]?.hasAttribute('data-gallery-visible')).toBe(false);
      expect(all[2]?.hasAttribute('data-gallery-visible')).toBe(true);
      expect(all[3]?.hasAttribute('data-active')).toBe(true);
      expect(all[3]?.hasAttribute('data-gallery-visible')).toBe(true);
    });

    it('gallery: does not set data-before/data-after', async () => {
      fixture = await mount('ore-carousel', { attrs: { variant: 'gallery' }, html: slides });
      await fixture.flush();

      getSlides(fixture).forEach((slide) => {
        expect(slide.hasAttribute('data-before')).toBe(false);
        expect(slide.hasAttribute('data-after')).toBe(false);
      });
    });

    it('gallery: navigates correctly', async () => {
      fixture = await mount('ore-carousel', { attrs: { autoplay: 'false', variant: 'gallery' }, html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });
  });

  // ── Programmatic state reflection ──────────────────────────────────────────

  describe('State reflection', () => {
    it('reflects slide-index attribute on host after navigation', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(fixture.element.getAttribute('slide-index')).toBe('1');
    });

    it('reflects slide-index attribute after indicator click', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      dots(fixture)[2]?.click();
      await fixture.flush();

      expect(fixture.element.getAttribute('slide-index')).toBe('2');
    });

    it('restarts autoplay when autoplay-interval changes', async () => {
      fixture = await mount('ore-carousel', { attrs: { autoplay: 'true', 'autoplay-interval': '5000' }, html: slides });
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
      fixture = await mount('ore-carousel', {});
      await fixture.flush();

      expect(activeSlide(fixture)).toBeNull();
    });

    it('handles a single slide (no indicators rendered)', async () => {
      fixture = await mount('ore-carousel', {
        html: '<ore-carousel-slide>Only</ore-carousel-slide>',
      });
      await fixture.flush();

      expect(fixture.query('.indicators')).toBeNull();
      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Only');
    });

    it('clamps navigation at last slide when loop is false', async () => {
      fixture = await mount('ore-carousel', { attrs: { loop: 'false', 'slide-index': '2' }, html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });

    it('does not emit change when navigating to the same slide', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      dots(fixture)[0]?.click();
      await fixture.flush();

      expect(onChange).not.toHaveBeenCalled();
    });

    it('updates active slide when slides are added dynamically', async () => {
      fixture = await mount('ore-carousel', { html: slides });
      await fixture.flush();

      const newSlide = document.createElement('ore-carousel-slide');

      newSlide.textContent = 'Slide 4';
      fixture.element.appendChild(newSlide);
      await fixture.flush();

      expect(getSlides(fixture).length).toBe(4);
    });

    it('does not call goTo when slide-index watcher fires with the current index', async () => {
      fixture = await mount('ore-carousel', { attrs: { 'slide-index': '1' }, html: slides });
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

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-carousel', {
        attrs: { 'aria-label': 'Featured items' },
        html: '<div>Slide 1</div><div>Slide 2</div>',
      });

      const results = await axeCheck(fixture.element, {
        rules: { 'aria-prohibited-attr': { enabled: false } },
      });

      expect(results.violations).toHaveLength(0);
    });
  });
});
