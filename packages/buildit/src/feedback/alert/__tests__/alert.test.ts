import { type Fixture, mount, user } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('bit-alert', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../alert');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with required shadow DOM elements', async () => {
      fixture = await mount('bit-alert');
      fixture.element.textContent = 'Something happened';

      expect(fixture.query('.alert')).toBeTruthy();
      expect(fixture.query('.body')).toBeTruthy();
      expect(fixture.query('.content')).toBeTruthy();
      expect(fixture.query('.icon-slot')).toBeTruthy();
      expect(fixture.query('.close')).toBeTruthy();
    });

    it('should have role="alert"', async () => {
      fixture = await mount('bit-alert');
      fixture.element.textContent = 'Alert message';

      const alertEl = fixture.query('.alert');
      expect(alertEl?.getAttribute('role')).toBe('alert');
    });

    it('should render default slot content', async () => {
      fixture = await mount('bit-alert');
      fixture.element.textContent = 'Info message';

      expect(fixture.element.textContent).toBe('Info message');
    });

    it('should render icon slot', async () => {
      fixture = await mount('bit-alert');
      fixture.element.innerHTML = '<svg slot="icon"></svg>Alert body';

      const iconSlot = fixture.query('slot[name="icon"]');
      expect(iconSlot).toBeTruthy();
    });
  });

  describe('Title', () => {
    it('should render title when provided', async () => {
      fixture = await mount('bit-alert', { attrs: { title: 'Warning!' } });
      fixture.element.textContent = 'Please review.';

      const titleEl = fixture.query('.title');
      expect(titleEl).toBeTruthy();
      // title content is set via prop
      expect(fixture.element.getAttribute('title')).toBe('Warning!');
    });

    it('should update title dynamically', async () => {
      fixture = await mount('bit-alert', { attrs: { title: 'Old Title' } });
      await fixture.attr('title', 'New Title');

      expect(fixture.element.getAttribute('title')).toBe('New Title');
    });
  });

  describe('Dismissed State', () => {
    it('should not have dismissed attribute by default', async () => {
      fixture = await mount('bit-alert');
      expect(fixture.element.hasAttribute('dismissed')).toBe(false);
    });

    it('should set dismissed attribute on close button click', async () => {
      fixture = await mount('bit-alert', { attrs: { dismissable: true } });
      fixture.element.textContent = 'Closeable';

      const closeBtn = fixture.query<HTMLButtonElement>('.close');
      expect(closeBtn).toBeTruthy();

      await user.click(closeBtn!);

      expect(fixture.element.hasAttribute('dismissed')).toBe(true);
    });

    it('should not dismiss when dismissable is false', async () => {
      fixture = await mount('bit-alert');
      fixture.element.textContent = 'Non-dismissable';

      const closeBtn = fixture.query<HTMLButtonElement>('.close');
      if (closeBtn) {
        await user.click(closeBtn);
      }

      expect(fixture.element.hasAttribute('dismissed')).toBe(false);
    });
  });

  describe('Dismissable Attribute', () => {
    it('should apply dismissable attribute', async () => {
      fixture = await mount('bit-alert', { attrs: { dismissable: true } });
      expect(fixture.element.hasAttribute('dismissable')).toBe(true);
    });

    it('should toggle dismissable dynamically', async () => {
      fixture = await mount('bit-alert');
      await fixture.attr('dismissable', true);
      expect(fixture.element.hasAttribute('dismissable')).toBe(true);

      await fixture.attr('dismissable', false);
      expect(fixture.element.hasAttribute('dismissable')).toBe(false);
    });
  });

  describe('Events', () => {
    it('should emit dismiss event when close button is clicked', async () => {
      fixture = await mount('bit-alert', { attrs: { dismissable: true } });
      fixture.element.textContent = 'Will dismiss';

      const dismissHandler = vi.fn();
      fixture.element.addEventListener('dismiss', dismissHandler);

      const closeBtn = fixture.query<HTMLButtonElement>('.close');
      await user.click(closeBtn!);

      expect(dismissHandler).toHaveBeenCalledTimes(1);
      const event = dismissHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.originalEvent).toBeDefined();
    });

    it('should not emit dismiss when dismissable is false', async () => {
      fixture = await mount('bit-alert');
      const dismissHandler = vi.fn();
      fixture.element.addEventListener('dismiss', dismissHandler);

      const closeBtn = fixture.query<HTMLButtonElement>('.close');
      if (closeBtn) {
        await user.click(closeBtn);
      }

      expect(dismissHandler).not.toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    const variants = ['flat', 'solid', 'outline', 'frost'] as const;

    variants.forEach((variant) => {
      it(`should apply ${variant} variant`, async () => {
        fixture = await mount('bit-alert', { attrs: { variant } });
        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    });

    it('should update variant dynamically', async () => {
      fixture = await mount('bit-alert', { attrs: { variant: 'flat' } });
      await fixture.attr('variant', 'solid');
      expect(fixture.element.getAttribute('variant')).toBe('solid');
    });
  });

  describe('Colors', () => {
    const colors = ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await mount('bit-alert', { attrs: { color } });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('should update color dynamically', async () => {
      fixture = await mount('bit-alert', { attrs: { color: 'info' } });
      await fixture.attr('color', 'error');
      expect(fixture.element.getAttribute('color')).toBe('error');
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await mount('bit-alert', { attrs: { size } });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });
  });

  describe('Rounded Variants', () => {
    const roundedValues = ['none', 'sm', 'md', 'lg', 'full'] as const;

    roundedValues.forEach((rounded) => {
      it(`should apply rounded="${rounded}"`, async () => {
        fixture = await mount('bit-alert', { attrs: { rounded } });
        expect(fixture.element.getAttribute('rounded')).toBe(rounded);
      });
    });
  });
});
