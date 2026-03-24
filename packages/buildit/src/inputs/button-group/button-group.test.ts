import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-button-group', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./button-group');
    await import('../button/button');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders group container', async () => {
      fixture = await mount('bit-button-group');

      expect(fixture.query('[part="group"]')).toBeTruthy();
    });

    it('renders slot for button children', async () => {
      fixture = await mount('bit-button-group', {
        html: '<bit-button>One</bit-button><bit-button>Two</bit-button>',
      });

      expect(fixture.element.querySelectorAll('bit-button').length).toBe(2);
    });
  });

  describe('Props', () => {
    it('applies color', async () => {
      fixture = await mount('bit-button-group', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies size', async () => {
      fixture = await mount('bit-button-group', { attrs: { size: 'sm' } });

      expect(fixture.element.getAttribute('size')).toBe('sm');
    });

    it('applies variant', async () => {
      fixture = await mount('bit-button-group', { attrs: { variant: 'outlined' } });

      expect(fixture.element.getAttribute('variant')).toBe('outlined');
    });

    it('applies attached', async () => {
      fixture = await mount('bit-button-group', { attrs: { attached: '' } });

      expect(fixture.element.hasAttribute('attached')).toBe(true);
    });

    it('applies fullwidth', async () => {
      fixture = await mount('bit-button-group', { attrs: { fullwidth: '' } });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });

    it('applies vertical orientation', async () => {
      fixture = await mount('bit-button-group', { attrs: { orientation: 'vertical' } });

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');
    });
  });

  describe('Colors', () => {
    for (const color of ['primary', 'secondary', 'success', 'warning', 'danger']) {
      it(`applies ${color} color`, async () => {
        fixture = await mount('bit-button-group', { attrs: { color } });

        expect(fixture.element.getAttribute('color')).toBe(color);
        fixture.destroy();
      });
    }
  });

  describe('Sizes', () => {
    for (const size of ['sm', 'md', 'lg']) {
      it(`applies ${size} size`, async () => {
        fixture = await mount('bit-button-group', { attrs: { size } });

        expect(fixture.element.getAttribute('size')).toBe(size);
        fixture.destroy();
      });
    }
  });
});

describe('bit-button-group accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./button-group');
    await import('../button/button');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Semantic Structure', () => {
    it('group container has role group', async () => {
      fixture = await mount('bit-button-group');

      expect(fixture.query('[role="group"]')).toBeTruthy();
    });

    it('group container has part group', async () => {
      fixture = await mount('bit-button-group');

      expect(fixture.query('[part="group"]')).toBeTruthy();
    });
  });

  describe('ARIA Labeling', () => {
    it('accepts aria-label for group description', async () => {
      fixture = await mount('bit-button-group', { attrs: { 'aria-label': 'Text formatting' } });

      expect(fixture.element.getAttribute('aria-label')).toBe('Text formatting');
    });
  });

  describe('Button Children Accessibility', () => {
    it('child buttons inherit color from group', async () => {
      fixture = await mount('bit-button-group', {
        attrs: { color: 'primary' },
        html: '<bit-button>Bold</bit-button>',
      });

      const btn = fixture.element.querySelector('bit-button');

      expect(btn?.getAttribute('color') ?? fixture.element.getAttribute('color')).toBe('primary');
    });
  });
});
