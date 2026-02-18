import { createFixture, userEvent } from '@vielzeug/craftit/testing';

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
      innerButton?.click();

      expect(clickHandler).not.toHaveBeenCalled();
      fixture.destroy();
    });

    it('should toggle disabled state', async () => {
      const fixture = await createFixture('bit-button', { disabled: true });

      await fixture.setAttribute('disabled', false);
      const innerButton = fixture.query('button');

      expect(innerButton?.hasAttribute('disabled')).toBe(false);
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
      innerButton?.click();

      expect(clickHandler).not.toHaveBeenCalled();
      fixture.destroy();
    });

    it('should toggle loading state', async () => {
      const fixture = await createFixture('bit-button', { loading: true });

      await fixture.setAttribute('loading', false);
      const loader = fixture.query('.loader');

      expect(loader).toBeFalsy();
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
    it('should apply rounded attribute', async () => {
      const fixture = await createFixture('bit-button', { rounded: true });

      expect(fixture.element.hasAttribute('rounded')).toBe(true);
      fixture.destroy();
    });

    it('should toggle rounded mode', async () => {
      const fixture = await createFixture('bit-button', { rounded: true });

      await fixture.setAttribute('rounded', false);

      expect(fixture.element.hasAttribute('rounded')).toBe(false);
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

    it('should not emit when disabled or loading', async () => {
      const clickHandler = vi.fn();

      // Test disabled
      const disabledFixture = await createFixture('bit-button', { disabled: true });
      disabledFixture.element.addEventListener('click', clickHandler);
      disabledFixture.query<HTMLButtonElement>('button')?.click();
      disabledFixture.destroy();

      // Test loading
      const loadingFixture = await createFixture('bit-button', { loading: true });
      loadingFixture.element.addEventListener('click', clickHandler);
      loadingFixture.query<HTMLButtonElement>('button')?.click();
      loadingFixture.destroy();

      expect(clickHandler).not.toHaveBeenCalled();
    });
  });

  describe('Combined Attributes', () => {
    it('should handle multiple attributes together', async () => {
      const fixture = await createFixture('bit-button', {
        variant: 'outline',
        color: 'secondary',
        size: 'lg',
        rounded: true,
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
        variant: 'outline',
        color: 'error',
        size: 'lg',
        disabled: true,
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
        variant: 'invalid',
        color: 'invalid',
        size: 'invalid',
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
          const fixture = await createFixture('bit-button', { variant, color });

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

