import { type ComponentFixture, createFixture } from '@vielzeug/craftit/testing';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('bit-switch', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../switch');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with shadow DOM structure', async () => {
      fixture = await createFixture('bit-switch');

      const input = fixture.query('input[type="checkbox"]');
      const track = fixture.query('.switch-track');
      const thumb = fixture.query('.switch-thumb');

      expect(input).toBeTruthy();
      expect(track).toBeTruthy();
      expect(thumb).toBeTruthy();
    });

    it('should render label content', async () => {
      fixture = await createFixture('bit-switch');
      fixture.element.textContent = 'Enable notifications';

      const slot = fixture.query('slot');
      expect(slot).toBeTruthy();
    });
  });

  describe('States', () => {
    it('should reflect checked attribute', async () => {
      fixture = await createFixture('bit-switch', { checked: true });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.checked).toBe(true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should toggle checked state', async () => {
      fixture = await createFixture('bit-switch');
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.checked).toBe(false);

      await fixture.setAttribute('checked', true);
      expect(input?.checked).toBe(true);

      await fixture.setAttribute('checked', false);
      expect(input?.checked).toBe(false);
    });

    it('should reflect disabled attribute', async () => {
      fixture = await createFixture('bit-switch', { disabled: true });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.disabled).toBe(true);
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('should toggle disabled state', async () => {
      fixture = await createFixture('bit-switch');
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.disabled).toBe(false);

      await fixture.setAttribute('disabled', true);
      expect(input?.disabled).toBe(true);
    });

    it('should handle unchecked and checked states', async () => {
      // Test unchecked
      fixture = await createFixture('bit-switch');
      const input1 = fixture.query<HTMLInputElement>('input');
      expect(input1?.checked).toBe(false);
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
      fixture.destroy();

      // Test checked
      fixture = await createFixture('bit-switch', { checked: true });
      const input2 = fixture.query<HTMLInputElement>('input');
      expect(input2?.checked).toBe(true);
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('Events', () => {
    it('should emit change event when clicked', async () => {
      fixture = await createFixture('bit-switch');
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      fixture.element.click();

      expect(changeHandler).toHaveBeenCalled();
      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should emit change event with correct details', async () => {
      fixture = await createFixture('bit-switch', { value: 'notifications' });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      fixture.element.click();

      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
      expect(event.detail.value).toBe('notifications');
      expect(event.detail.originalEvent).toBeDefined();
    });

    it('should not emit change event when disabled', async () => {
      fixture = await createFixture('bit-switch', { disabled: true });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      fixture.element.click();

      expect(changeHandler).not.toHaveBeenCalled();
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('should toggle on keyboard space/enter', async () => {
      fixture = await createFixture('bit-switch');
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

    it('should toggle checked state on click', async () => {
      fixture = await createFixture('bit-switch');

      expect(fixture.element.hasAttribute('checked')).toBe(false);

      fixture.element.click();
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      fixture.element.click();
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      fixture = await createFixture('bit-switch', { checked: true, disabled: true });

      expect(fixture.element.getAttribute('role')).toBe('switch');
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    });

    it('should be keyboard accessible when not disabled', async () => {
      fixture = await createFixture('bit-switch');

      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });

    it('should not have tabindex when disabled', async () => {
      fixture = await createFixture('bit-switch', { disabled: true });

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });

    it('should update aria-checked on state change', async () => {
      fixture = await createFixture('bit-switch');

      expect(fixture.element.getAttribute('aria-checked')).toBe('false');

      fixture.element.click();
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');

      fixture.element.click();
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('Attributes', () => {
    it('should handle name attribute', async () => {
      fixture = await createFixture('bit-switch', { name: 'notifications' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.name).toBe('notifications');
    });

    it('should handle value attribute', async () => {
      fixture = await createFixture('bit-switch', { value: 'on' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.value).toBe('on');
    });

    it('should support color variants', async () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'];

      for (const color of colors) {
        fixture = await createFixture('bit-switch', { color });
        expect(fixture.element.getAttribute('color')).toBe(color);
        fixture.destroy();
      }
    });

    it('should support size variants', async () => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        fixture = await createFixture('bit-switch', { size });
        expect(fixture.element.getAttribute('size')).toBe(size);
        fixture.destroy();
      }
    });
  });
});

