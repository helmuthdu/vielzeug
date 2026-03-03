import { type Fixture, mount, user } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('bit-switch', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../switch');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with required shadow DOM elements', async () => {
      fixture = await mount('bit-switch');

      expect(fixture.query('input[type="checkbox"]')).toBeTruthy();
      expect(fixture.query('.switch-track')).toBeTruthy();
      expect(fixture.query('.switch-thumb')).toBeTruthy();
      expect(fixture.query('slot')).toBeTruthy();
    });
  });

  describe('Checked State', () => {
    it('should sync checked attribute with internal input', async () => {
      fixture = await mount('bit-switch', { attrs: { checked: true } });

      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should toggle checked state dynamically', async () => {
      fixture = await mount('bit-switch');

      await fixture.attr('checked', true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      await fixture.attr('checked', false);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('should toggle on click', async () => {
      fixture = await mount('bit-switch');

      expect(fixture.element.hasAttribute('checked')).toBe(false);

      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  describe('Disabled State', () => {
    it('should sync disabled attribute with internal input', async () => {
      fixture = await mount('bit-switch', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });

    it('should prevent events when disabled', async () => {
      fixture = await mount('bit-switch', { attrs: { disabled: true } });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await user.click(fixture.element);

      expect(changeHandler).not.toHaveBeenCalled();
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  describe('Events', () => {
    it('should emit change event with complete details', async () => {
      fixture = await mount('bit-switch', { attrs: { value: 'notifications' } });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await user.click(fixture.element);

      expect(changeHandler).toHaveBeenCalledTimes(1);
      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
    });

    it('should respond to keyboard events', async () => {
      fixture = await mount('bit-switch');
      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, ' ');
      expect(changeHandler).toHaveBeenCalledTimes(1);

      await user.press(fixture.element, 'Enter');
      expect(changeHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Form Integration', () => {
    it('should expose name and value as host attributes', async () => {
      fixture = await mount('bit-switch', { attrs: { name: 'notifications', value: 'enabled' } });

      expect(fixture.element.getAttribute('name')).toBe('notifications');
      expect(fixture.element.getAttribute('value')).toBe('enabled');
    });
  });

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    it('should apply and update color attribute', async () => {
      fixture = await mount('bit-switch', { attrs: { color: 'primary' } });
      expect(fixture.element.getAttribute('color')).toBe('primary');

      await fixture.attr('color', 'success');
      expect(fixture.element.getAttribute('color')).toBe('success');
    });

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await mount('bit-switch', { attrs: { color } });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    it('should apply and update size attribute', async () => {
      fixture = await mount('bit-switch', { attrs: { size: 'sm' } });
      expect(fixture.element.getAttribute('size')).toBe('sm');

      await fixture.attr('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await mount('bit-switch', { attrs: { size } });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });
  });

  describe('Accessibility', () => {
    it('should reflect checked and disabled state as host attributes', async () => {
      fixture = await mount('bit-switch', { attrs: { checked: true, disabled: true } });

      expect(fixture.element.hasAttribute('checked')).toBe(true);
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('should respond to keyboard interaction when enabled', async () => {
      fixture = await mount('bit-switch');
      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, ' ');
      expect(changeHandler).toHaveBeenCalledTimes(1);
    });

    it('should update checked state on interaction', async () => {
      fixture = await mount('bit-switch');
      expect(fixture.element.hasAttribute('checked')).toBe(false);

      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid toggling', async () => {
      fixture = await mount('bit-switch');

      for (let i = 0; i < 5; i++) {
        await user.click(fixture.element);
      }

      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should handle checked and disabled simultaneously', async () => {
      fixture = await mount('bit-switch', { attrs: { checked: true, disabled: true } });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await user.click(fixture.element);

      expect(changeHandler).not.toHaveBeenCalled();
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should handle missing value attribute', async () => {
      fixture = await mount('bit-switch');
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await user.click(fixture.element);

      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
    });
  });
});
