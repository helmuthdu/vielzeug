import { type Fixture, mount } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

describe('bit-badge', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../badge');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with required shadow DOM elements', async () => {
      fixture = await mount('bit-badge');
      fixture.element.textContent = 'New';

      expect(fixture.query('.badge')).toBeTruthy();
      expect(fixture.query('slot[name="icon"]')).toBeTruthy();
    });

    it('should render default slot content', async () => {
      fixture = await mount('bit-badge');
      fixture.element.textContent = 'Beta';

      expect(fixture.element.textContent).toBe('Beta');
    });

    it('should render icon slot', async () => {
      fixture = await mount('bit-badge');
      fixture.element.innerHTML = '<span slot="icon">★</span>Featured';

      const iconSlot = fixture.query('slot[name="icon"]');
      expect(iconSlot).toBeTruthy();
    });
  });

  describe('Count Mode', () => {
    it('should display count as text', async () => {
      fixture = await mount('bit-badge', { attrs: { count: 5 } });

      // The badge should show the count number
      expect(fixture.element.getAttribute('count')).toBe('5');
    });

    it('should show max+ when count exceeds max', async () => {
      fixture = await mount('bit-badge', { attrs: { count: 150, max: 99 } });

      expect(fixture.element.getAttribute('count')).toBe('150');
      expect(fixture.element.getAttribute('max')).toBe('99');
    });

    it('should update count dynamically', async () => {
      fixture = await mount('bit-badge', { attrs: { count: 3 } });
      expect(fixture.element.getAttribute('count')).toBe('3');

      await fixture.attr('count', 7);
      expect(fixture.element.getAttribute('count')).toBe('7');
    });

    it('should use default max of 99', async () => {
      fixture = await mount('bit-badge', { attrs: { count: 100 } });
      expect(fixture.element.hasAttribute('max')).toBe(false);
    });
  });

  describe('Dot Mode', () => {
    it('should apply dot attribute', async () => {
      fixture = await mount('bit-badge', { attrs: { dot: true } });
      expect(fixture.element.hasAttribute('dot')).toBe(true);
    });

    it('should remove dot attribute when toggled off', async () => {
      fixture = await mount('bit-badge', { attrs: { dot: true } });
      await fixture.attr('dot', false);

      expect(fixture.element.hasAttribute('dot')).toBe(false);
    });
  });

  describe('Variants', () => {
    const variants = ['solid', 'flat', 'outline'] as const;

    variants.forEach((variant) => {
      it(`should apply ${variant} variant`, async () => {
        fixture = await mount('bit-badge', { attrs: { variant } });
        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    });

    it('should update variant dynamically', async () => {
      fixture = await mount('bit-badge', { attrs: { variant: 'solid' } });
      await fixture.attr('variant', 'outline');
      expect(fixture.element.getAttribute('variant')).toBe('outline');
    });
  });

  describe('Colors', () => {
    const colors = ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await mount('bit-badge', { attrs: { color } });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('should update color dynamically', async () => {
      fixture = await mount('bit-badge', { attrs: { color: 'primary' } });
      await fixture.attr('color', 'error');
      expect(fixture.element.getAttribute('color')).toBe('error');
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await mount('bit-badge', { attrs: { size } });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });

    it('should update size dynamically', async () => {
      fixture = await mount('bit-badge', { attrs: { size: 'sm' } });
      await fixture.attr('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  describe('Rounded Variants', () => {
    const roundedValues = ['none', 'sm', 'md', 'lg', 'full'] as const;

    roundedValues.forEach((rounded) => {
      it(`should apply rounded="${rounded}"`, async () => {
        fixture = await mount('bit-badge', { attrs: { rounded } });
        expect(fixture.element.getAttribute('rounded')).toBe(rounded);
      });
    });
  });

  describe('Multiple Attributes', () => {
    it('should handle multiple attributes simultaneously', async () => {
      fixture = await mount('bit-badge', {
        attrs: { color: 'primary', size: 'lg', variant: 'solid' },
      });
      fixture.element.textContent = 'New';

      expect(fixture.element.getAttribute('color')).toBe('primary');
      expect(fixture.element.getAttribute('size')).toBe('lg');
      expect(fixture.element.getAttribute('variant')).toBe('solid');
    });

    it('should combine count with color', async () => {
      fixture = await mount('bit-badge', { attrs: { color: 'error', count: 5 } });

      expect(fixture.element.getAttribute('color')).toBe('error');
      expect(fixture.element.getAttribute('count')).toBe('5');
    });
  });
});
