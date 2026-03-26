import { fire, type Fixture, mount, user } from '@vielzeug/craftit/testing';

describe('bit-rating', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./rating'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a radiogroup container', async () => {
      fixture = await mount('bit-rating');

      expect(fixture.query('[role="radiogroup"]')).toBeTruthy();
    });

    it('renders 5 star buttons by default', async () => {
      fixture = await mount('bit-rating');

      expect(fixture.shadow?.querySelectorAll('[role="radio"]').length).toBe(5);
    });

    it('renders custom number of stars via max prop', async () => {
      fixture = await mount('bit-rating', { attrs: { max: '3' } });

      expect(fixture.shadow?.querySelectorAll('[role="radio"]').length).toBe(3);
    });

    it('each star button has part="star"', async () => {
      fixture = await mount('bit-rating');

      expect(fixture.shadow?.querySelectorAll('[part="star"]').length).toBe(5);
    });

    it('each star has type="button"', async () => {
      fixture = await mount('bit-rating');

      const stars = fixture.shadow?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [];

      for (const star of stars) {
        expect(star.getAttribute('type')).toBe('button');
      }
    });
  });

  // ─── Props ───────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('applies value attribute on host', async () => {
      fixture = await mount('bit-rating', { attrs: { value: '3' } });

      expect(fixture.element.getAttribute('value')).toBe('3');
    });

    it('applies color attribute on host', async () => {
      fixture = await mount('bit-rating', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies size attribute on host', async () => {
      fixture = await mount('bit-rating', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('uses token-driven icon sizing instead of a fixed pixel size', async () => {
      fixture = await mount('bit-rating');

      const firstIcon = fixture.shadow?.querySelector<HTMLElement>('bit-icon[name="star"]');

      expect(firstIcon?.getAttribute('size')).toBe('var(--_star-size)');
    });

    it('reflects disabled attribute', async () => {
      fixture = await mount('bit-rating', { attrs: { disabled: '' } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('reflects readonly attribute', async () => {
      fixture = await mount('bit-rating', { attrs: { readonly: '' } });

      expect(fixture.element.hasAttribute('readonly')).toBe(true);
    });

    it('reflects solid attribute', async () => {
      fixture = await mount('bit-rating', { attrs: { solid: '' } });

      expect(fixture.element.hasAttribute('solid')).toBe(true);
    });
  });

  // ─── Selection ───────────────────────────────────────────────────────────────

  describe('Selection', () => {
    it('clicking a star updates the value attribute', async () => {
      fixture = await mount('bit-rating');

      const star3 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="3"]');

      if (star3) {
        fire.click(star3);
        await fixture.flush();

        expect(fixture.element.getAttribute('value')).toBe('3');
      }
    });

    it('clicking a star does not change value when readonly', async () => {
      fixture = await mount('bit-rating', { attrs: { readonly: '' } });

      const star4 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="4"]');

      if (star4) {
        fire.click(star4);
        await fixture.flush();

        expect(fixture.element.getAttribute('value')).toBe('0');
      }
    });

    it('clicking a star does not change value when disabled', async () => {
      fixture = await mount('bit-rating', { attrs: { disabled: '' } });

      const star2 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="2"]');

      if (star2) {
        fire.click(star2);
        await fixture.flush();

        expect(fixture.element.getAttribute('value')).toBe('0');
      }
    });

    it('clicking a different star updates the selected state', async () => {
      fixture = await mount('bit-rating', { attrs: { value: '2' } });

      const star2 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="2"]');
      const star4 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="4"]');
      const star3 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="3"]');

      expect(star2?.getAttribute('aria-checked')).toBe('true');
      expect(star2?.hasAttribute('data-filled')).toBe(true);
      expect(star3?.hasAttribute('data-filled')).toBe(false);

      if (star4) {
        fire.click(star4);
        await fixture.flush();
      }

      expect(fixture.element.getAttribute('value')).toBe('4');
      expect(star2?.getAttribute('aria-checked')).toBe('false');
      expect(star4?.getAttribute('aria-checked')).toBe('true');
      expect(star3?.hasAttribute('data-filled')).toBe(true);
      expect(star4?.hasAttribute('data-filled')).toBe(true);
    });

    it('keeps selected stars marked filled when solid mode is enabled', async () => {
      fixture = await mount('bit-rating', { attrs: { solid: '', value: '3' } });

      const star1 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="1"]');
      const star3 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="3"]');
      const star4 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="4"]');

      expect(star1?.hasAttribute('data-filled')).toBe(true);
      expect(star3?.hasAttribute('data-filled')).toBe(true);
      expect(star4?.hasAttribute('data-filled')).toBe(false);
    });

    it('updates selection on consecutive star clicks', async () => {
      fixture = await mount('bit-rating', { attrs: { value: '1' } });

      const star2 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="2"]');
      const star5 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="5"]');

      if (star2) {
        fire.click(star2);
        await fixture.flush();
      }

      expect(fixture.element.getAttribute('value')).toBe('2');

      if (star5) {
        fire.click(star5);
        await fixture.flush();
      }

      expect(fixture.element.getAttribute('value')).toBe('5');
      expect(star2?.getAttribute('aria-checked')).toBe('false');
      expect(star5?.getAttribute('aria-checked')).toBe('true');
    });

    it('ArrowRight increases rating from focused star', async () => {
      fixture = await mount('bit-rating', { attrs: { value: '2' } });

      const star2 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="2"]');

      if (!star2) return;

      star2.focus();
      await user.press(star2, 'ArrowRight');
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('3');
    });

    it('Home/End set rating to min/max', async () => {
      fixture = await mount('bit-rating', { attrs: { max: '7', value: '4' } });

      const star4 = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="4"]');

      if (!star4) return;

      star4.focus();
      await user.press(star4, 'Home');
      await fixture.flush();
      expect(fixture.element.getAttribute('value')).toBe('1');

      await user.press(star4, 'End');
      await fixture.flush();
      expect(fixture.element.getAttribute('value')).toBe('7');
    });
  });

  // ─── Events ──────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('fires change event when a star is clicked', async () => {
      fixture = await mount('bit-rating');

      const handler = vi.fn();

      fixture.element.addEventListener('change', handler);

      const star = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="4"]');

      if (star) fire.click(star);

      await fixture.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('change event detail carries the selected star value', async () => {
      fixture = await mount('bit-rating');

      let detail: { originalEvent?: Event; value: number } | undefined;

      fixture.element.addEventListener('change', (e: Event) => {
        detail = (e as CustomEvent).detail;
      });

      const star = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="2"]');

      if (star) fire.click(star);

      await fixture.flush();

      expect(detail?.value).toBe(2);
      expect(detail?.originalEvent).toBeDefined();
    });

    it('does not fire change when readonly', async () => {
      fixture = await mount('bit-rating', { attrs: { readonly: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('change', handler);

      const firstStar = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="1"]');

      if (firstStar) fire.click(firstStar);

      await fixture.flush();

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not fire change when disabled', async () => {
      fixture = await mount('bit-rating', { attrs: { disabled: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('change', handler);

      const star = fixture.shadow?.querySelector<HTMLButtonElement>('[data-star="5"]');

      if (star) fire.click(star);

      await fixture.flush();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('supports star counts other than 5', async () => {
      fixture = await mount('bit-rating', { attrs: { max: '10' } });

      expect(fixture.shadow?.querySelectorAll('[role="radio"]').length).toBe(10);
    });
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('bit-rating accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./rating'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('WAI-ARIA Radiogroup Pattern', () => {
    it('container has role="radiogroup"', async () => {
      fixture = await mount('bit-rating');

      expect(fixture.query('[role="radiogroup"]')).toBeTruthy();
    });

    it('each star has role="radio"', async () => {
      fixture = await mount('bit-rating');

      const stars = fixture.shadow?.querySelectorAll('[role="radio"]') ?? [];

      expect(stars.length).toBe(5);
    });

    it('radiogroup has aria-label', async () => {
      fixture = await mount('bit-rating', { attrs: { label: 'Product rating' } });

      expect(fixture.query('[role="radiogroup"]')?.getAttribute('aria-label')).toBe('Product rating');
    });

    it('default radiogroup label is "Rating"', async () => {
      fixture = await mount('bit-rating');

      expect(fixture.query('[role="radiogroup"]')?.getAttribute('aria-label')).toBe('Rating');
    });
  });

  describe('Star Labels', () => {
    it('each star has a descriptive aria-label', async () => {
      fixture = await mount('bit-rating');

      const stars = fixture.shadow?.querySelectorAll('[role="radio"]') ?? [];

      expect(stars[0]?.getAttribute('aria-label')).toBe('1 star');
      expect(stars[1]?.getAttribute('aria-label')).toBe('2 stars');
      expect(stars[4]?.getAttribute('aria-label')).toBe('5 stars');
    });
  });

  describe('Selected State', () => {
    it('selected star has aria-checked="true"', async () => {
      fixture = await mount('bit-rating', { attrs: { value: '3' } });

      const star3 = fixture.shadow?.querySelector('[data-star="3"]');

      expect(star3?.getAttribute('aria-checked')).toBe('true');
    });

    it('non-selected stars have aria-checked="false"', async () => {
      fixture = await mount('bit-rating', { attrs: { value: '3' } });

      const star1 = fixture.shadow?.querySelector('[data-star="1"]');
      const star5 = fixture.shadow?.querySelector('[data-star="5"]');

      expect(star1?.getAttribute('aria-checked')).toBe('false');
      expect(star5?.getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('Disabled & Readonly', () => {
    it('star buttons are disabled when rating is disabled', async () => {
      fixture = await mount('bit-rating', { attrs: { disabled: '' } });

      const stars = fixture.shadow?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [];

      for (const star of stars) {
        expect(star.disabled).toBe(true);
      }
    });

    it('star buttons are disabled when rating is readonly', async () => {
      fixture = await mount('bit-rating', { attrs: { readonly: '' } });

      const stars = fixture.shadow?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [];

      for (const star of stars) {
        expect(star.disabled).toBe(true);
      }
    });
  });
});
