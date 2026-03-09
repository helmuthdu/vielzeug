import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-badge', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./badge');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders badge container', async () => {
      fixture = await mount('bit-badge');

      expect(fixture.query('.badge')).toBeTruthy();
    });

    it('renders default slot', async () => {
      fixture = await mount('bit-badge', { html: 'Label' });

      expect(fixture.element.textContent?.trim()).toBe('Label');
    });
  });

  describe('Count', () => {
    it('displays count value', async () => {
      fixture = await mount('bit-badge', { attrs: { count: '5' } });

      expect(fixture.query('.badge')?.textContent).toContain('5');
    });

    it('displays max+ when count exceeds max', async () => {
      fixture = await mount('bit-badge', { attrs: { count: '105', max: '99' } });

      expect(fixture.query('.badge')?.textContent).toContain('99+');
    });

    it('displays exact count when within max', async () => {
      fixture = await mount('bit-badge', { attrs: { count: '50', max: '99' } });

      expect(fixture.query('.badge')?.textContent).toContain('50');
    });

    it('displays zero count', async () => {
      fixture = await mount('bit-badge', { attrs: { count: '0' } });

      expect(fixture.query('.badge')?.textContent).toContain('0');
    });
  });

  describe('Dot Mode', () => {
    it('renders dot when dot attribute set', async () => {
      fixture = await mount('bit-badge', { attrs: { dot: '' } });

      expect(fixture.element.hasAttribute('dot')).toBe(true);
    });
  });

  describe('Props', () => {
    it('applies color', async () => {
      fixture = await mount('bit-badge', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies variant', async () => {
      fixture = await mount('bit-badge', { attrs: { variant: 'flat' } });

      expect(fixture.element.getAttribute('variant')).toBe('flat');
    });

    it('applies size', async () => {
      fixture = await mount('bit-badge', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('applies rounded', async () => {
      fixture = await mount('bit-badge', { attrs: { rounded: '' } });

      expect(fixture.element.hasAttribute('rounded')).toBe(true);
    });

    it('applies anchor position', async () => {
      fixture = await mount('bit-badge', { attrs: { anchor: 'top-start' } });

      expect(fixture.element.getAttribute('anchor')).toBe('top-start');
    });
  });

  describe('Colors', () => {
    for (const color of ['primary', 'success', 'warning', 'error', 'info']) {
      it(`applies ${color} color`, async () => {
        fixture = await mount('bit-badge', { attrs: { color } });

        expect(fixture.element.getAttribute('color')).toBe(color);
        fixture.destroy();
      });
    }
  });

  describe('Variants', () => {
    for (const variant of ['solid', 'flat', 'bordered', 'outline', 'frost']) {
      it(`applies ${variant} variant`, async () => {
        fixture = await mount('bit-badge', { attrs: { variant } });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
        fixture.destroy();
      });
    }
  });
});

describe('bit-badge accessibility', () => {
  let fixture: Awaited<ReturnType<typeof mount>>;

  beforeAll(async () => {
    await import('./badge');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Non-interactive', () => {
    it('has no interactive role', async () => {
      fixture = await mount('bit-badge', { attrs: { count: '5' } });

      const badge = fixture.query('.badge');
      const role = badge?.getAttribute('role');
      expect(!role || !['button', 'link', 'checkbox', 'menuitem'].includes(role)).toBe(true);
    });

    it('is not focusable by default', async () => {
      fixture = await mount('bit-badge', { attrs: { count: '5' } });

      const badge = fixture.query('.badge');
      const tabindex = badge?.getAttribute('tabindex');
      expect(!tabindex || tabindex === '-1').toBe(true);
    });
  });

  describe('Count Visibility', () => {
    it('count is visible in DOM', async () => {
      fixture = await mount('bit-badge', { attrs: { count: '7' } });

      expect(fixture.query('.badge')?.textContent).toContain('7');
    });

    it('max plus is visible in DOM', async () => {
      fixture = await mount('bit-badge', { attrs: { count: '150', max: '99' } });

      expect(fixture.query('.badge')?.textContent).toContain('99+');
    });
  });
});
