import { type Fixture, mount, user } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('bit-checkbox', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../checkbox');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with required shadow DOM elements', async () => {
      fixture = await mount('bit-checkbox');

      expect(fixture.query('input[type="checkbox"]')).toBeTruthy();
      expect(fixture.query('.box')).toBeTruthy();
      expect(fixture.query('slot')).toBeTruthy();
    });
  });

  describe('Checked State', () => {
    it('should sync checked attribute with internal input', async () => {
      fixture = await mount('bit-checkbox', { attrs: { checked: true } });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.checked).toBe(true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should toggle checked state dynamically', async () => {
      fixture = await mount('bit-checkbox');

      await fixture.attr('checked', true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      await fixture.attr('checked', false);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('should toggle on click', async () => {
      fixture = await mount('bit-checkbox');

      expect(fixture.element.hasAttribute('checked')).toBe(false);

      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  describe('Disabled State', () => {
    // ...existing code...

    it('should prevent events when disabled', async () => {
      fixture = await mount('bit-checkbox', { attrs: { disabled: true } });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await user.click(fixture.element);

      expect(changeHandler).not.toHaveBeenCalled();
    });
  });

  // ...existing code...

  describe('Events', () => {
    it('should emit change event with complete details', async () => {
      fixture = await mount('bit-checkbox', { attrs: { value: 'agree' } });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await user.click(fixture.element);

      expect(changeHandler).toHaveBeenCalledTimes(1);
      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
    });

    it('should respond to keyboard events', async () => {
      fixture = await mount('bit-checkbox');
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
      fixture = await mount('bit-checkbox', { attrs: { name: 'terms', value: 'accepted' } });

      expect(fixture.element.getAttribute('name')).toBe('terms');
      expect(fixture.element.getAttribute('value')).toBe('accepted');
    });
  });

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    it('should apply and update color attribute', async () => {
      fixture = await mount('bit-checkbox', { attrs: { color: 'primary' } });
      expect(fixture.element.getAttribute('color')).toBe('primary');

      await fixture.attr('color', 'error');
      expect(fixture.element.getAttribute('color')).toBe('error');
    });

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await mount('bit-checkbox', { attrs: { color } });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    it('should apply and update size attribute', async () => {
      fixture = await mount('bit-checkbox', { attrs: { size: 'sm' } });
      expect(fixture.element.getAttribute('size')).toBe('sm');

      await fixture.attr('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await mount('bit-checkbox', { attrs: { size } });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });
  });

  describe('Accessibility', () => {
    it('should reflect checked and disabled state as host attributes', async () => {
      fixture = await mount('bit-checkbox', { attrs: { checked: true, disabled: true } });

      expect(fixture.element.hasAttribute('checked')).toBe(true);
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('should respond to keyboard interaction when enabled', async () => {
      fixture = await mount('bit-checkbox');
      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, ' ');
      expect(changeHandler).toHaveBeenCalledTimes(1);
    });

    it('should not be focusable when disabled', async () => {
      fixture = await mount('bit-checkbox', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });
  });
});
