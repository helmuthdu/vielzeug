import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-grid-item', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./grid-item');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders grid item element', async () => {
      fixture = await mount('bit-grid-item');

      expect(fixture.element).toBeTruthy();
    });

    it('renders slot content', async () => {
      fixture = await mount('bit-grid-item', { html: '<p>Item</p>' });

      expect(fixture.element.textContent?.trim()).toBe('Item');
    });
  });

  describe('Props', () => {
    it('applies col-span', async () => {
      fixture = await mount('bit-grid-item', { attrs: { 'col-span': '3' } });

      expect(fixture.element.getAttribute('col-span')).toBe('3');
    });

    it('applies row-span', async () => {
      fixture = await mount('bit-grid-item', { attrs: { 'row-span': '2' } });

      expect(fixture.element.getAttribute('row-span')).toBe('2');
    });

    it('applies col', async () => {
      fixture = await mount('bit-grid-item', { attrs: { col: '2 / 5' } });

      expect(fixture.element.getAttribute('col')).toBe('2 / 5');
    });

    it('applies row', async () => {
      fixture = await mount('bit-grid-item', { attrs: { row: '1 / 3' } });

      expect(fixture.element.getAttribute('row')).toBe('1 / 3');
    });

    it('applies align', async () => {
      fixture = await mount('bit-grid-item', { attrs: { align: 'center' } });

      expect(fixture.element.getAttribute('align')).toBe('center');
    });

    it('applies justify', async () => {
      fixture = await mount('bit-grid-item', { attrs: { justify: 'end' } });

      expect(fixture.element.getAttribute('justify')).toBe('end');
    });

    it('applies col-span full', async () => {
      fixture = await mount('bit-grid-item', { attrs: { 'col-span': 'full' } });

      expect(fixture.element.getAttribute('col-span')).toBe('full');
    });
  });
});

describe('bit-grid-item accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./grid-item');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Semantic Structure', () => {
    it('has no implicit interactive role', async () => {
      fixture = await mount('bit-grid-item');

      expect(fixture.element.getAttribute('role')).toBeNull();
    });

    it('is not focusable by default', async () => {
      fixture = await mount('bit-grid-item');

      expect(fixture.element.getAttribute('tabindex')).toBeNull();
    });
  });

  describe('Content Accessibility', () => {
    it('slot content is accessible', async () => {
      fixture = await mount('bit-grid-item', { html: '<h2>Grid heading</h2>' });

      expect(fixture.element.textContent?.trim()).toBe('Grid heading');
    });

    it('col-span does not affect ARIA', async () => {
      fixture = await mount('bit-grid-item', { attrs: { 'col-span': 'full' } });

      expect(fixture.element.getAttribute('role')).toBeNull();
    });
  });
});
