import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { type ComponentFixture, createFixture, userEvent } from '../../../utils/testing';

describe('bit-switch', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../switch');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with required shadow DOM elements', async () => {
      fixture = await createFixture('bit-switch');

      expect(fixture.query('input[type="checkbox"]')).toBeTruthy();
      expect(fixture.query('.switch-track')).toBeTruthy();
      expect(fixture.query('.switch-thumb')).toBeTruthy();
      expect(fixture.query('slot')).toBeTruthy();
    });
  });

  describe('Checked State', () => {
    it('should sync checked attribute with internal input', async () => {
      fixture = await createFixture('bit-switch', { checked: true });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.checked).toBe(true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
    });

    it('should toggle checked state dynamically', async () => {
      fixture = await createFixture('bit-switch');
      const input = fixture.query<HTMLInputElement>('input');

      await fixture.setAttribute('checked', true);
      expect(input?.checked).toBe(true);

      await fixture.setAttribute('checked', false);
      expect(input?.checked).toBe(false);
    });

    it('should toggle on click', async () => {
      fixture = await createFixture('bit-switch');

      expect(fixture.element.hasAttribute('checked')).toBe(false);

      await userEvent.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      await userEvent.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  describe('Disabled State', () => {
    it('should sync disabled attribute with internal input', async () => {
      fixture = await createFixture('bit-switch', { disabled: true });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.disabled).toBe(true);
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    });

    it('should prevent events when disabled', async () => {
      fixture = await createFixture('bit-switch', { disabled: true });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await userEvent.click(fixture.element);

      expect(changeHandler).not.toHaveBeenCalled();
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  describe('Events', () => {
    it('should emit change event with complete details', async () => {
      fixture = await createFixture('bit-switch', { value: 'notifications' });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await userEvent.click(fixture.element);

      expect(changeHandler).toHaveBeenCalledTimes(1);
      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
      expect(event.detail.value).toBe('notifications');
      expect(event.detail.originalEvent).toBeDefined();
    });

    it('should respond to keyboard events', async () => {
      fixture = await createFixture('bit-switch');
      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      await userEvent.keyboard(fixture.element, ' ');
      expect(changeHandler).toHaveBeenCalledTimes(1);

      await userEvent.keyboard(fixture.element, 'Enter');
      expect(changeHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Form Integration', () => {
    it('should set name and value on internal input', async () => {
      fixture = await createFixture('bit-switch', { name: 'notifications', value: 'enabled' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.name).toBe('notifications');
      expect(input?.value).toBe('enabled');
    });
  });

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    it('should apply and update color attribute', async () => {
      fixture = await createFixture('bit-switch', { color: 'primary' });
      expect(fixture.element.getAttribute('color')).toBe('primary');

      await fixture.setAttribute('color', 'success');
      expect(fixture.element.getAttribute('color')).toBe('success');
    });

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await createFixture('bit-switch', { color });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    it('should apply and update size attribute', async () => {
      fixture = await createFixture('bit-switch', { size: 'sm' });
      expect(fixture.element.getAttribute('size')).toBe('sm');

      await fixture.setAttribute('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await createFixture('bit-switch', { size });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role and attributes', async () => {
      fixture = await createFixture('bit-switch', { checked: true, disabled: true });

      expect(fixture.element.getAttribute('role')).toBe('switch');
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    });

    it('should be keyboard accessible when enabled', async () => {
      fixture = await createFixture('bit-switch');
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });

    it('should update aria-checked on interaction', async () => {
      fixture = await createFixture('bit-switch');
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');

      await userEvent.click(fixture.element);
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');

      await userEvent.click(fixture.element);
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid toggling', async () => {
      fixture = await createFixture('bit-switch');

      for (let i = 0; i < 5; i++) {
        await userEvent.click(fixture.element);
      }

      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should handle checked and disabled simultaneously', async () => {
      fixture = await createFixture('bit-switch', { checked: true, disabled: true });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await userEvent.click(fixture.element);

      expect(changeHandler).not.toHaveBeenCalled();
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should handle missing value attribute', async () => {
      fixture = await createFixture('bit-switch');
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await userEvent.click(fixture.element);

      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.value).toBeNull();
    });
  });
});
