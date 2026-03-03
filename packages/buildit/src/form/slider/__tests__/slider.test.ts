import { type Fixture, mount, user, waitForEvent } from '@vielzeug/craftit/test';

describe('bit-slider', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../slider');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with required shadow DOM elements', async () => {
      fixture = await mount('bit-slider');

      expect(fixture.query('.slider-container')).toBeTruthy();
      expect(fixture.query('.slider-track')).toBeTruthy();
      expect(fixture.query('.slider-fill')).toBeTruthy();
      expect(fixture.query('.slider-thumb')).toBeTruthy();
      expect(fixture.query('slot')).toBeTruthy();
    });

    it('should render with label content', async () => {
      fixture = await mount('bit-slider');
      fixture.element.textContent = 'Volume';

      expect(fixture.element.textContent).toBe('Volume');
    });

    it('should render hidden input for form integration', async () => {
      fixture = await mount('bit-slider', { attrs: { name: 'volume', value: '50' } });
      const input = fixture.query('input');

      expect(input).toBeTruthy();
      expect(input?.getAttribute('aria-hidden')).toBe('true');
      expect(input?.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('Value Management', () => {
    it('should have default min, max, and value', async () => {
      fixture = await mount('bit-slider');

      expect(fixture.element.getAttribute('aria-valuemin')).toBe('0');
      expect(fixture.element.getAttribute('aria-valuemax')).toBe('100');
      expect(fixture.element.getAttribute('aria-valuenow')).toBe('0');
    });

    it('should set initial value', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '50' } });

      expect(fixture.element.getAttribute('value')).toBe('50');
      expect(fixture.element.getAttribute('aria-valuenow')).toBe('50');
    });

    it('should set custom min and max', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '90', min: '10' } });

      expect(fixture.element.getAttribute('aria-valuemin')).toBe('10');
      expect(fixture.element.getAttribute('aria-valuemax')).toBe('90');
    });

    it('should update progress CSS variable on initial render', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '100', min: '0', value: '50' } });

      const progress = fixture.element.style.getPropertyValue('--_progress');
      expect(progress).toBe('50%');
    });

    it('should update progress for different value ranges', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '200', min: '0', value: '100' } });

      const progress = fixture.element.style.getPropertyValue('--_progress');
      expect(progress).toBe('50%');
    });
  });

  describe('Keyboard Interaction', () => {
    it('should increase value with ArrowRight', async () => {
      fixture = await mount('bit-slider', { attrs: { step: '10', value: '50' } });
      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, 'ArrowRight');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('60');
      expect(changeHandler).toHaveBeenCalled();
    });

    it('should increase value with ArrowUp', async () => {
      fixture = await mount('bit-slider', { attrs: { step: '5', value: '50' } });

      await user.press(fixture.element, 'ArrowUp');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('55');
    });

    it('should decrease value with ArrowLeft', async () => {
      fixture = await mount('bit-slider', { attrs: { step: '10', value: '50' } });

      await user.press(fixture.element, 'ArrowLeft');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('40');
    });

    it('should decrease value with ArrowDown', async () => {
      fixture = await mount('bit-slider', { attrs: { step: '5', value: '50' } });

      await user.press(fixture.element, 'ArrowDown');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('45');
    });

    it('should set to min with Home key', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '100', min: '10', value: '50' } });

      await user.press(fixture.element, 'Home');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('10');
    });

    it('should set to max with End key', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '90', min: '0', value: '50' } });

      await user.press(fixture.element, 'End');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('90');
    });

    it('should respect step size', async () => {
      fixture = await mount('bit-slider', { attrs: { step: '25', value: '0' } });

      await user.press(fixture.element, 'ArrowRight');
      expect(fixture.element.getAttribute('aria-valuenow')).toBe('25');

      await user.press(fixture.element, 'ArrowRight');
      expect(fixture.element.getAttribute('aria-valuenow')).toBe('50');
    });

    it('should not exceed max with keyboard', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '100', step: '10', value: '95' } });

      await user.press(fixture.element, 'ArrowRight');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('100');
    });

    it('should not go below min with keyboard', async () => {
      fixture = await mount('bit-slider', { attrs: { min: '0', step: '10', value: '5' } });

      await user.press(fixture.element, 'ArrowLeft');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('0');
    });
  });

  describe('Disabled State', () => {
    it('should apply disabled state', async () => {
      fixture = await mount('bit-slider', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });

    it('should prevent keyboard interaction when disabled', async () => {
      fixture = await mount('bit-slider', { attrs: { disabled: true, value: '50' } });
      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, 'ArrowRight');

      expect(changeHandler).not.toHaveBeenCalled();
      expect(fixture.element.getAttribute('aria-valuenow')).toBe('50');
    });

    it('should sync disabled state with ARIA', async () => {
      fixture = await mount('bit-slider', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });
  });

  describe('Events', () => {
    it('should emit change event with correct detail', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '50' } });
      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, 'ArrowRight');

      expect(changeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            originalEvent: expect.any(Object),
            value: 51,
          }),
        }),
      );
    });

    it('should emit event asynchronously', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '20' } });

      const eventPromise = waitForEvent(fixture.element, 'change');
      await user.press(fixture.element, 'ArrowUp');
      const event = (await eventPromise) as CustomEvent;

      expect(event.type).toBe('change');
      expect(event.detail.value).toBe(21);
    });

    it('should not emit event if value does not change', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '100', value: '100' } });
      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, 'ArrowRight');

      expect(changeHandler).not.toHaveBeenCalled();
    });
  });

  describe('Color Variants', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await mount('bit-slider', { attrs: { color } });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });
  });

  describe('Size Variants', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await mount('bit-slider', { attrs: { size } });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role', async () => {
      fixture = await mount('bit-slider');

      expect(fixture.element.getAttribute('role')).toBe('slider');
    });

    it('should be keyboard accessible', async () => {
      fixture = await mount('bit-slider');

      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });

    it('should not be keyboard accessible when disabled', async () => {
      fixture = await mount('bit-slider', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });

    it('should have proper ARIA attributes', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '95', min: '5', value: '50' } });

      expect(fixture.element.getAttribute('role')).toBe('slider');
      expect(fixture.element.getAttribute('aria-valuemin')).toBe('5');
      expect(fixture.element.getAttribute('aria-valuemax')).toBe('95');
      expect(fixture.element.getAttribute('aria-valuenow')).toBe('50');
    });
  });

  describe('Form Integration', () => {
    it('should include name attribute for form submission', async () => {
      fixture = await mount('bit-slider', { attrs: { name: 'volume', value: '50' } });

      expect(fixture.element.getAttribute('name')).toBe('volume');
      expect(fixture.element.getAttribute('value')).toBe('50');
    });
  });

  describe('Step Attribute', () => {
    it('should use default step of 1', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '50' } });

      await user.press(fixture.element, 'ArrowRight');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('51');
    });

    it('should respect custom step', async () => {
      fixture = await mount('bit-slider', { attrs: { step: '5', value: '0' } });

      await user.press(fixture.element, 'ArrowRight');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('5');
    });

    it('should work with decimal steps', async () => {
      fixture = await mount('bit-slider', { attrs: { step: '0.5', value: '0' } });

      await user.press(fixture.element, 'ArrowRight');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('0.5');
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative min values', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '50', min: '-50', value: '0' } });

      expect(fixture.element.getAttribute('aria-valuemin')).toBe('-50');
      expect(fixture.element.getAttribute('aria-valuemax')).toBe('50');
      expect(fixture.element.getAttribute('aria-valuenow')).toBe('0');
    });

    it('should handle large value ranges', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '10000', min: '0', value: '5000' } });

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('5000');
    });

    it('should handle min equals max', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '50', min: '50', value: '50' } });
      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, 'ArrowRight');

      expect(changeHandler).not.toHaveBeenCalled();
      expect(fixture.element.getAttribute('aria-valuenow')).toBe('50');
    });
  });
});
