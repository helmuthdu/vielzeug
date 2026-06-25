import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-box', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./box');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders box container', async () => {
      fixture = await mount('ore-box');

      expect(fixture.query('[part="box"]')).toBeTruthy();
    });

    it('renders slot content', async () => {
      fixture = await mount('ore-box', { html: '<p>Content</p>' });

      expect(fixture.element.textContent?.trim()).toBe('Content');
    });
  });

  describe('Props', () => {
    it('applies variant', async () => {
      fixture = await mount('ore-box', { attrs: { variant: 'glass' } });

      expect(fixture.element.getAttribute('variant')).toBe('glass');
    });

    it('applies color', async () => {
      fixture = await mount('ore-box', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies padding', async () => {
      fixture = await mount('ore-box', { attrs: { padding: 'lg' } });

      expect(fixture.element.getAttribute('padding')).toBe('lg');
    });

    it('applies elevation', async () => {
      fixture = await mount('ore-box', { attrs: { elevation: '2' } });

      expect(fixture.element.getAttribute('elevation')).toBe('2');
    });

    it('applies rounded', async () => {
      fixture = await mount('ore-box', { attrs: { rounded: 'md' } });

      expect(fixture.element.getAttribute('rounded')).toBe('md');
    });

    it('applies fullwidth', async () => {
      fixture = await mount('ore-box', { attrs: { fullwidth: '' } });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });

    it('applies rainbow', async () => {
      fixture = await mount('ore-box', { attrs: { rainbow: '' } });

      expect(fixture.element.hasAttribute('rainbow')).toBe(true);
    });
  });

  describe('Variants', () => {
    for (const variant of ['solid', 'flat', 'glass', 'frost']) {
      it(`applies ${variant} variant`, async () => {
        fixture = await mount('ore-box', { attrs: { variant } });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
        fixture.dispose();
      });
    }
  });
});

describe('ore-box accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./box');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Semantic Structure', () => {
    it('box has no implicit interactive role', async () => {
      fixture = await mount('ore-box');

      expect(fixture.element.getAttribute('role')).toBeNull();
    });

    it('box is not focusable by default', async () => {
      fixture = await mount('ore-box');

      expect(fixture.element.getAttribute('tabindex')).toBeNull();
    });
  });

  describe('Content Accessibility', () => {
    it('slot content is accessible', async () => {
      fixture = await mount('ore-box', { html: '<p>Accessible content</p>' });

      expect(fixture.element.textContent?.trim()).toBe('Accessible content');
    });

    it('color variant does not hide content', async () => {
      fixture = await mount('ore-box', { attrs: { color: 'primary' }, html: 'Visible' });

      expect(fixture.element.textContent?.trim()).toBe('Visible');
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-box', { html: 'Content' });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
