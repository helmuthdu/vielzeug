import { fireKeyDown } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

function pressStar(fixture: Fixture<HTMLElement>, star: number): void {
  const starEl = fixture.shadow?.querySelector<HTMLElement>(`[data-star="${star}"]`);

  if (starEl) starEl.dispatchEvent(new Event('pointerdown', { bubbles: true }));
}

describe('ore-rating', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./rating'))();
  });

  afterEach(() => {
    fixture?.dispose();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a single slider (one focus stop) for the star row', async () => {
      fixture = await mount('ore-rating');

      const slider = fixture.query('[role="slider"]');

      expect(slider).toBeTruthy();
      expect(slider?.getAttribute('tabindex')).toBe('0');
      expect(fixture.shadow?.querySelectorAll('[role="radio"], button').length).toBe(0);
    });

    it('renders 5 stars by default', async () => {
      fixture = await mount('ore-rating');

      expect(fixture.shadow?.querySelectorAll('[data-star]').length).toBe(5);
    });

    it('renders custom number of stars via max', async () => {
      fixture = await mount('ore-rating', { attrs: { max: '3' } });

      expect(fixture.shadow?.querySelectorAll('[data-star]').length).toBe(3);
    });

    it('each star has part="star" with a fill layer', async () => {
      fixture = await mount('ore-rating');

      expect(fixture.shadow?.querySelectorAll('[part="star"]').length).toBe(5);
      expect(fixture.shadow?.querySelectorAll('[part="star"] .star-fill').length).toBe(5);
    });

    it('uses token-driven icon sizing instead of a fixed pixel size', async () => {
      fixture = await mount('ore-rating');

      const firstIcon = fixture.shadow?.querySelector<HTMLElement>('ore-icon.base-icon');

      expect(firstIcon?.getAttribute('size')).toBe('var(--_star-size)');
    });
  });

  // ─── Label & ARIA value ──────────────────────────────────────────────────────

  describe('Label & ARIA value', () => {
    it('falls back to an aria-label "Rating" when no visible label is set', async () => {
      fixture = await mount('ore-rating');

      const slider = fixture.query('[role="slider"]');

      expect(slider?.getAttribute('aria-label')).toBe('Rating');
      expect(slider?.hasAttribute('aria-labelledby')).toBe(false);
      expect(fixture.query('.label')?.hasAttribute('hidden')).toBe(true);
    });

    it('renders a visible label and names the slider via aria-labelledby', async () => {
      fixture = await mount('ore-rating', { attrs: { label: 'Product rating' } });

      const slider = fixture.query('[role="slider"]');
      const label = fixture.query<HTMLElement>('.label');

      expect(label?.hidden).toBe(false);
      expect(label?.textContent).toContain('Product rating');
      expect(slider?.getAttribute('aria-labelledby')).toBe(label?.id);
      expect(slider?.getAttribute('aria-label')).toBeNull();
    });

    it('exposes value bounds on the slider', async () => {
      fixture = await mount('ore-rating', { attrs: { max: '10', value: '4' } });

      const slider = fixture.query('[role="slider"]');

      expect(slider?.getAttribute('aria-valuemin')).toBe('0');
      expect(slider?.getAttribute('aria-valuemax')).toBe('10');
      expect(slider?.getAttribute('aria-valuenow')).toBe('4');
    });

    it('announces the value and unrated state via aria-valuetext', async () => {
      fixture = await mount('ore-rating', { attrs: { value: '3' } });

      expect(fixture.query('[role="slider"]')?.getAttribute('aria-valuetext')).toBe('3 out of 5 stars');

      fixture.element.setAttribute('value', '0');
      await fixture.flush();

      expect(fixture.query('[role="slider"]')?.getAttribute('aria-valuetext')).toBe('Not rated');
    });

    it('applies localized labels via the labels property', async () => {
      fixture = await mount('ore-rating', {
        attrs: { precision: '0.5', value: '4.5' },
        props: { labels: { value: (v: number, max: number) => `${v} von ${max} Sternen` } },
      });

      expect(fixture.query('[role="slider"]')?.getAttribute('aria-valuetext')).toBe('4.5 von 5 Sternen');
    });
  });

  // ─── Selection ───────────────────────────────────────────────────────────────

  describe('Selection', () => {
    it('pressing a star updates the value attribute', async () => {
      fixture = await mount('ore-rating');

      pressStar(fixture, 3);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('3');
    });

    it('pressing the selected star clears back to 0', async () => {
      fixture = await mount('ore-rating', { attrs: { value: '3' } });

      pressStar(fixture, 3);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('0');
    });

    it('clearable="false" keeps re-press a no-op', async () => {
      fixture = await mount('ore-rating', { attrs: { clearable: 'false', value: '3' } });

      const handler = vi.fn();

      fixture.element.addEventListener('change', handler);
      pressStar(fixture, 3);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('3');
      expect(handler).not.toHaveBeenCalled();
    });

    it('readonly blocks selection and removes the tab stop', async () => {
      fixture = await mount('ore-rating', { attrs: { readonly: '', value: '2' } });

      const slider = fixture.query('[role="slider"]');

      expect(slider?.hasAttribute('tabindex')).toBe(false);
      expect(slider?.getAttribute('aria-readonly')).toBe('true');

      pressStar(fixture, 4);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('2');
    });

    it('disabled blocks selection and marks aria-disabled', async () => {
      fixture = await mount('ore-rating', { attrs: { disabled: '', value: '2' } });

      const slider = fixture.query('[role="slider"]');

      expect(slider?.hasAttribute('tabindex')).toBe(false);
      expect(slider?.getAttribute('aria-disabled')).toBe('true');

      pressStar(fixture, 5);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('2');
    });

    it('fills stars up to the value (fractional widths included)', async () => {
      fixture = await mount('ore-rating', { attrs: { precision: '0.5', value: '2.5' } });

      const widths = [...(fixture.shadow?.querySelectorAll<HTMLElement>('.star-fill') ?? [])].map(
        (el) => el.style.width,
      );

      expect(widths).toEqual(['100%', '100%', '50%', '0%', '0%']);
    });

    it('snaps external values onto the precision grid', async () => {
      fixture = await mount('ore-rating', { attrs: { value: '4.3' } });

      expect(fixture.query('[role="slider"]')?.getAttribute('aria-valuenow')).toBe('4');

      fixture.element.setAttribute('precision', '0.5');
      fixture.element.setAttribute('value', '4.3');
      await fixture.flush();

      expect(fixture.query('[role="slider"]')?.getAttribute('aria-valuenow')).toBe('4.5');
    });
  });

  // ─── Keyboard ────────────────────────────────────────────────────────────────

  describe('Keyboard', () => {
    it('ArrowRight/ArrowLeft adjust by one step', async () => {
      fixture = await mount('ore-rating', { attrs: { value: '2' } });

      const slider = fixture.query<HTMLElement>('[role="slider"]');

      if (!slider) return;

      fireKeyDown(slider, { key: 'ArrowRight' });
      await fixture.flush();
      expect(fixture.element.getAttribute('value')).toBe('3');

      fireKeyDown(slider, { key: 'ArrowLeft' });
      await fixture.flush();
      expect(fixture.element.getAttribute('value')).toBe('2');
    });

    it('arrows step by precision', async () => {
      fixture = await mount('ore-rating', { attrs: { precision: '0.5', value: '2' } });

      const slider = fixture.query<HTMLElement>('[role="slider"]');

      if (!slider) return;

      fireKeyDown(slider, { key: 'ArrowUp' });
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('2.5');
    });

    it('decrementing below one star unrates to 0', async () => {
      fixture = await mount('ore-rating', { attrs: { value: '1' } });

      const slider = fixture.query<HTMLElement>('[role="slider"]');

      if (!slider) return;

      fireKeyDown(slider, { key: 'ArrowLeft' });
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('0');
    });

    it('Home/End set rating to min/max', async () => {
      fixture = await mount('ore-rating', { attrs: { max: '7', value: '4' } });

      const slider = fixture.query<HTMLElement>('[role="slider"]');

      if (!slider) return;

      fireKeyDown(slider, { key: 'Home' });
      await fixture.flush();
      expect(fixture.element.getAttribute('value')).toBe('0');

      fireKeyDown(slider, { key: 'End' });
      await fixture.flush();
      expect(fixture.element.getAttribute('value')).toBe('7');
    });

    it('ignores keys when readonly', async () => {
      fixture = await mount('ore-rating', { attrs: { readonly: '', value: '2' } });

      const slider = fixture.query<HTMLElement>('[role="slider"]');

      if (!slider) return;

      fireKeyDown(slider, { key: 'ArrowRight' });
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('2');
    });
  });

  // ─── Events ──────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('fires input and change when the rating changes', async () => {
      fixture = await mount('ore-rating');

      const input = vi.fn();
      const change = vi.fn();

      fixture.element.addEventListener('input', input);
      fixture.element.addEventListener('change', change);

      pressStar(fixture, 4);
      await fixture.flush();

      expect(input).toHaveBeenCalled();
      expect(change).toHaveBeenCalled();
    });

    it('does not fire events when readonly', async () => {
      fixture = await mount('ore-rating', { attrs: { readonly: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('change', handler);
      pressStar(fixture, 1);
      await fixture.flush();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ─── Required ────────────────────────────────────────────────────────────────

  describe('Required', () => {
    it('marks the slider aria-required', async () => {
      fixture = await mount('ore-rating', { attrs: { required: '' } });

      expect(fixture.query('[role="slider"]')?.getAttribute('aria-required')).toBe('true');
    });

    it('omits aria-required when disabled', async () => {
      fixture = await mount('ore-rating', { attrs: { disabled: '', required: '' } });

      expect(fixture.query('[role="slider"]')?.hasAttribute('aria-required')).toBe(false);
    });
  });

  // ─── Helper / Error Text ─────────────────────────────────────────────────────

  describe('Helper / Error Text', () => {
    it('renders helper text and describes the slider with it', async () => {
      fixture = await mount('ore-rating', { attrs: { helper: 'Rate your experience' } });

      const helper = fixture.query('[part="helper"]');

      expect(helper?.hasAttribute('hidden')).toBe(false);
      expect(helper?.textContent?.trim()).toBe('Rate your experience');
      expect(fixture.query('[role="slider"]')?.getAttribute('aria-describedby')).toBe(helper?.id);
    });

    it('renders error text with role="alert" and invalidates the slider', async () => {
      fixture = await mount('ore-rating', { attrs: { error: 'A rating is required' } });

      const error = fixture.query('[part="error"]');
      const slider = fixture.query('[role="slider"]');

      expect(error?.getAttribute('role')).toBe('alert');
      expect(error?.textContent?.trim()).toBe('A rating is required');
      expect(slider?.getAttribute('aria-invalid')).toBe('true');
      expect(slider?.getAttribute('aria-errormessage')).toBe(error?.id);
      expect(slider?.getAttribute('aria-describedby')).toBe(error?.id);
    });

    it('error hides the helper text', async () => {
      fixture = await mount('ore-rating', { attrs: { error: 'Required', helper: 'Pick 1-5' } });

      expect(fixture.query('[part="helper"]')?.hasAttribute('hidden')).toBe(true);
      expect(fixture.query('[part="error"]')?.hasAttribute('hidden')).toBe(false);
    });

    it('has no description when neither helper nor error is set', async () => {
      fixture = await mount('ore-rating');

      expect(fixture.query('[role="slider"]')?.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-rating', { attrs: { label: 'Product rating', value: '3' } });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
