import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-skeleton', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./skeleton');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Core Functionality', () => {
    it('renders one skeleton bone by default', async () => {
      fixture = await mount('bit-skeleton');

      expect(fixture.element.shadowRoot?.querySelectorAll('.bone').length).toBe(1);
    });

    it('renders multiple lines for text variant', async () => {
      fixture = await mount('bit-skeleton', { attrs: { lines: '3', variant: 'text' } });

      const bones = fixture.element.shadowRoot?.querySelectorAll('.bone');
      expect(bones?.length).toBe(3);
      expect(bones?.[2].getAttribute('data-last')).toBe('true');
    });

    it('keeps one line for non-text variants even when lines is provided', async () => {
      fixture = await mount('bit-skeleton', { attrs: { lines: '4', variant: 'rect' } });

      expect(fixture.element.shadowRoot?.querySelectorAll('.bone').length).toBe(1);
    });

    it('applies circle variant', async () => {
      fixture = await mount('bit-skeleton', { attrs: { variant: 'circle' } });

      expect(fixture.element.getAttribute('variant')).toBe('circle');
    });

    it('applies size variant', async () => {
      fixture = await mount('bit-skeleton', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('maps width/height/radius props to CSS variables', async () => {
      fixture = await mount('bit-skeleton', {
        attrs: {
          height: '2rem',
          radius: '1rem',
          width: '12rem',
        },
      });

      expect(fixture.element.style.getPropertyValue('--skeleton-width')).toBe('12rem');
      expect(fixture.element.style.getPropertyValue('--skeleton-height')).toBe('2rem');
      expect(fixture.element.style.getPropertyValue('--skeleton-radius')).toBe('1rem');
    });

    it('disables animation when animated is false', async () => {
      fixture = await mount('bit-skeleton', { attrs: { animated: 'false' } });

      expect(fixture.element.getAttribute('data-animated')).toBe('false');
    });
  });

  describe('Accessibility', () => {
    it('marks decorative bone as aria-hidden', async () => {
      fixture = await mount('bit-skeleton');

      expect(fixture.query('.bone')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('does not expose interactive roles', async () => {
      fixture = await mount('bit-skeleton');

      expect(fixture.element.getAttribute('role')).toBeNull();
      expect(fixture.element.getAttribute('tabindex')).toBeNull();
    });

    it('defaults animation to enabled', async () => {
      fixture = await mount('bit-skeleton');

      expect(fixture.element.getAttribute('data-animated')).toBe('true');
    });

    it('supports text variant as a visual loading indicator', async () => {
      fixture = await mount('bit-skeleton', { attrs: { lines: '2', variant: 'text' } });

      expect(fixture.element.getAttribute('variant')).toBe('text');
      expect(fixture.element.shadowRoot?.querySelectorAll('.bone').length).toBe(2);
    });
  });
});
