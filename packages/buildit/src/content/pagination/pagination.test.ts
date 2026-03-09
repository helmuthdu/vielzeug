import { type Fixture, fire, mount } from '@vielzeug/craftit/test';

describe('bit-pagination', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./pagination');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a nav element', async () => {
      fixture = await mount('bit-pagination', { attrs: { 'total-pages': '5' } });

      expect(fixture.query('nav')).toBeTruthy();
    });

    it('renders an ordered list for pages', async () => {
      fixture = await mount('bit-pagination', { attrs: { 'total-pages': '5' } });

      expect(fixture.query('ol.pagination')).toBeTruthy();
    });

    it('renders page buttons for each page', async () => {
      fixture = await mount('bit-pagination', { attrs: { 'total-pages': '5' } });

      const pageBtns = fixture.shadow?.querySelectorAll('[part="page-btn"]');
      expect(pageBtns?.length).toBeGreaterThanOrEqual(1);
    });

    it('renders prev/next buttons when show-prev-next is set', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '3', 'show-prev-next': 'true', 'total-pages': '5' } });

      expect(fixture.query('[aria-label="Previous page"]')).toBeTruthy();
      expect(fixture.query('[aria-label="Next page"]')).toBeTruthy();
    });

    it('renders first/last buttons when show-first-last is set', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '3', 'show-first-last': 'true', 'total-pages': '5' } });

      expect(fixture.query('[aria-label="First page"]')).toBeTruthy();
      expect(fixture.query('[aria-label="Last page"]')).toBeTruthy();
    });

    it('hides first/last buttons when show-first-last is false', async () => {
      fixture = await mount('bit-pagination', {
        attrs: { page: '3', 'show-first-last': 'false', 'total-pages': '5' },
      });

      expect(fixture.query('[aria-label="First page"]')).toBeFalsy();
      expect(fixture.query('[aria-label="Last page"]')).toBeFalsy();
    });

    it('hides prev/next buttons when show-prev-next is false', async () => {
      fixture = await mount('bit-pagination', {
        attrs: { page: '3', 'show-prev-next': 'false', 'total-pages': '5' },
      });

      expect(fixture.query('[aria-label="Previous page"]')).toBeFalsy();
      expect(fixture.query('[aria-label="Next page"]')).toBeFalsy();
    });
  });

  // ─── Props ───────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('applies page attribute on host', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '4', 'total-pages': '10' } });

      expect(fixture.element.getAttribute('page')).toBe('4');
    });

    it('applies total-pages attribute on host', async () => {
      fixture = await mount('bit-pagination', { attrs: { 'total-pages': '20' } });

      expect(fixture.element.getAttribute('total-pages')).toBe('20');
    });

    it('applies color attribute on host', async () => {
      fixture = await mount('bit-pagination', { attrs: { color: 'primary', 'total-pages': '5' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies size attribute on host', async () => {
      fixture = await mount('bit-pagination', { attrs: { size: 'sm', 'total-pages': '5' } });

      expect(fixture.element.getAttribute('size')).toBe('sm');
    });

    it('applies variant attribute on host', async () => {
      fixture = await mount('bit-pagination', { attrs: { 'total-pages': '5', variant: 'flat' } });

      expect(fixture.element.getAttribute('variant')).toBe('flat');
    });
  });

  // ─── Navigation ──────────────────────────────────────────────────────────────

  describe('Navigation', () => {
    it('clicking a page button updates the page attribute', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '1', 'total-pages': '5' } });

      const pageBtn = fixture.shadow?.querySelector<HTMLButtonElement>('[aria-label="Page 3"]');
      if (pageBtn) {
        fire.click(pageBtn);
        await fixture.flush();

        expect(fixture.element.getAttribute('page')).toBe('3');
      }
    });

    it('clicking next button advances the page', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '2', 'show-prev-next': 'true', 'total-pages': '5' } });

      const nextBtn = fixture.query<HTMLButtonElement>('[aria-label="Next page"]');
      if (nextBtn) {
        fire.click(nextBtn);
        await fixture.flush();

        expect(fixture.element.getAttribute('page')).toBe('3');
      }
    });

    it('clicking prev button retreats the page', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '3', 'show-prev-next': 'true', 'total-pages': '5' } });

      const prevBtn = fixture.query<HTMLButtonElement>('[aria-label="Previous page"]');
      if (prevBtn) {
        fire.click(prevBtn);
        await fixture.flush();

        expect(fixture.element.getAttribute('page')).toBe('2');
      }
    });

    it('clicking first page button navigates to page 1', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '4', 'show-first-last': 'true', 'total-pages': '5' } });

      const firstBtn = fixture.query<HTMLButtonElement>('[aria-label="First page"]');
      if (firstBtn) {
        fire.click(firstBtn);
        await fixture.flush();

        expect(fixture.element.getAttribute('page')).toBe('1');
      }
    });

    it('clicking last page button navigates to final page', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '2', 'show-first-last': 'true', 'total-pages': '5' } });

      const lastBtn = fixture.query<HTMLButtonElement>('[aria-label="Last page"]');
      if (lastBtn) {
        fire.click(lastBtn);
        await fixture.flush();

        expect(fixture.element.getAttribute('page')).toBe('5');
      }
    });

    it('prev button is disabled on first page', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '1', 'show-prev-next': 'true', 'total-pages': '5' } });

      expect(fixture.query<HTMLButtonElement>('[aria-label="Previous page"]')?.disabled).toBe(true);
    });

    it('next button is disabled on last page', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '5', 'show-prev-next': 'true', 'total-pages': '5' } });

      expect(fixture.query<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(true);
    });
  });

  // ─── Events ──────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('fires change event when a page button is clicked', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '1', 'total-pages': '5' } });
      const handler = vi.fn();
      fixture.element.addEventListener('change', handler);

      const pageBtn = fixture.shadow?.querySelector<HTMLButtonElement>('[aria-label="Page 2"]');
      if (pageBtn) fire.click(pageBtn);
      await fixture.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('change event detail carries the new page number', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '1', 'total-pages': '5' } });
      let detail: { page: number } | undefined;
      fixture.element.addEventListener('change', (e: Event) => {
        detail = (e as CustomEvent).detail;
      });

      const pageBtn = fixture.shadow?.querySelector<HTMLButtonElement>('[aria-label="Page 3"]');
      if (pageBtn) fire.click(pageBtn);
      await fixture.flush();

      expect(detail?.page).toBe(3);
    });

    it('does not fire change when clicking the current page', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '2', 'total-pages': '5' } });
      const handler = vi.fn();
      fixture.element.addEventListener('change', handler);

      const currentBtn = fixture.shadow?.querySelector<HTMLButtonElement>('[aria-current="page"]');
      if (currentBtn) fire.click(currentBtn);
      await fixture.flush();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('clamps page to 1 when total-pages is 1', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '1', 'total-pages': '1' } });

      expect(fixture.query('[aria-current="page"]')?.textContent?.trim()).toBe('1');
    });

    it('shows ellipsis for large page counts', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '10', 'total-pages': '20' } });

      expect(fixture.query('.ellipsis')).toBeTruthy();
    });
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('bit-pagination accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./pagination');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Nav Landmark', () => {
    it('nav element has aria-label for the landmark', async () => {
      fixture = await mount('bit-pagination', { attrs: { label: 'Article pages', 'total-pages': '5' } });

      expect(fixture.query('nav')?.getAttribute('aria-label')).toBe('Article pages');
    });

    it('default nav label is "Pagination"', async () => {
      fixture = await mount('bit-pagination', { attrs: { 'total-pages': '5' } });

      expect(fixture.query('nav')?.getAttribute('aria-label')).toBe('Pagination');
    });
  });

  describe('Current Page Indicator', () => {
    it('current page button has aria-current="page"', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '3', 'total-pages': '5' } });

      expect(fixture.query('[aria-current="page"]')).toBeTruthy();
    });

    it('only one button has aria-current="page"', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '3', 'total-pages': '5' } });

      expect(fixture.shadow?.querySelectorAll('[aria-current="page"]').length).toBe(1);
    });

    it('non-current page buttons do not have aria-current', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '2', 'total-pages': '3' } });

      const pageBtn1 = fixture.shadow?.querySelector<HTMLElement>('[aria-label="Page 1"]');
      expect(pageBtn1?.getAttribute('aria-current')).toBeNull();
    });
  });

  describe('Button Labels', () => {
    it('each page button has an aria-label', async () => {
      fixture = await mount('bit-pagination', { attrs: { 'total-pages': '3' } });

      const pageBtns = fixture.shadow?.querySelectorAll('[part="page-btn"]') ?? [];
      for (const btn of pageBtns) {
        expect(btn.getAttribute('aria-label')).toBeTruthy();
      }
    });

    it('navigation buttons have descriptive aria-labels', async () => {
      fixture = await mount('bit-pagination', {
        attrs: { page: '3', 'show-first-last': 'true', 'show-prev-next': 'true', 'total-pages': '5' },
      });

      expect(fixture.query('[aria-label="Previous page"]')).toBeTruthy();
      expect(fixture.query('[aria-label="Next page"]')).toBeTruthy();
      expect(fixture.query('[aria-label="First page"]')).toBeTruthy();
      expect(fixture.query('[aria-label="Last page"]')).toBeTruthy();
    });
  });

  describe('Ellipsis', () => {
    it('ellipsis spans are aria-hidden to avoid noise in screen readers', async () => {
      fixture = await mount('bit-pagination', { attrs: { page: '10', 'total-pages': '20' } });

      const ellipsis = fixture.query('.ellipsis');
      if (ellipsis) {
        expect(ellipsis.getAttribute('aria-hidden')).toBe('true');
      }
    });
  });
});
