import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-text', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./text');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders text content', async () => {
      fixture = await mount('bit-text', { html: 'Hello world' });

      expect(fixture.element.textContent?.trim()).toBe('Hello world');
    });

    it('renders slot for content', async () => {
      fixture = await mount('bit-text', { html: '<span>Text</span>' });

      expect(fixture.element.querySelector('span')).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('applies variant', async () => {
      fixture = await mount('bit-text', { attrs: { variant: 'heading' } });

      expect(fixture.element.getAttribute('variant')).toBe('heading');
    });

    it('applies size', async () => {
      fixture = await mount('bit-text', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('applies weight', async () => {
      fixture = await mount('bit-text', { attrs: { weight: 'bold' } });

      expect(fixture.element.getAttribute('weight')).toBe('bold');
    });

    it('applies color', async () => {
      fixture = await mount('bit-text', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies align', async () => {
      fixture = await mount('bit-text', { attrs: { align: 'center' } });

      expect(fixture.element.getAttribute('align')).toBe('center');
    });

    it('applies truncate', async () => {
      fixture = await mount('bit-text', { attrs: { truncate: '' } });

      expect(fixture.element.hasAttribute('truncate')).toBe(true);
    });

    it('applies italic', async () => {
      fixture = await mount('bit-text', { attrs: { italic: '' } });

      expect(fixture.element.hasAttribute('italic')).toBe(true);
    });

    it('applies as attribute', async () => {
      fixture = await mount('bit-text', { attrs: { as: 'h2' } });

      expect(fixture.element.getAttribute('as')).toBe('h2');
    });
  });

  describe('Variants', () => {
    for (const variant of ['body', 'heading', 'label', 'caption', 'overline', 'code']) {
      it(`applies ${variant} variant`, async () => {
        fixture = await mount('bit-text', { attrs: { variant } });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
        fixture.destroy();
      });
    }
  });

  describe('Weights', () => {
    for (const weight of ['normal', 'medium', 'semibold', 'bold']) {
      it(`applies ${weight} weight`, async () => {
        fixture = await mount('bit-text', { attrs: { weight } });

        expect(fixture.element.getAttribute('weight')).toBe(weight);
        fixture.destroy();
      });
    }
  });
});

describe('bit-text accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./text');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Semantic as Attribute', () => {
    it('applies as="h1" for heading level 1', async () => {
      fixture = await mount('bit-text', { attrs: { as: 'h1' } });

      expect(fixture.element.getAttribute('as')).toBe('h1');
    });

    it('applies as="p" for paragraph semantics', async () => {
      fixture = await mount('bit-text', { attrs: { as: 'p' } });

      expect(fixture.element.getAttribute('as')).toBe('p');
    });

    it('applies as="span" for inline semantics', async () => {
      fixture = await mount('bit-text', { attrs: { as: 'span' } });

      expect(fixture.element.getAttribute('as')).toBe('span');
    });

    it('applies as="label" for form label semantics', async () => {
      fixture = await mount('bit-text', { attrs: { as: 'label' } });

      expect(fixture.element.getAttribute('as')).toBe('label');
    });
  });

  describe('Content Accessibility', () => {
    it('exposes text content to accessibility tree', async () => {
      fixture = await mount('bit-text', { html: 'Screen reader text' });

      expect(fixture.element.textContent?.trim()).toBe('Screen reader text');
    });

    it('color attribute does not hide content', async () => {
      fixture = await mount('bit-text', { attrs: { color: 'muted' }, html: 'Visible' });

      expect(fixture.element.textContent?.trim()).toBe('Visible');
    });

    it('truncate does not remove content', async () => {
      fixture = await mount('bit-text', { attrs: { truncate: '' }, html: 'Long text' });

      expect(fixture.element.textContent?.trim()).toBe('Long text');
    });
  });
});
