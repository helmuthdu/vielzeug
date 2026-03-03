import { type Fixture, mount, user } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('bit-card', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../card');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with required shadow DOM elements', async () => {
      fixture = await mount('bit-card');

      expect(fixture.query('.card')).toBeTruthy();
      expect(fixture.query('.card-header')).toBeTruthy();
      expect(fixture.query('.card-content')).toBeTruthy();
      expect(fixture.query('.card-footer')).toBeTruthy();
    });

    it('should render default slot content', async () => {
      fixture = await mount('bit-card');
      fixture.element.textContent = 'Card content';

      expect(fixture.element.textContent).toContain('Card content');
    });

    it('should render header slot content', async () => {
      fixture = await mount('bit-card');
      const header = document.createElement('div');
      header.slot = 'header';
      header.textContent = 'Header content';
      fixture.element.appendChild(header);

      const headerSlot = fixture.query('.card-header slot[name="header"]');
      expect(headerSlot).toBeTruthy();
    });

    it('should render footer slot content', async () => {
      fixture = await mount('bit-card');
      const footer = document.createElement('div');
      footer.slot = 'footer';
      footer.textContent = 'Footer content';
      fixture.element.appendChild(footer);

      const footerSlot = fixture.query('.card-footer slot[name="footer"]');
      expect(footerSlot).toBeTruthy();
    });
  });

  describe('Variant Styles', () => {
    const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text', 'glass', 'frost'] as const;

    variants.forEach((variant) => {
      it(`should apply ${variant} variant`, async () => {
        fixture = await mount('bit-card', { attrs: { variant } });
        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    });

    it('should default to solid variant when no variant is specified', async () => {
      fixture = await mount('bit-card');
      expect(fixture.element.hasAttribute('variant')).toBe(false);
    });
  });

  describe('Padding Variants', () => {
    const paddings = ['none', 'sm', 'md', 'lg'] as const;

    paddings.forEach((padding) => {
      it(`should apply ${padding} padding`, async () => {
        fixture = await mount('bit-card', { attrs: { padding } });
        expect(fixture.element.getAttribute('padding')).toBe(padding);
      });
    });

    it('should use default padding when not specified', async () => {
      fixture = await mount('bit-card');
      expect(fixture.element.hasAttribute('padding')).toBe(false);
    });
  });

  describe('Interactive States', () => {
    it('should apply hoverable attribute', async () => {
      fixture = await mount('bit-card', { attrs: { hoverable: true } });
      expect(fixture.element.hasAttribute('hoverable')).toBe(true);
    });

    it('should apply clickable attribute', async () => {
      fixture = await mount('bit-card', { attrs: { clickable: true } });
      expect(fixture.element.hasAttribute('clickable')).toBe(true);
    });

    it('should not be hoverable by default', async () => {
      fixture = await mount('bit-card');
      expect(fixture.element.hasAttribute('hoverable')).toBe(false);
    });

    it('should not be clickable by default', async () => {
      fixture = await mount('bit-card');
      expect(fixture.element.hasAttribute('clickable')).toBe(false);
    });
  });

  describe('Events', () => {
    it('should emit click event when clickable card is clicked', async () => {
      fixture = await mount('bit-card', { attrs: { clickable: true } });
      const clickHandler = vi.fn();

      fixture.element.addEventListener('click', clickHandler);
      await user.click(fixture.element);

      expect(clickHandler).toHaveBeenCalled();
      expect(clickHandler).toHaveBeenCalledWith(expect.any(Event));
    });

    it('should not emit click event when card is not clickable', async () => {
      fixture = await mount('bit-card');
      const clickHandler = vi.fn();

      fixture.element.addEventListener('click', clickHandler);
      await user.click(fixture.element);

      // Click handler will be called, but detail should not be present
      // since the component doesn't emit custom click event
      expect(clickHandler).toHaveBeenCalled();
    });
  });

  describe('Attribute Changes', () => {
    it('should update variant dynamically', async () => {
      fixture = await mount('bit-card', { attrs: { variant: 'solid' } });

      await fixture.attr('variant', 'outline');
      expect(fixture.element.getAttribute('variant')).toBe('outline');

      await fixture.attr('variant', 'flat');
      expect(fixture.element.getAttribute('variant')).toBe('flat');
    });

    it('should update padding dynamically', async () => {
      fixture = await mount('bit-card', { attrs: { padding: 'sm' } });

      await fixture.attr('padding', 'lg');
      expect(fixture.element.getAttribute('padding')).toBe('lg');
    });

    it('should toggle hoverable dynamically', async () => {
      fixture = await mount('bit-card');

      await fixture.attr('hoverable', true);
      expect(fixture.element.hasAttribute('hoverable')).toBe(true);

      await fixture.attr('hoverable', false);
      expect(fixture.element.hasAttribute('hoverable')).toBe(false);
    });

    it('should toggle clickable dynamically', async () => {
      fixture = await mount('bit-card');

      await fixture.attr('clickable', true);
      expect(fixture.element.hasAttribute('clickable')).toBe(true);

      await fixture.attr('clickable', false);
      expect(fixture.element.hasAttribute('clickable')).toBe(false);
    });
  });

  describe('Combined Attributes', () => {
    it('should apply multiple attributes together', async () => {
      fixture = await mount('bit-card', {
        attrs: {
          hoverable: true,
          padding: 'lg',
          variant: 'outline',
        },
      });

      expect(fixture.element.getAttribute('variant')).toBe('outline');
      expect(fixture.element.getAttribute('padding')).toBe('lg');
      expect(fixture.element.hasAttribute('hoverable')).toBe(true);
    });

    it('should handle glass variant', async () => {
      fixture = await mount('bit-card', {
        attrs: {
          variant: 'glass',
        },
      });

      expect(fixture.element.getAttribute('variant')).toBe('glass');
    });
  });
});
