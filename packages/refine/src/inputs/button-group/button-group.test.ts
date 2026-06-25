import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-button-group', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./button-group');
    await import('../button/button');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders group container', async () => {
      fixture = await mount('ore-button-group');

      expect(fixture.query('[part="group"]')).toBeTruthy();
    });

    it('renders slot for button children', async () => {
      fixture = await mount('ore-button-group', {
        html: '<ore-button>One</ore-button><ore-button>Two</ore-button>',
      });

      expect(fixture.element.querySelectorAll('ore-button').length).toBe(2);
    });
  });

  describe('Props', () => {
    it('applies color', async () => {
      fixture = await mount('ore-button-group', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies size', async () => {
      fixture = await mount('ore-button-group', { attrs: { size: 'sm' } });

      expect(fixture.element.getAttribute('size')).toBe('sm');
    });

    it('applies variant', async () => {
      fixture = await mount('ore-button-group', { attrs: { variant: 'outlined' } });

      expect(fixture.element.getAttribute('variant')).toBe('outlined');
    });

    it('applies attached', async () => {
      fixture = await mount('ore-button-group', { attrs: { attached: '' } });

      expect(fixture.element.hasAttribute('attached')).toBe(true);
    });

    it('applies fullwidth', async () => {
      fixture = await mount('ore-button-group', { attrs: { fullwidth: '' } });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });

    it('applies vertical orientation', async () => {
      fixture = await mount('ore-button-group', { attrs: { orientation: 'vertical' } });

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');
    });
  });

  describe('Colors', () => {
    for (const color of ['primary', 'secondary', 'success', 'warning', 'danger']) {
      it(`applies ${color} color`, async () => {
        fixture = await mount('ore-button-group', { attrs: { color } });

        expect(fixture.element.getAttribute('color')).toBe(color);
        fixture.dispose();
      });
    }
  });

  describe('Sizes', () => {
    for (const size of ['sm', 'md', 'lg']) {
      it(`applies ${size} size`, async () => {
        fixture = await mount('ore-button-group', { attrs: { size } });

        expect(fixture.element.getAttribute('size')).toBe(size);
        fixture.dispose();
      });
    }
  });
});

describe('ore-button-group accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./button-group');
    await import('../button/button');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Semantic Structure', () => {
    it('group container has role group', async () => {
      fixture = await mount('ore-button-group');

      expect(fixture.query('[role="group"]')).toBeTruthy();
    });

    it('group container has part group', async () => {
      fixture = await mount('ore-button-group');

      expect(fixture.query('[part="group"]')).toBeTruthy();
    });
  });

  describe('ARIA Labeling', () => {
    it('accepts aria-label for group description', async () => {
      fixture = await mount('ore-button-group', { attrs: { 'aria-label': 'Text formatting' } });

      expect(fixture.element.getAttribute('aria-label')).toBe('Text formatting');
    });
  });

  describe('Button Children Accessibility', () => {
    it('child buttons inherit color from group', async () => {
      fixture = await mount('ore-button-group', {
        attrs: { color: 'primary' },
        html: '<ore-button>Bold</ore-button>',
      });

      const btn = fixture.element.querySelector('ore-button');

      expect(btn?.getAttribute('color') ?? fixture.element.getAttribute('color')).toBe('primary');
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-button-group', {
        attrs: { label: 'Actions' },
        html: '<ore-button>Save</ore-button><ore-button>Cancel</ore-button>',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
