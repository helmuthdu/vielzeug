import { type Fixture, mount, user } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('bit-radio', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../radio');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with shadow DOM structure', async () => {
      fixture = await mount('bit-radio');

      const circle = fixture.query('.circle');
      expect(circle).toBeTruthy();
    });

    it('should render label content', async () => {
      fixture = await mount('bit-radio');
      fixture.element.textContent = 'Option 1';

      await fixture.flush();

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
        fixture = await mount('bit-radio', { attrs: { color } });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('should change color dynamically', async () => {
      fixture = await mount('bit-radio', { attrs: { color: 'primary' } });

      await fixture.attr('color', 'error');
      expect(fixture.element.getAttribute('color')).toBe('error');
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await mount('bit-radio', { attrs: { size } });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });

    it('should change size dynamically', async () => {
      fixture = await mount('bit-radio', { attrs: { size: 'sm' } });

      await fixture.attr('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  describe('States', () => {
    it('should be unchecked by default', async () => {
      fixture = await mount('bit-radio');
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('should be checked when attribute is set', async () => {
      fixture = await mount('bit-radio', { attrs: { checked: true } });
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should toggle checked state', async () => {
      fixture = await mount('bit-radio');

      expect(fixture.element.hasAttribute('checked')).toBe(false);

      await fixture.attr('checked', true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('should be disabled when attribute is set', async () => {
      fixture = await mount('bit-radio', { attrs: { disabled: true } });
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('should toggle disabled state', async () => {
      fixture = await mount('bit-radio');

      expect(fixture.element.hasAttribute('disabled')).toBe(false);

      await fixture.attr('disabled', true);
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Form Integration', () => {
    it('should expose name and value as host attributes', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'choice', value: 'option1' } });

      expect(fixture.element.getAttribute('name')).toBe('choice');
      expect(fixture.element.getAttribute('value')).toBe('option1');
    });

    it('should update name and value dynamically', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'choice1' } });

      await fixture.attr('name', 'choice2');
      expect(fixture.element.getAttribute('name')).toBe('choice2');
    });
  });

  describe('Events', () => {
    it('should emit change event when clicked', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'test', value: 'yes' } });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await user.click(fixture.element);

      expect(changeHandler).toHaveBeenCalled();
      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
      expect(event.detail.originalEvent).toBeDefined();
    });

    it('should not emit change event when disabled', async () => {
      fixture = await mount('bit-radio', { attrs: { disabled: true } });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await user.click(fixture.element);

      expect(changeHandler).not.toHaveBeenCalled();
    });

    it('should emit change event with correct details', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'option', value: 'a' } });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      fixture.element.click();

      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.checked).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should reflect checked and disabled state as host attributes', async () => {
      fixture = await mount('bit-radio', { attrs: { checked: true } });
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      fixture.destroy();
      fixture = await mount('bit-radio', { attrs: { disabled: true } });
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('should respond to keyboard interaction when enabled', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'kb-test' } });
      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, ' ');
      expect(changeHandler).toHaveBeenCalledTimes(1);
    });
  });
});
