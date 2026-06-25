import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-grid', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./grid');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders grid element', async () => {
      fixture = await mount('ore-grid');

      expect(fixture.element).toBeTruthy();
    });

    it('renders slot content', async () => {
      fixture = await mount('ore-grid', { html: '<div>Item</div>' });

      expect(fixture.element.textContent?.trim()).toBe('Item');
    });
  });

  describe('Props', () => {
    it('applies cols attribute', async () => {
      fixture = await mount('ore-grid', { attrs: { cols: '3' } });

      expect(fixture.element.getAttribute('cols')).toBe('3');
    });

    it('applies gap attribute', async () => {
      fixture = await mount('ore-grid', { attrs: { gap: 'md' } });

      expect(fixture.element.getAttribute('gap')).toBe('md');
    });

    it('applies align attribute', async () => {
      fixture = await mount('ore-grid', { attrs: { align: 'center' } });

      expect(fixture.element.getAttribute('align')).toBe('center');
    });

    it('applies justify attribute', async () => {
      fixture = await mount('ore-grid', { attrs: { justify: 'center' } });

      expect(fixture.element.getAttribute('justify')).toBe('center');
    });

    it('applies responsive', async () => {
      fixture = await mount('ore-grid', { attrs: { responsive: '' } });

      expect(fixture.element.hasAttribute('responsive')).toBe(true);
    });

    it('applies flow attribute', async () => {
      fixture = await mount('ore-grid', { attrs: { flow: 'column' } });

      expect(fixture.element.getAttribute('flow')).toBe('column');
    });
  });

  describe('Column Counts', () => {
    for (const cols of ['1', '2', '3', '4', '6', '12']) {
      it(`applies cols=${cols}`, async () => {
        fixture = await mount('ore-grid', { attrs: { cols } });

        expect(fixture.element.getAttribute('cols')).toBe(cols);
        fixture.dispose();
      });
    }
  });

  describe('Gap Sizes', () => {
    for (const gap of ['none', 'xs', 'sm', 'md', 'lg', 'xl']) {
      it(`applies gap=${gap}`, async () => {
        fixture = await mount('ore-grid', { attrs: { gap } });

        expect(fixture.element.getAttribute('gap')).toBe(gap);
        fixture.dispose();
      });
    }
  });
});

describe('ore-grid accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./grid');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Semantic Structure', () => {
    it('has no implicit interactive role', async () => {
      fixture = await mount('ore-grid');

      expect(fixture.element.getAttribute('role')).toBeNull();
    });

    it('is not focusable by default', async () => {
      fixture = await mount('ore-grid');

      expect(fixture.element.getAttribute('tabindex')).toBeNull();
    });
  });

  describe('Content Accessibility', () => {
    it('slot content is accessible', async () => {
      fixture = await mount('ore-grid', { html: '<div>Grid content</div>' });

      expect(fixture.element.textContent?.trim()).toBe('Grid content');
    });

    it('accepts aria-label for grid description', async () => {
      fixture = await mount('ore-grid', { attrs: { 'aria-label': 'Product grid' } });

      expect(fixture.element.getAttribute('aria-label')).toBe('Product grid');
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-grid', { html: '<ore-grid-item>Item</ore-grid-item>' });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
