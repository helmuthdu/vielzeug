import { mount, user } from '@vielzeug/craftit/test';

describe('bit-button', () => {
  beforeAll(async () => {
    await import('../button');
  });

  describe('Rendering', () => {
    it('should render with shadow DOM structure', async () => {
      const fixture = await mount('bit-button');
      fixture.element.textContent = 'Click me';

      const innerButton = fixture.query('button');
      const slots = fixture.queryAll('slot');

      expect(innerButton).toBeTruthy();
      expect(slots.length).toBe(3); // prefix, default, suffix

      fixture.destroy();
    });

    it('should render all slots correctly', async () => {
      const fixture = await mount('bit-button');
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
        const fixture = await mount('bit-button', { attrs: { variant } });
        expect(fixture.element.getAttribute('variant')).toBe(variant);
        fixture.destroy();
      }
    });

    it('should update variant dynamically', async () => {
      const fixture = await mount('bit-button', { attrs: { variant: 'solid' } });

      await fixture.attr('variant', 'outline');

      expect(fixture.element.getAttribute('variant')).toBe('outline');
      fixture.destroy();
    });
  });

  describe('Colors', () => {
    it('should apply all color types', async () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'];

      for (const color of colors) {
        const fixture = await mount('bit-button', { attrs: { color } });
        expect(fixture.element.getAttribute('color')).toBe(color);
        fixture.destroy();
      }
    });

    it('should update color dynamically', async () => {
      const fixture = await mount('bit-button', { attrs: { color: 'primary' } });

      await fixture.attr('color', 'error');

      expect(fixture.element.getAttribute('color')).toBe('error');
      fixture.destroy();
    });
  });

  describe('Sizes', () => {
    it('should apply all size types', async () => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const fixture = await mount('bit-button', { attrs: { size } });
        expect(fixture.element.getAttribute('size')).toBe(size);
        fixture.destroy();
      }
    });

    it('should update size dynamically', async () => {
      const fixture = await mount('bit-button', { attrs: { size: 'sm' } });

      await fixture.attr('size', 'lg');

      expect(fixture.element.getAttribute('size')).toBe('lg');
      fixture.destroy();
    });
  });

  describe('Disabled State', () => {
    it('should disable inner button and set aria-disabled', async () => {
      const fixture = await mount('bit-button', { attrs: { disabled: true } });
      const innerButton = fixture.query('button');

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      expect(innerButton?.hasAttribute('disabled')).toBe(true);
      expect(innerButton?.getAttribute('aria-disabled')).toBe('true');

      fixture.destroy();
    });

    it('should not emit click events when disabled', async () => {
      const fixture = await mount('bit-button', { attrs: { disabled: true } });
      const innerButton = fixture.query<HTMLButtonElement>('button');
      const clickHandler = vi.fn();

      fixture.element.addEventListener('click', clickHandler);

      // Dispatch click event directly - guard prevents custom event emission
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      innerButton?.dispatchEvent(clickEvent);

      expect(clickHandler).not.toHaveBeenCalled();
      fixture.destroy();
    });

    it('should have inner button disabled when disabled', async () => {
      const fixture = await mount('bit-button', { attrs: { disabled: true } });
      const innerButton = fixture.query<HTMLButtonElement>('button');

      expect(innerButton?.hasAttribute('disabled')).toBe(true);
      expect(innerButton?.getAttribute('aria-disabled')).toBe('true');
      fixture.destroy();
    });

    it('should toggle disabled state', async () => {
      const fixture = await mount('bit-button', { attrs: { disabled: true } });

      await fixture.attr('disabled', false);
      const innerButton = fixture.query('button');

      expect(innerButton?.hasAttribute('disabled')).toBe(false);
      expect(innerButton?.getAttribute('aria-disabled')).toBe('false');
      fixture.destroy();
    });

    it('should update aria-disabled when disabled changes', async () => {
      const fixture = await mount('bit-button');
      const innerButton = fixture.query('button');

      expect(innerButton?.getAttribute('aria-disabled')).toBe('false');

      await fixture.attr('disabled', true);
      expect(innerButton?.getAttribute('aria-disabled')).toBe('true');

      fixture.element.removeAttribute('disabled');
      await fixture.flush();
      expect(innerButton?.getAttribute('aria-disabled')).toBe('false');

      fixture.destroy();
    });
  });

  describe('Loading State', () => {
    it('should show spinner, disable button, and set aria-busy', async () => {
      const fixture = await mount('bit-button', { attrs: { loading: true } });
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
      const fixture = await mount('bit-button', { attrs: { loading: true } });
      const innerButton = fixture.query<HTMLButtonElement>('button');
      const clickHandler = vi.fn();

      fixture.element.addEventListener('click', clickHandler);

      // Dispatch click event directly - guard prevents custom event emission
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      innerButton?.dispatchEvent(clickEvent);

      expect(clickHandler).not.toHaveBeenCalled();
      fixture.destroy();
    });

    it('should have inner button disabled when loading', async () => {
      const fixture = await mount('bit-button', { attrs: { loading: true } });
      const innerButton = fixture.query<HTMLButtonElement>('button');

      expect(innerButton?.hasAttribute('disabled')).toBe(true);
      expect(innerButton?.getAttribute('aria-busy')).toBe('true');
      fixture.destroy();
    });

    it('should toggle loading state', async () => {
      const fixture = await mount('bit-button', { attrs: { loading: true } });

      await fixture.attr('loading', false);
      const loader = fixture.query('.loader');

      expect(loader?.hasAttribute('hidden')).toBe(true);
      fixture.destroy();
    });

    it('should update aria-busy when loading changes', async () => {
      const fixture = await mount('bit-button');
      const innerButton = fixture.query('button');

      expect(innerButton?.getAttribute('aria-busy')).toBe('false');

      await fixture.attr('loading', true);
      expect(innerButton?.getAttribute('aria-busy')).toBe('true');

      fixture.element.removeAttribute('loading');
      await fixture.flush();
      expect(innerButton?.getAttribute('aria-busy')).toBe('false');

      fixture.destroy();
    });
  });

  describe('Button Types', () => {
    it('should default to button type', async () => {
      const fixture = await mount('bit-button');
      const innerButton = fixture.query('button');

      expect(innerButton?.getAttribute('type')).toBe('button');
      fixture.destroy();
    });

    it('should apply all button types', async () => {
      const types = ['button', 'submit', 'reset'];

      for (const type of types) {
        const fixture = await mount('bit-button', { attrs: { type } });
        const innerButton = fixture.query('button');

        expect(innerButton?.getAttribute('type')).toBe(type);
        fixture.destroy();
      }
    });

    it('should update type dynamically', async () => {
      const fixture = await mount('bit-button', { attrs: { type: 'button' } });

      await fixture.attr('type', 'submit');
      const innerButton = fixture.query('button');

      expect(innerButton?.getAttribute('type')).toBe('submit');
      fixture.destroy();
    });
  });

  describe('Icon-Only Mode', () => {
    it('should apply icon-only attribute', async () => {
      const fixture = await mount('bit-button', { attrs: { 'icon-only': true } });

      expect(fixture.element.hasAttribute('icon-only')).toBe(true);
      fixture.destroy();
    });

    it('should toggle icon-only mode', async () => {
      const fixture = await mount('bit-button', { attrs: { 'icon-only': true } });

      await fixture.attr('icon-only', false);

      expect(fixture.element.hasAttribute('icon-only')).toBe(false);
      fixture.destroy();
    });
  });

  describe('Rounded Mode', () => {
    it('should apply rounded attribute as boolean (default full)', async () => {
      const fixture = await mount('bit-button', { attrs: { rounded: '' } });

      expect(fixture.element.hasAttribute('rounded')).toBe(true);
      expect(fixture.element.getAttribute('rounded')).toBe('');
      fixture.destroy();
    });

    it('should apply rounded with specific theme values', async () => {
      const values = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];

      for (const value of values) {
        const fixture = await mount('bit-button', { attrs: { rounded: value } });
        expect(fixture.element.getAttribute('rounded')).toBe(value);
        fixture.destroy();
      }
    });

    it('should toggle rounded mode', async () => {
      const fixture = await mount('bit-button', { attrs: { rounded: '' } });

      await fixture.element.removeAttribute('rounded');

      expect(fixture.element.hasAttribute('rounded')).toBe(false);
      fixture.destroy();
    });

    it('should update rounded value dynamically', async () => {
      const fixture = await mount('bit-button', { attrs: { rounded: 'lg' } });

      await fixture.attr('rounded', 'xl');

      expect(fixture.element.getAttribute('rounded')).toBe('xl');
      fixture.destroy();
    });
  });

  describe('Click Events', () => {
    it('should emit click event with original event in detail', async () => {
      const fixture = await mount('bit-button');
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
      const fixture = await mount('bit-button');
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
      const disabledFixture = await mount('bit-button', { attrs: { disabled: true } });
      disabledFixture.element.addEventListener('click', clickHandler);
      const disabledButton = disabledFixture.query<HTMLButtonElement>('button');
      const disabledEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      disabledButton?.dispatchEvent(disabledEvent);
      disabledFixture.destroy();

      // Test loading
      const loadingFixture = await mount('bit-button', { attrs: { loading: true } });
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
      const fixture = await mount('bit-button', {
        attrs: {
          color: 'secondary',
          rounded: true,
          size: 'lg',
          variant: 'outline',
        },
      });

      expect(fixture.element.getAttribute('variant')).toBe('outline');
      expect(fixture.element.getAttribute('color')).toBe('secondary');
      expect(fixture.element.getAttribute('size')).toBe('lg');
      expect(fixture.element.hasAttribute('rounded')).toBe(true);

      fixture.destroy();
    });

    it('should handle icon-only with rounded', async () => {
      const fixture = await mount('bit-button', {
        attrs: {
          'icon-only': true,
          rounded: true,
        },
      });

      expect(fixture.element.hasAttribute('icon-only')).toBe(true);
      expect(fixture.element.hasAttribute('rounded')).toBe(true);

      fixture.destroy();
    });

    it('should handle disabled and loading together', async () => {
      const fixture = await mount('bit-button', {
        attrs: {
          disabled: true,
          loading: true,
        },
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
      const fixture = await mount('bit-button');

      await fixture.attrs({
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
      const fixture = await mount('bit-button', { attrs: { variant: 'solid' } });

      await fixture.attr('variant', 'outline');
      await fixture.attr('variant', 'ghost');
      await fixture.attr('variant', 'text');

      expect(fixture.element.getAttribute('variant')).toBe('text');
      fixture.destroy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty button content', async () => {
      const fixture = await mount('bit-button');
      const innerButton = fixture.query('button');

      expect(fixture.element).toBeTruthy();
      expect(innerButton).toBeTruthy();

      fixture.destroy();
    });

    it('should handle HTML content in slots', async () => {
      const fixture = await mount('bit-button');
      fixture.element.innerHTML = '<strong>Bold</strong> <em>Italic</em>';

      const strong = fixture.element.querySelector('strong');
      const em = fixture.element.querySelector('em');

      expect(strong?.textContent).toBe('Bold');
      expect(em?.textContent).toBe('Italic');

      fixture.destroy();
    });

    it('should gracefully handle invalid attribute values', async () => {
      const fixture = await mount('bit-button', {
        attrs: {
          color: 'invalid',
          size: 'invalid',
          variant: 'invalid',
        },
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
      const fixture = await mount('bit-button', { attrs: { type: 'submit' } });
      fixture.element.textContent = 'Submit';

      const innerButton = fixture.query('button');
      expect(innerButton?.getAttribute('type')).toBe('submit');

      fixture.destroy();
    });

    it('should work as reset button in forms', async () => {
      const fixture = await mount('bit-button', { attrs: { type: 'reset' } });
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
          const fixture = await mount('bit-button', { attrs: { color, variant } });

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
      const fixture = await mount('bit-button');
      const innerButton = fixture.query<HTMLButtonElement>('button');

      const clickHandler = vi.fn();
      fixture.element.addEventListener('click', clickHandler);

      if (innerButton) {
        await user.click(innerButton);
      }

      expect(clickHandler).toHaveBeenCalled();
      fixture.destroy();
    });

    it('should handle keyboard events', async () => {
      const fixture = await mount('bit-button');
      const innerButton = fixture.query<HTMLButtonElement>('button');

      const keydownHandler = vi.fn();

      if (innerButton) {
        innerButton.addEventListener('keydown', keydownHandler);
        await user.press(innerButton, 'Enter');
      }

      expect(keydownHandler).toHaveBeenCalled();
      fixture.destroy();
    });
  });
});
