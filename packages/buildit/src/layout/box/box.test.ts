import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-box', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./box');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders box container', async () => {
      fixture = await mount('bit-box');

      expect(fixture.query('[part="box"]')).toBeTruthy();
    });

    it('renders slot content', async () => {
      fixture = await mount('bit-box', { html: '<p>Content</p>' });

      expect(fixture.element.textContent?.trim()).toBe('Content');
    });
  });

  describe('Props', () => {
    it('applies variant', async () => {
      fixture = await mount('bit-box', { attrs: { variant: 'glass' } });

      expect(fixture.element.getAttribute('variant')).toBe('glass');
    });

    it('applies color', async () => {
      fixture = await mount('bit-box', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies padding', async () => {
      fixture = await mount('bit-box', { attrs: { padding: 'lg' } });

      expect(fixture.element.getAttribute('padding')).toBe('lg');
    });

    it('applies elevation', async () => {
      fixture = await mount('bit-box', { attrs: { elevation: '2' } });

      expect(fixture.element.getAttribute('elevation')).toBe('2');
    });

    it('applies rounded', async () => {
      fixture = await mount('bit-box', { attrs: { rounded: 'md' } });

      expect(fixture.element.getAttribute('rounded')).toBe('md');
    });

    it('applies fullwidth', async () => {
      fixture = await mount('bit-box', { attrs: { fullwidth: '' } });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });

    it('applies rainbow', async () => {
      fixture = await mount('bit-box', { attrs: { rainbow: '' } });

      expect(fixture.element.hasAttribute('rainbow')).toBe(true);
    });
  });

  describe('Variants', () => {
    for (const variant of ['solid', 'flat', 'glass', 'frost']) {
      it(`applies ${variant} variant`, async () => {
        fixture = await mount('bit-box', { attrs: { variant } });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
        fixture.destroy();
      });
    }
  });
});

describe('bit-box accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./box');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Semantic Structure', () => {
    it('box has no implicit interactive role', async () => {
      fixture = await mount('bit-box');

      expect(fixture.element.getAttribute('role')).toBeNull();
    });

    it('box is not focusable by default', async () => {
      fixture = await mount('bit-box');

      expect(fixture.element.getAttribute('tabindex')).toBeNull();
    });
  });

  describe('Content Accessibility', () => {
    it('slot content is accessible', async () => {
      fixture = await mount('bit-box', { html: '<p>Accessible content</p>' });

      expect(fixture.element.textContent?.trim()).toBe('Accessible content');
    });

    it('color variant does not hide content', async () => {
      fixture = await mount('bit-box', { attrs: { color: 'primary' }, html: 'Visible' });

      expect(fixture.element.textContent?.trim()).toBe('Visible');
    });
  });
});
