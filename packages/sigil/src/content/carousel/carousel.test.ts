import { type Fixture, mount } from '@vielzeug/craft/testing';

describe('bit-carousel', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../../feedback/progress/progress');
    await import('./carousel');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const slides = `
    <bit-carousel-slide>Slide 1</bit-carousel-slide>
    <bit-carousel-slide>Slide 2</bit-carousel-slide>
    <bit-carousel-slide>Slide 3</bit-carousel-slide>
  `;

  const getSlides = (f: Fixture<HTMLElement>) =>
    Array.from(f.element.querySelectorAll<HTMLElement>('bit-carousel-slide'));

  const activeSlide = (f: Fixture<HTMLElement>) =>
    f.element.querySelector<HTMLElement>('bit-carousel-slide[data-active]');

  const dots = (f: Fixture<HTMLElement>) =>
    f.queryAll<HTMLElement>('.indicator');

  const prevBtn = (f: Fixture<HTMLElement>) =>
    f.query<HTMLElement>('.prev-btn');

  const nextBtn = (f: Fixture<HTMLElement>) =>
    f.query<HTMLElement>('.next-btn');

  // ── Core Functionality ───────────────────────────────────────────────────────

  describe('Core functionality', () => {
    it('renders with minimal props and activates first slide', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all.length).toBe(3);
      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('renders track, controls, and indicators', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      expect(fixture.query('.track')).toBeTruthy();
      expect(fixture.query('.controls')).toBeTruthy();
      expect(fixture.query('.indicators')).toBeTruthy();
    });

    it('hides controls when show-controls is false', async () => {
      fixture = await mount('bit-carousel', { attrs: { 'show-controls': 'false' }, html: slides });
      await fixture.flush();

      expect(fixture.query('.controls')).toBeNull();
    });

    it('hides indicators when show-indicators is false', async () => {
      fixture = await mount('bit-carousel', { attrs: { 'show-indicators': 'false' }, html: slides });
      await fixture.flush();

      expect(fixture.query('.indicators')).toBeNull();
    });

    it('advances to next slide on next button click', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });

    it('goes to previous slide on prev button click', async () => {
      fixture = await mount('bit-carousel', { attrs: { 'slide-index': '1' }, html: slides });
      await fixture.flush();

      prevBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('emits change event when slide changes', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect((onChange.mock.calls[0][0] as CustomEvent).detail.index).toBe(1);
    });

    it('jumps to slide via indicator dot click', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      dots(fixture)[2]?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });

    it('syncs when slide-index prop changes', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      (fixture.element as HTMLElement & { 'slide-index': number })['slide-index'] = 2;
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });

    it('renders correct number of indicator dots', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      expect(dots(fixture).length).toBe(3);
    });

    it('marks active dot with dot-active class', async () => {
      fixture = await mount('bit-carousel', { attrs: { 'slide-index': '1' }, html: slides });
      await fixture.flush();

      expect(dots(fixture)[1]?.classList.contains('indicator-active')).toBe(true);
      expect(dots(fixture)[0]?.classList.contains('indicator-active')).toBe(false);
    });
  });

  // ── Loop behavior ────────────────────────────────────────────────────────────

  describe('Loop behavior', () => {
    it('loops from last to first when loop is true', async () => {
      fixture = await mount('bit-carousel', { attrs: { 'slide-index': '2' }, html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('loops from first to last when loop is true', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      prevBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });

    it('disables next button at last slide when loop is false', async () => {
      fixture = await mount('bit-carousel', {
        attrs: { 'loop': 'false', 'slide-index': '2' },
        html: slides,
      });
      await fixture.flush();

      expect(nextBtn(fixture)?.hasAttribute('disabled')).toBe(true);
    });

    it('disables prev button at first slide when loop is false', async () => {
      fixture = await mount('bit-carousel', { attrs: { loop: 'false' }, html: slides });
      await fixture.flush();

      expect(prevBtn(fixture)?.hasAttribute('disabled')).toBe(true);
    });

    it('does not advance past last slide when loop is false', async () => {
      fixture = await mount('bit-carousel', {
        attrs: { 'loop': 'false', 'slide-index': '2' },
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
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      expect(fixture.element.getAttribute('role')).toBe('region');
    });

    it('sets aria-roledescription="carousel" on host', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      expect(fixture.element.getAttribute('aria-roledescription')).toBe('carousel');
    });

    it('sets aria-label on host from label prop', async () => {
      fixture = await mount('bit-carousel', { attrs: { label: 'Hero banners' }, html: slides });
      await fixture.flush();

      expect(fixture.element.getAttribute('aria-label')).toBe('Hero banners');
    });

    it('sets role="group" and aria-roledescription="slide" on each slide', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      const all = getSlides(fixture);

      all.forEach((slide) => {
        expect(slide.getAttribute('role')).toBe('group');
        expect(slide.getAttribute('aria-roledescription')).toBe('slide');
      });
    });

    it('sets aria-hidden="true" on inactive slides', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      const all = getSlides(fixture);

      expect(all[0]?.getAttribute('aria-hidden')).toBe('false');
      expect(all[1]?.getAttribute('aria-hidden')).toBe('true');
      expect(all[2]?.getAttribute('aria-hidden')).toBe('true');
    });

    it('sets aria-live="polite" on track when autoplay is off', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      expect(fixture.query('.track')?.getAttribute('aria-live')).toBe('polite');
    });

    it('sets aria-live="off" on track when autoplay is on', async () => {
      fixture = await mount('bit-carousel', { attrs: { autoplay: '' }, html: slides });
      await fixture.flush();

      expect(fixture.query('.track')?.getAttribute('aria-live')).toBe('off');
    });

    it('labels prev/next buttons accessibly', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      expect(prevBtn(fixture)?.getAttribute('aria-label')).toBe('Previous slide');
      expect(nextBtn(fixture)?.getAttribute('aria-label')).toBe('Next slide');
    });

    it('sets role="tablist" and aria-label on indicators container', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      const ind = fixture.query('.indicators');

      expect(ind?.getAttribute('role')).toBe('tablist');
      expect(ind?.getAttribute('aria-label')).toBe('Slide indicators');
    });

    it('sets role="tab" and aria-selected on indicator dots', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      const d = dots(fixture);

      expect(d[0]?.getAttribute('role')).toBe('tab');
      expect(d[0]?.getAttribute('aria-selected')).toBe('true');
      expect(d[1]?.getAttribute('aria-selected')).toBe('false');
    });

    it('navigates with ArrowRight / ArrowLeft keyboard keys', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('jumps to first/last slide with Home/End keys', async () => {
      fixture = await mount('bit-carousel', { attrs: { 'slide-index': '1' }, html: slides });
      await fixture.flush();

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 1');
    });

    it('uses ArrowUp/ArrowDown for vertical orientation', async () => {
      fixture = await mount('bit-carousel', { attrs: { orientation: 'vertical' }, html: slides });
      await fixture.flush();

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 2');
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles zero slides gracefully', async () => {
      fixture = await mount('bit-carousel', {});
      await fixture.flush();

      expect(activeSlide(fixture)).toBeNull();
    });

    it('handles a single slide (no indicators rendered)', async () => {
      fixture = await mount('bit-carousel', {
        html: '<bit-carousel-slide>Only</bit-carousel-slide>',
      });
      await fixture.flush();

      expect(fixture.query('.indicators')).toBeNull();
      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Only');
    });

    it('clamps navigation at last slide when loop is false', async () => {
      fixture = await mount('bit-carousel', { attrs: { 'loop': 'false', 'slide-index': '2' }, html: slides });
      await fixture.flush();

      nextBtn(fixture)?.click();
      await fixture.flush();

      expect(activeSlide(fixture)?.textContent?.trim()).toBe('Slide 3');
    });

    it('does not emit change when navigating to the same slide', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      dots(fixture)[0]?.click();
      await fixture.flush();

      expect(onChange).not.toHaveBeenCalled();
    });

    it('updates active slide when slides are added dynamically', async () => {
      fixture = await mount('bit-carousel', { html: slides });
      await fixture.flush();

      const newSlide = document.createElement('bit-carousel-slide');

      newSlide.textContent = 'Slide 4';
      fixture.element.appendChild(newSlide);
      await fixture.flush();

      expect(getSlides(fixture).length).toBe(4);
    });
  });
});
