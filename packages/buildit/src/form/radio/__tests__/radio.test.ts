import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { type ComponentFixture, createFixture, userEvent } from '../../../utils/testing';

describe('bit-radio', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../radio');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with shadow DOM structure', async () => {
      fixture = await createFixture('bit-radio');

      const circle = fixture.query('.circle');
      expect(circle).toBeTruthy();
    });

    it('should render label content', async () => {
      fixture = await createFixture('bit-radio');
      fixture.element.textContent = 'Option 1';

      await fixture.update();

      const label = fixture.query('.label');
      const slot = label?.querySelector('slot');
      const assignedNodes = slot?.assignedNodes();

      expect(assignedNodes?.length).toBeGreaterThan(0);
    });
  });

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await createFixture('bit-radio', { color });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('should change color dynamically', async () => {
      fixture = await createFixture('bit-radio', { color: 'primary' });

      await fixture.setAttribute('color', 'error');
      expect(fixture.element.getAttribute('color')).toBe('error');
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await createFixture('bit-radio', { size });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });

    it('should change size dynamically', async () => {
      fixture = await createFixture('bit-radio', { size: 'sm' });

      await fixture.setAttribute('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  describe('States', () => {
    it('should be unchecked by default', async () => {
      fixture = await createFixture('bit-radio');
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('should be checked when attribute is set', async () => {
      fixture = await createFixture('bit-radio', { checked: true });
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should toggle checked state', async () => {
      fixture = await createFixture('bit-radio');

      expect(fixture.element.hasAttribute('checked')).toBe(false);

      await fixture.setAttribute('checked', true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should be disabled when attribute is set', async () => {
      fixture = await createFixture('bit-radio', { disabled: true });
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('should toggle disabled state', async () => {
      fixture = await createFixture('bit-radio');

      expect(fixture.element.hasAttribute('disabled')).toBe(false);

      await fixture.setAttribute('disabled', true);
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Form Integration', () => {
    it('should have name attribute', async () => {
      fixture = await createFixture('bit-radio', { name: 'choice', value: 'option1' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.getAttribute('name')).toBe('choice');
      expect(input?.getAttribute('value')).toBe('option1');
    });

    it('should update name and value dynamically', async () => {
      fixture = await createFixture('bit-radio', { name: 'choice1' });
      const input = fixture.query<HTMLInputElement>('input');

      await fixture.setAttribute('name', 'choice2');
      expect(input?.getAttribute('name')).toBe('choice2');
    });
  });

  describe('Events', () => {
    it('should emit change event when clicked', async () => {
      fixture = await createFixture('bit-radio', { name: 'test', value: 'yes' });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await userEvent.click(fixture.element);

      expect(changeHandler).toHaveBeenCalled();
      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
      expect(event.detail.value).toBe('yes');
      expect(event.detail.originalEvent).toBeDefined();
    });

    it('should not emit change event when disabled', async () => {
      fixture = await createFixture('bit-radio', { disabled: true });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await userEvent.click(fixture.element);

      expect(changeHandler).not.toHaveBeenCalled();
    });

    it('should emit change event with correct details', async () => {
      fixture = await createFixture('bit-radio', { name: 'option', value: 'a' });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      fixture.element.click();

      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
      expect(event.detail.value).toBe('a');
    });
  });

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await createFixture('bit-radio', { color });

        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('should change color dynamically', async () => {
      fixture = await createFixture('bit-radio', { color: 'primary' });

      expect(fixture.element.getAttribute('color')).toBe('primary');

      await fixture.setAttribute('color', 'error');
      expect(fixture.element.getAttribute('color')).toBe('error');
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await createFixture('bit-radio', { size });

        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });

    it('should change size dynamically', async () => {
      fixture = await createFixture('bit-radio', { size: 'sm' });

      expect(fixture.element.getAttribute('size')).toBe('sm');

      await fixture.setAttribute('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes when checked', async () => {
      fixture = await createFixture('bit-radio', { checked: true });

      expect(fixture.element.getAttribute('role')).toBe('radio');
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
    });

    it('should have proper ARIA attributes when unchecked', async () => {
      fixture = await createFixture('bit-radio');

      expect(fixture.element.getAttribute('role')).toBe('radio');
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
    });

    it('should have ARIA disabled when disabled', async () => {
      fixture = await createFixture('bit-radio', { disabled: true });

      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    });

    it('should be keyboard accessible', async () => {
      fixture = await createFixture('bit-radio');

      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });
  });
});
