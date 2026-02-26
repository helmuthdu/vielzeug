import { createFixture } from '@vielzeug/craftit/testing';
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
      const fixture = await createFixture('bit-input', {
        name: 'test-input',
        placeholder: 'Enter text',
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with all states', async () => {
      const fixture = await createFixture('bit-input', {
        disabled: true,
        placeholder: 'Enter text',
        required: true,
        value: 'Test value',
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with inset label', async () => {
      const fixture = await createFixture('bit-input', {
        label: 'Email Address',
        'label-placement': 'inset',
        placeholder: 'you@example.com',
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with outside label', async () => {
      const fixture = await createFixture('bit-input', {
        label: 'Username',
        'label-placement': 'outside',
        placeholder: 'Enter username',
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with helper text', async () => {
      const fixture = await createFixture('bit-input', {
        helper: 'Must be at least 8 characters',
        label: 'Password',
        type: 'password',
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const fixture = await createFixture('bit-input');
      const input = fixture.query('input') as HTMLInputElement;

      // Input should not have tabindex -1 (should be naturally focusable)
      expect(input.tabIndex).not.toBe(-1);

      fixture.destroy();
    });

    it('should not be focusable when disabled', async () => {
      const fixture = await createFixture('bit-input', { disabled: true });
      const input = fixture.query('input') as HTMLInputElement;

      expect(input.disabled).toBe(true);

      fixture.destroy();
    });

    it('should handle readonly state accessibly', async () => {
      const fixture = await createFixture('bit-input', {
        label: 'Read-only Field',
        readonly: true,
        value: 'Read-only value',
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
        const fixture = await createFixture('bit-input', {
          placeholder: `Enter ${type}`,
          type,
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
        const fixture = await createFixture('bit-input', {
          placeholder: 'Test input',
          variant,
        });

        const results = await axe.run(fixture.element);
        expect(results.violations, `variant="${variant}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });

    it('should have no violations for all colors', async () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'];

      for (const color of colors) {
        const fixture = await createFixture('bit-input', {
          color,
          placeholder: 'Test input',
        });

        const results = await axe.run(fixture.element);
        expect(results.violations, `color="${color}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });

    it('should have no violations for all sizes', async () => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const fixture = await createFixture('bit-input', {
          placeholder: 'Test input',
          size,
        });

        const results = await axe.run(fixture.element);
        expect(results.violations, `size="${size}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('Prefix and Suffix Icons', () => {
    it('should have no violations with prefix icon', async () => {
      const fixture = await createFixture('bit-input', {
        label: 'Search',
        placeholder: 'Search...',
      });
      fixture.element.innerHTML = `
        <span slot="prefix" class="material-symbols-rounded" aria-hidden="true">search</span>
      `;

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with suffix icon', async () => {
      const fixture = await createFixture('bit-input', {
        label: 'Amount',
        placeholder: 'Enter amount',
      });
      fixture.element.innerHTML = `
        <span slot="suffix" aria-hidden="true">USD</span>
      `;

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with both prefix and suffix', async () => {
      const fixture = await createFixture('bit-input', {
        label: 'Price',
        placeholder: 'Enter amount',
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
      const fixture = await createFixture('bit-input', {
        label: 'Search',
        placeholder: 'Search...',
        rounded: '',
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with rounded theme values', async () => {
      const values = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];

      for (const value of values) {
        const fixture = await createFixture('bit-input', {
          label: 'Test Input',
          placeholder: 'Test input',
          rounded: value,
        });

        const results = await axe.run(fixture.element);
        expect(results.violations, `rounded="${value}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('Required Fields', () => {
    it('should properly indicate required fields', async () => {
      const fixture = await createFixture('bit-input', {
        label: 'Email',
        placeholder: 'you@example.com',
        required: true,
      });

      const input = fixture.query('input') as HTMLInputElement;
      expect(input.required).toBe(true);

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });
});

