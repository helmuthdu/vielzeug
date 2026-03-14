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

  describe('as — ARIA semantics', () => {
    it.each([
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
    ] as const)('as="%s" sets role="heading" and aria-level on the host', async (tag) => {
      fixture = await mount('bit-text', { attrs: { as: tag } });
      const level = Number(tag[1]);

      expect(fixture.element.getAttribute('role')).toBe('heading');
      expect(fixture.element.getAttribute('aria-level')).toBe(String(level));
      fixture.destroy();
    });

    it('as="p" does not set role="heading"', async () => {
      fixture = await mount('bit-text', { attrs: { as: 'p' } });

      expect(fixture.element.getAttribute('role')).toBeNull();
      expect(fixture.element.getAttribute('aria-level')).toBeNull();
    });

    it('as="span" does not set role="heading"', async () => {
      fixture = await mount('bit-text', { attrs: { as: 'span' } });

      expect(fixture.element.getAttribute('role')).toBeNull();
    });

    it('without as, no role is set', async () => {
      fixture = await mount('bit-text', {});

      expect(fixture.element.getAttribute('role')).toBeNull();
    });

    it('switching from h2 to p removes role and aria-level', async () => {
      fixture = await mount('bit-text', { attrs: { as: 'h2' } });
      expect(fixture.element.getAttribute('role')).toBe('heading');

      await fixture.attr('as', 'p');
      expect(fixture.element.getAttribute('role')).toBeNull();
      expect(fixture.element.getAttribute('aria-level')).toBeNull();
    });
  });

  describe('lines — multi-line clamp', () => {
    it('sets --_lines CSS variable on the host when lines is provided', async () => {
      fixture = await mount('bit-text', { attrs: { lines: '3' } });

      expect(fixture.element.style.getPropertyValue('--_lines')).toBe('3');
    });

    it('does not set --_lines when lines is absent', async () => {
      fixture = await mount('bit-text', {});

      expect(fixture.element.style.getPropertyValue('--_lines')).toBe('');
    });
  });

  describe('truncate', () => {
    it('applies the truncate attribute to the host', async () => {
      fixture = await mount('bit-text', { attrs: { truncate: '' } });

      expect(fixture.element.hasAttribute('truncate')).toBe(true);
    });

    it('truncate does not remove content', async () => {
      fixture = await mount('bit-text', { attrs: { truncate: '' }, html: 'Long text' });

      expect(fixture.element.textContent?.trim()).toBe('Long text');
    });
  });

  describe('Variants', () => {
    for (const variant of ['body', 'heading', 'label', 'caption', 'overline', 'code'] as const) {
      it(`reflects ${variant} variant as host attribute`, async () => {
        fixture = await mount('bit-text', { attrs: { variant } });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
        fixture.destroy();
      });
    }
  });

  describe('Weights', () => {
    for (const weight of ['normal', 'medium', 'semibold', 'bold'] as const) {
      it(`reflects ${weight} weight as host attribute`, async () => {
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

  describe('Content Accessibility', () => {
    it('exposes text content to accessibility tree', async () => {
      fixture = await mount('bit-text', { html: 'Screen reader text' });

      expect(fixture.element.textContent?.trim()).toBe('Screen reader text');
    });

    it('color attribute does not hide content', async () => {
      fixture = await mount('bit-text', { attrs: { color: 'muted' }, html: 'Visible' });

      expect(fixture.element.textContent?.trim()).toBe('Visible');
    });

    it('italic does not hide content', async () => {
      fixture = await mount('bit-text', { attrs: { italic: '' }, html: 'Slanted' });

      expect(fixture.element.textContent?.trim()).toBe('Slanted');
    });
  });
});
