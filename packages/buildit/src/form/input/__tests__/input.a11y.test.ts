import { mount } from '@vielzeug/craftit/test';
import axe from 'axe-core';

/**
 * Accessibility tests for bit-input component using axe-core
 * Tests WCAG 2.1 Level AA compliance
 */
describe('bit-input accessibility', () => {
  beforeAll(async () => {
    await import('../input');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations', async () => {
      const fixture = await mount('bit-input', {
        attrs: {
          label: 'Test input',
          'label-placement': 'outside',
          name: 'test-input',
          placeholder: 'Enter text',
        },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with all states', async () => {
      const fixture = await mount('bit-input', {
        attrs: {
          disabled: true,
          label: 'Test input',
          'label-placement': 'outside',
          placeholder: 'Enter text',
          required: true,
          value: 'Test value',
        },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with inset label', async () => {
      const fixture = await mount('bit-input', {
        attrs: {
          label: 'Email Address',
          'label-placement': 'outside',
          placeholder: 'you@example.com',
        },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with outside label', async () => {
      const fixture = await mount('bit-input', {
        attrs: {
          label: 'Username',
          'label-placement': 'outside',
          placeholder: 'Enter username',
        },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with helper text', async () => {
      const fixture = await mount('bit-input', {
        attrs: {
          helper: 'Must be at least 8 characters',
          label: 'Password',
          'label-placement': 'outside',
          type: 'password',
        },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const fixture = await mount('bit-input', { attrs: { 'aria-label': 'Test input' } });
      const input = fixture.query('input') as HTMLInputElement;

      // Input should not have tabindex -1 (should be naturally focusable)
      expect(input.tabIndex).not.toBe(-1);

      fixture.destroy();
    });

    it('should not be focusable when disabled', async () => {
      const fixture = await mount('bit-input', { attrs: { 'aria-label': 'Test input', disabled: true } });
      const input = fixture.query('input') as HTMLInputElement;

      expect(input.disabled).toBe(true);

      fixture.destroy();
    });

    it('should handle readonly state accessibly', async () => {
      const fixture = await mount('bit-input', {
        attrs: {
          label: 'Read-only Field',
          'label-placement': 'outside',
          readonly: true,
          value: 'Read-only value',
        },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Input Types', () => {
    it('should handle all input types accessibly', async () => {
      const types = ['text', 'email', 'password', 'search', 'url', 'tel', 'number'];

      for (const type of types) {
        const fixture = await mount('bit-input', {
          attrs: {
            'aria-label': `Enter ${type}`,
            label: `Enter ${type}`,
            'label-placement': 'outside',
            placeholder: `Enter ${type}`,
            type,
          },
        });

        const results = await axe.run(fixture.element);
        expect(results.violations, `type="${type}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('Variants and Colors', () => {
    it('should have no violations for all variants', async () => {
      const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text', 'frost'];

      for (const variant of variants) {
        const fixture = await mount('bit-input', {
          attrs: {
            label: 'Test input',
            'label-placement': 'outside',
            placeholder: 'Test input',
            variant,
          },
        });

        const results = await axe.run(fixture.element);
        expect(results.violations, `variant="${variant}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });

    it('should have no violations for all colors', async () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'];

      for (const color of colors) {
        const fixture = await mount('bit-input', {
          attrs: {
            color,
            label: 'Test input',
            'label-placement': 'outside',
            placeholder: 'Test input',
          },
        });

        const results = await axe.run(fixture.element);
        expect(results.violations, `color="${color}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });

    it('should have no violations for all sizes', async () => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const fixture = await mount('bit-input', {
          attrs: {
            label: 'Test input',
            'label-placement': 'outside',
            placeholder: 'Test input',
            size,
          },
        });

        const results = await axe.run(fixture.element);
        expect(results.violations, `size="${size}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('Prefix and Suffix Icons', () => {
    it('should have no violations with prefix icon', async () => {
      const fixture = await mount('bit-input', {
        attrs: {
          label: 'Search',
          'label-placement': 'outside',
          placeholder: 'Search...',
        },
      });
      fixture.element.innerHTML = `
        <span slot="prefix" class="material-symbols-rounded" aria-hidden="true">search</span>
      `;

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with suffix icon', async () => {
      const fixture = await mount('bit-input', {
        attrs: {
          label: 'Amount',
          'label-placement': 'outside',
          placeholder: 'Enter amount',
        },
      });
      fixture.element.innerHTML = `
        <span slot="suffix" aria-hidden="true">USD</span>
      `;

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with both prefix and suffix', async () => {
      const fixture = await mount('bit-input', {
        attrs: {
          label: 'Price',
          'label-placement': 'outside',
          placeholder: 'Enter amount',
        },
      });
      fixture.element.innerHTML = `
        <span slot="prefix" aria-hidden="true">$</span>
        <span slot="suffix" aria-hidden="true">USD</span>
      `;

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Rounded Attribute', () => {
    it('should have no violations with rounded (default full)', async () => {
      const fixture = await mount('bit-input', {
        attrs: {
          label: 'Search',
          'label-placement': 'outside',
          placeholder: 'Search...',
          rounded: '',
        },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with rounded theme values', async () => {
      const values = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];

      for (const value of values) {
        const fixture = await mount('bit-input', {
          attrs: {
            label: 'Test Input',
            'label-placement': 'outside',
            placeholder: 'Test input',
            rounded: value,
          },
        });

        const results = await axe.run(fixture.element);
        expect(results.violations, `rounded="${value}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('Required Fields', () => {
    it('should properly indicate required fields', async () => {
      const fixture = await mount('bit-input', {
        attrs: {
          label: 'Email',
          'label-placement': 'outside',
          placeholder: 'you@example.com',
          required: true,
        },
      });

      const input = fixture.query('input') as HTMLInputElement;
      expect(input.required).toBe(true);

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });
});
