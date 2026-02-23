import { type ComponentFixture, createFixture, userEvent } from '@vielzeug/craftit/testing';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('bit-checkbox', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../checkbox');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with required shadow DOM elements', async () => {
      fixture = await createFixture('bit-checkbox');

      expect(fixture.query('input[type="checkbox"]')).toBeTruthy();
      expect(fixture.query('.box')).toBeTruthy();
      expect(fixture.query('slot')).toBeTruthy();
    });
  });

  describe('Checked State', () => {
    it('should sync checked attribute with internal input', async () => {
      fixture = await createFixture('bit-checkbox', { checked: true });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.checked).toBe(true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
    });

    it('should toggle checked state dynamically', async () => {
      fixture = await createFixture('bit-checkbox');
      const input = fixture.query<HTMLInputElement>('input');

      await fixture.setAttribute('checked', true);
      expect(input?.checked).toBe(true);

      await fixture.setAttribute('checked', false);
      expect(input?.checked).toBe(false);
    });

    it('should toggle on click', async () => {
      fixture = await createFixture('bit-checkbox');

      expect(fixture.element.hasAttribute('checked')).toBe(false);

      await userEvent.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      await userEvent.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  describe('Disabled State', () => {
    // ...existing code...

    it('should prevent events when disabled', async () => {
      fixture = await createFixture('bit-checkbox', { disabled: true });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await userEvent.click(fixture.element);

      expect(changeHandler).not.toHaveBeenCalled();
    });
  });

  // ...existing code...

  describe('Events', () => {
    it('should emit change event with complete details', async () => {
      fixture = await createFixture('bit-checkbox', { value: 'agree' });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await userEvent.click(fixture.element);

      expect(changeHandler).toHaveBeenCalledTimes(1);
      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
      expect(event.detail.value).toBe('agree');
      expect(event.detail.originalEvent).toBeDefined();
    });

    it('should respond to keyboard events', async () => {
      fixture = await createFixture('bit-checkbox');
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
      fixture = await createFixture('bit-checkbox', { name: 'terms', value: 'accepted' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.name).toBe('terms');
      expect(input?.value).toBe('accepted');
    });
  });

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    it('should apply and update color attribute', async () => {
      fixture = await createFixture('bit-checkbox', { color: 'primary' });
      expect(fixture.element.getAttribute('color')).toBe('primary');

      await fixture.setAttribute('color', 'error');
      expect(fixture.element.getAttribute('color')).toBe('error');
    });

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await createFixture('bit-checkbox', { color });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    it('should apply and update size attribute', async () => {
      fixture = await createFixture('bit-checkbox', { size: 'sm' });
      expect(fixture.element.getAttribute('size')).toBe('sm');

      await fixture.setAttribute('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await createFixture('bit-checkbox', { size });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role and attributes', async () => {
      fixture = await createFixture('bit-checkbox', { checked: true, disabled: true });

      expect(fixture.element.getAttribute('role')).toBe('checkbox');
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    });

    it('should be keyboard accessible when enabled', async () => {
      fixture = await createFixture('bit-checkbox');
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });

    it('should not be focusable when disabled', async () => {
      fixture = await createFixture('bit-checkbox', { disabled: true });

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });
  });
});
