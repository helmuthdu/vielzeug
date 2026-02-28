import { createFixture, userEvent } from '../../../utils/testing';

describe('bit-button', () => {
  beforeAll(async () => {
    await import('../button');
  });

  describe('Rendering', () => {
    it('should render with shadow DOM structure', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.textContent = 'Click me';

      const innerButton = fixture.query('button');
      const slots = fixture.queryAll('slot');

      expect(innerButton).toBeTruthy();
      expect(slots.length).toBe(3); // prefix, default, suffix

      fixture.destroy();
    });

    it('should render all slots correctly', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.innerHTML = '<span slot="prefix">←</span>Text<span slot="suffix">→</span>';

      const prefixSlot = fixture.query('slot[name="prefix"]');
      const defaultSlot = fixture.query('slot:not([name])');
      const suffixSlot = fixture.query('slot[name="suffix"]');

      expect(prefixSlot).toBeTruthy();
      expect(defaultSlot).toBeTruthy();
      expect(suffixSlot).toBeTruthy();

      fixture.destroy();
    });
  });

  describe('Variants', () => {
    it('should apply all variant types', async () => {
      const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text'];

      for (const variant of variants) {
        const fixture = await createFixture('bit-button', { variant });
        expect(fixture.element.getAttribute('variant')).toBe(variant);
        fixture.destroy();
      }
    });

    it('should update variant dynamically', async () => {
      const fixture = await createFixture('bit-button', { variant: 'solid' });

      await fixture.setAttribute('variant', 'outline');

      expect(fixture.element.getAttribute('variant')).toBe('outline');
      fixture.destroy();
    });
  });

  describe('Colors', () => {
    it('should apply all color types', async () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'];

      for (const color of colors) {
        const fixture = await createFixture('bit-button', { color });
        expect(fixture.element.getAttribute('color')).toBe(color);
        fixture.destroy();
      }
    });

    it('should update color dynamically', async () => {
      const fixture = await createFixture('bit-button', { color: 'primary' });

      await fixture.setAttribute('color', 'error');

      expect(fixture.element.getAttribute('color')).toBe('error');
      fixture.destroy();
    });
  });

  describe('Sizes', () => {
    it('should apply all size types', async () => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const fixture = await createFixture('bit-button', { size });
        expect(fixture.element.getAttribute('size')).toBe(size);
        fixture.destroy();
      }
    });

    it('should update size dynamically', async () => {
      const fixture = await createFixture('bit-button', { size: 'sm' });

      await fixture.setAttribute('size', 'lg');

      expect(fixture.element.getAttribute('size')).toBe('lg');
      fixture.destroy();
    });
  });

  describe('Disabled State', () => {
    it('should disable inner button and set aria-disabled', async () => {
      const fixture = await createFixture('bit-button', { disabled: true });
      const innerButton = fixture.query('button');

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      expect(innerButton?.hasAttribute('disabled')).toBe(true);
      expect(innerButton?.getAttribute('aria-disabled')).toBe('true');

      fixture.destroy();
    });

    it('should not emit click events when disabled', async () => {
      const fixture = await createFixture('bit-button', { disabled: true });
      const innerButton = fixture.query<HTMLButtonElement>('button');
      const clickHandler = vi.fn();

      fixture.element.addEventListener('click', clickHandler);

      // Dispatch click event directly to test preventDefault/stopPropagation
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      innerButton?.dispatchEvent(clickEvent);

      expect(clickHandler).not.toHaveBeenCalled();
      expect(clickEvent.defaultPrevented).toBe(true);
      fixture.destroy();
    });

    it('should prevent default and stop propagation when disabled', async () => {
      const fixture = await createFixture('bit-button', { disabled: true });
      const innerButton = fixture.query<HTMLButtonElement>('button');

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

      innerButton?.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      fixture.destroy();
    });

    it('should toggle disabled state', async () => {
      const fixture = await createFixture('bit-button', { disabled: true });

      await fixture.setAttribute('disabled', false);
      const innerButton = fixture.query('button');

      expect(innerButton?.hasAttribute('disabled')).toBe(false);
      expect(innerButton?.getAttribute('aria-disabled')).toBe('false');
      fixture.destroy();
    });

    it('should update aria-disabled when disabled changes', async () => {
      const fixture = await createFixture('bit-button');
      const innerButton = fixture.query('button');

      expect(innerButton?.getAttribute('aria-disabled')).toBe('false');

      await fixture.setAttribute('disabled', true);
      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
      expect(innerButton?.getAttribute('aria-disabled')).toBe('true');

      fixture.element.removeAttribute('disabled');
      await fixture.update();
      expect(fixture.element.getAttribute('aria-disabled')).toBe('false');

      fixture.destroy();
    });
  });

  describe('Loading State', () => {
    it('should show spinner, disable button, and set aria-busy', async () => {
      const fixture = await createFixture('bit-button', { loading: true });
      const innerButton = fixture.query('button');
      const loader = fixture.query('.loader');

      expect(fixture.element.hasAttribute('loading')).toBe(true);
      expect(loader).toBeTruthy();
      expect(loader?.getAttribute('aria-label')).toBe('Loading');
      expect(innerButton?.hasAttribute('disabled')).toBe(true);
      expect(innerButton?.getAttribute('aria-busy')).toBe('true');

      fixture.destroy();
    });

    it('should not emit click events when loading', async () => {
      const fixture = await createFixture('bit-button', { loading: true });
      const innerButton = fixture.query<HTMLButtonElement>('button');
      const clickHandler = vi.fn();

      fixture.element.addEventListener('click', clickHandler);

      // Dispatch click event directly to test preventDefault/stopPropagation
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      innerButton?.dispatchEvent(clickEvent);

      expect(clickHandler).not.toHaveBeenCalled();
      expect(clickEvent.defaultPrevented).toBe(true);
      fixture.destroy();
    });

    it('should prevent default and stop propagation when loading', async () => {
      const fixture = await createFixture('bit-button', { loading: true });
      const innerButton = fixture.query<HTMLButtonElement>('button');

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

      innerButton?.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      fixture.destroy();
    });

    it('should toggle loading state', async () => {
      const fixture = await createFixture('bit-button', { loading: true });

      await fixture.setAttribute('loading', false);
      const loader = fixture.query('.loader');

      expect(loader).toBeFalsy();
      fixture.destroy();
    });

    it('should update aria-busy when loading changes', async () => {
      const fixture = await createFixture('bit-button');
      const innerButton = fixture.query('button');

      expect(innerButton?.getAttribute('aria-busy')).toBe('false');

      await fixture.setAttribute('loading', true);
      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
      expect(innerButton?.getAttribute('aria-busy')).toBe('true');

      fixture.element.removeAttribute('loading');
      await fixture.update();
      expect(fixture.element.getAttribute('aria-busy')).toBe('false');

      fixture.destroy();
    });
  });

  describe('Button Types', () => {
    it('should default to button type', async () => {
      const fixture = await createFixture('bit-button');
      const innerButton = fixture.query('button');

      expect(innerButton?.getAttribute('type')).toBe('button');
      fixture.destroy();
    });

    it('should apply all button types', async () => {
      const types = ['button', 'submit', 'reset'];

      for (const type of types) {
        const fixture = await createFixture('bit-button', { type });
        const innerButton = fixture.query('button');

        expect(innerButton?.getAttribute('type')).toBe(type);
        fixture.destroy();
      }
    });

    it('should update type dynamically', async () => {
      const fixture = await createFixture('bit-button', { type: 'button' });

      await fixture.setAttribute('type', 'submit');
      const innerButton = fixture.query('button');

      expect(innerButton?.getAttribute('type')).toBe('submit');
      fixture.destroy();
    });
  });

  describe('Icon-Only Mode', () => {
    it('should apply icon-only attribute', async () => {
      const fixture = await createFixture('bit-button', { 'icon-only': true });

      expect(fixture.element.hasAttribute('icon-only')).toBe(true);
      fixture.destroy();
    });

    it('should toggle icon-only mode', async () => {
      const fixture = await createFixture('bit-button', { 'icon-only': true });

      await fixture.setAttribute('icon-only', false);

      expect(fixture.element.hasAttribute('icon-only')).toBe(false);
      fixture.destroy();
    });
  });

  describe('Rounded Mode', () => {
    it('should apply rounded attribute as boolean (default full)', async () => {
      const fixture = await createFixture('bit-button', { rounded: '' });

      expect(fixture.element.hasAttribute('rounded')).toBe(true);
      expect(fixture.element.getAttribute('rounded')).toBe('');
      fixture.destroy();
    });

    it('should apply rounded with specific theme values', async () => {
      const values = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];

      for (const value of values) {
        const fixture = await createFixture('bit-button', { rounded: value });
        expect(fixture.element.getAttribute('rounded')).toBe(value);
        fixture.destroy();
      }
    });

    it('should toggle rounded mode', async () => {
      const fixture = await createFixture('bit-button', { rounded: '' });

      await fixture.element.removeAttribute('rounded');

      expect(fixture.element.hasAttribute('rounded')).toBe(false);
      fixture.destroy();
    });

    it('should update rounded value dynamically', async () => {
      const fixture = await createFixture('bit-button', { rounded: 'lg' });

      await fixture.setAttribute('rounded', 'xl');

      expect(fixture.element.getAttribute('rounded')).toBe('xl');
      fixture.destroy();
    });
  });

  describe('Click Events', () => {
    it('should emit click event with original event in detail', async () => {
      const fixture = await createFixture('bit-button');
      const innerButton = fixture.query<HTMLButtonElement>('button');

      // biome-ignore lint/suspicious/noExplicitAny: Event detail type varies
      let eventDetail: any;
      // biome-ignore lint/suspicious/noExplicitAny: CustomEvent type
      fixture.element.addEventListener('click', (e: any) => {
        if (e.detail) {
          eventDetail = e.detail;
        }
      });

      innerButton?.click();

      expect(eventDetail).toBeDefined();
      expect(eventDetail.originalEvent).toBeDefined();
      expect(eventDetail.originalEvent.type).toBe('click');

      fixture.destroy();
    });

    it('should stop propagation on normal clicks', async () => {
      const fixture = await createFixture('bit-button');
      const innerButton = fixture.query<HTMLButtonElement>('button');

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

      innerButton?.dispatchEvent(clickEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
      fixture.destroy();
    });

    it('should not emit when disabled or loading', async () => {
      const clickHandler = vi.fn();

      // Test disabled
      const disabledFixture = await createFixture('bit-button', { disabled: true });
      disabledFixture.element.addEventListener('click', clickHandler);
      const disabledButton = disabledFixture.query<HTMLButtonElement>('button');
      const disabledEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      disabledButton?.dispatchEvent(disabledEvent);
      disabledFixture.destroy();

      // Test loading
      const loadingFixture = await createFixture('bit-button', { loading: true });
      loadingFixture.element.addEventListener('click', clickHandler);
      const loadingButton = loadingFixture.query<HTMLButtonElement>('button');
      const loadingEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      loadingButton?.dispatchEvent(loadingEvent);
      loadingFixture.destroy();

      expect(clickHandler).not.toHaveBeenCalled();
    });
  });

  describe('Combined Attributes', () => {
    it('should handle multiple attributes together', async () => {
      const fixture = await createFixture('bit-button', {
        color: 'secondary',
        rounded: true,
        size: 'lg',
        variant: 'outline',
      });

      expect(fixture.element.getAttribute('variant')).toBe('outline');
      expect(fixture.element.getAttribute('color')).toBe('secondary');
      expect(fixture.element.getAttribute('size')).toBe('lg');
      expect(fixture.element.hasAttribute('rounded')).toBe(true);

      fixture.destroy();
    });

    it('should handle icon-only with rounded', async () => {
      const fixture = await createFixture('bit-button', {
        'icon-only': true,
        rounded: true,
      });

      expect(fixture.element.hasAttribute('icon-only')).toBe(true);
      expect(fixture.element.hasAttribute('rounded')).toBe(true);

      fixture.destroy();
    });

    it('should handle disabled and loading together', async () => {
      const fixture = await createFixture('bit-button', {
        disabled: true,
        loading: true,
      });
      const innerButton = fixture.query('button');

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      expect(fixture.element.hasAttribute('loading')).toBe(true);
      expect(innerButton?.hasAttribute('disabled')).toBe(true);
      expect(innerButton?.getAttribute('aria-busy')).toBe('true');

      fixture.destroy();
    });
  });

  describe('Batch Attribute Updates', () => {
    it('should update multiple attributes at once', async () => {
      const fixture = await createFixture('bit-button');

      await fixture.setAttributes({
        color: 'error',
        disabled: true,
        size: 'lg',
        variant: 'outline',
      });

      expect(fixture.element.getAttribute('variant')).toBe('outline');
      expect(fixture.element.getAttribute('color')).toBe('error');
      expect(fixture.element.getAttribute('size')).toBe('lg');
      expect(fixture.element.hasAttribute('disabled')).toBe(true);

      fixture.destroy();
    });

    it('should handle rapid attribute changes', async () => {
      const fixture = await createFixture('bit-button', { variant: 'solid' });

      await fixture.setAttribute('variant', 'outline');
      await fixture.setAttribute('variant', 'ghost');
      await fixture.setAttribute('variant', 'text');

      expect(fixture.element.getAttribute('variant')).toBe('text');
      fixture.destroy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty button content', async () => {
      const fixture = await createFixture('bit-button');
      const innerButton = fixture.query('button');

      expect(fixture.element).toBeTruthy();
      expect(innerButton).toBeTruthy();

      fixture.destroy();
    });

    it('should handle HTML content in slots', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.innerHTML = '<strong>Bold</strong> <em>Italic</em>';

      const strong = fixture.element.querySelector('strong');
      const em = fixture.element.querySelector('em');

      expect(strong?.textContent).toBe('Bold');
      expect(em?.textContent).toBe('Italic');

      fixture.destroy();
    });

    it('should gracefully handle invalid attribute values', async () => {
      const fixture = await createFixture('bit-button', {
        color: 'invalid',
        size: 'invalid',
        variant: 'invalid',
      });
      const innerButton = fixture.query('button');

      // Component should still render
      expect(fixture.element.getAttribute('variant')).toBe('invalid');
      expect(fixture.element.getAttribute('color')).toBe('invalid');
      expect(fixture.element.getAttribute('size')).toBe('invalid');
      expect(innerButton).toBeTruthy();

      fixture.destroy();
    });
  });

  describe('Form Integration', () => {
    it('should work as submit button in forms', async () => {
      const fixture = await createFixture('bit-button', { type: 'submit' });
      fixture.element.textContent = 'Submit';

      const innerButton = fixture.query('button');
      expect(innerButton?.getAttribute('type')).toBe('submit');

      fixture.destroy();
    });

    it('should work as reset button in forms', async () => {
      const fixture = await createFixture('bit-button', { type: 'reset' });
      fixture.element.textContent = 'Reset';

      const innerButton = fixture.query('button');
      expect(innerButton?.getAttribute('type')).toBe('reset');

      fixture.destroy();
    });
  });

  describe('Complete Variant/Color Matrix', () => {
    it('should render all variant and color combinations', async () => {
      const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text'];
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'];

      for (const variant of variants) {
        for (const color of colors) {
          const fixture = await createFixture('bit-button', { color, variant });

          expect(fixture.element.getAttribute('variant')).toBe(variant);
          expect(fixture.element.getAttribute('color')).toBe(color);

          const innerButton = fixture.query('button');
          expect(innerButton).toBeTruthy();

          fixture.destroy();
        }
      }
    });
  });

  describe('Events', () => {
    it('should handle click events', async () => {
      const fixture = await createFixture('bit-button');
      const innerButton = fixture.query<HTMLButtonElement>('button');

      const clickHandler = vi.fn();
      fixture.element.addEventListener('click', clickHandler);

      if (innerButton) {
        await userEvent.click(innerButton);
      }

      expect(clickHandler).toHaveBeenCalled();
      fixture.destroy();
    });

    it('should handle keyboard events', async () => {
      const fixture = await createFixture('bit-button');
      const innerButton = fixture.query<HTMLButtonElement>('button');

      const keydownHandler = vi.fn();

      if (innerButton) {
        innerButton.addEventListener('keydown', keydownHandler);
        await userEvent.keyboard(innerButton, 'Enter');
      }

      expect(keydownHandler).toHaveBeenCalled();
      fixture.destroy();
    });
  });
});
