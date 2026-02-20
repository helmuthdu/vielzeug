import { createFixture, type ComponentFixture } from '@vielzeug/craftit/testing';
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
    it('should render with shadow DOM structure', async () => {
      fixture = await createFixture('bit-checkbox');

      const input = fixture.query('input[type="checkbox"]');
      const box = fixture.query('.box');

      expect(input).toBeTruthy();
      expect(box).toBeTruthy();
    });

    it('should render label content', async () => {
      fixture = await createFixture('bit-checkbox');
      fixture.element.textContent = 'Accept terms';

      const slot = fixture.query('slot');
      expect(slot).toBeTruthy();
    });
  });

  describe('States', () => {
    it('should reflect checked attribute', async () => {
      fixture = await createFixture('bit-checkbox', { checked: true });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.checked).toBe(true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should toggle checked state', async () => {
      fixture = await createFixture('bit-checkbox');
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.checked).toBe(false);

      await fixture.setAttribute('checked', true);
      expect(input?.checked).toBe(true);

      await fixture.setAttribute('checked', false);
      expect(input?.checked).toBe(false);
    });

    it('should reflect disabled attribute', async () => {
      fixture = await createFixture('bit-checkbox', { disabled: true });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.disabled).toBe(true);
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('should toggle disabled state', async () => {
      fixture = await createFixture('bit-checkbox');
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.disabled).toBe(false);

      await fixture.setAttribute('disabled', true);
      expect(input?.disabled).toBe(true);
    });

    it('should reflect indeterminate attribute', async () => {
      fixture = await createFixture('bit-checkbox', { indeterminate: true });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.indeterminate).toBe(true);
      expect(fixture.element.getAttribute('aria-checked')).toBe('mixed');
    });

    it('should handle unchecked, checked, and indeterminate states', async () => {
      // Test unchecked
      fixture = await createFixture('bit-checkbox');
      const input1 = fixture.query<HTMLInputElement>('input');
      expect(input1?.checked).toBe(false);
      expect(input1?.indeterminate).toBe(false);
      fixture.destroy();

      // Test checked
      fixture = await createFixture('bit-checkbox', { checked: true });
      const input2 = fixture.query<HTMLInputElement>('input');
      expect(input2?.checked).toBe(true);
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      fixture.destroy();

      // Test indeterminate
      fixture = await createFixture('bit-checkbox', { indeterminate: true });
      const input3 = fixture.query<HTMLInputElement>('input');
      expect(input3?.indeterminate).toBe(true);
      expect(fixture.element.getAttribute('aria-checked')).toBe('mixed');
    });
  });

  describe('Events', () => {
    it('should emit change event when clicked', async () => {
      fixture = await createFixture('bit-checkbox');
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      fixture.element.click();

      expect(changeHandler).toHaveBeenCalled();
      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should emit change event with correct details', async () => {
      fixture = await createFixture('bit-checkbox', { value: 'terms' });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      fixture.element.click();

      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
      expect(event.detail.value).toBe('terms');
      expect(event.detail.originalEvent).toBeDefined();
    });

    it('should not emit change event when disabled', async () => {
      fixture = await createFixture('bit-checkbox', { disabled: true });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      fixture.element.click();

      expect(changeHandler).not.toHaveBeenCalled();
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('should toggle on keyboard space/enter', async () => {
      fixture = await createFixture('bit-checkbox');
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      // Space key
      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      expect(changeHandler).toHaveBeenCalled();

      changeHandler.mockClear();

      // Enter key
      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(changeHandler).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      fixture = await createFixture('bit-checkbox', { checked: true, disabled: true });

      expect(fixture.element.getAttribute('role')).toBe('checkbox');
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    });

    it('should be keyboard accessible when not disabled', async () => {
      fixture = await createFixture('bit-checkbox');

      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });

    it('should not have tabindex when disabled', async () => {
      fixture = await createFixture('bit-checkbox', { disabled: true });

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });
  });
});
