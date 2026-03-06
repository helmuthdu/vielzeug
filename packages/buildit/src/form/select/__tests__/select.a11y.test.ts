import axe from 'axe-core';
import { type Fixture, mount, user } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const OPTIONS_HTML = `
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
  <option value="cherry">Cherry</option>
`;

describe('bit-select a11y', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../select');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no axe violations with label', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', name: 'fruit' },
        html: OPTIONS_HTML,
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);
    });

    it('should have no axe violations with selected value', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', name: 'fruit', value: 'apple' },
        html: OPTIONS_HTML,
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);
    });

    it('should have no axe violations with error state', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', name: 'fruit', error: 'Please select an option' },
        html: OPTIONS_HTML,
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);
    });

    it('should have no axe violations when disabled', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', name: 'fruit', disabled: true },
        html: OPTIONS_HTML,
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);
    });

    it('should have no axe violations in multiple mode', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruits', name: 'fruits', multiple: true },
        html: OPTIONS_HTML,
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Variants', () => {
    const variants = ['solid', 'flat', 'outline', 'bordered', 'ghost'] as const;

    variants.forEach((variant) => {
      it(`should have no axe violations with ${variant} variant`, async () => {
        fixture = await mount('bit-select', {
          attrs: { label: 'Fruit', name: 'fruit', variant },
          html: OPTIONS_HTML,
        });

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);
      });
    });
  });

  describe('Colors', () => {
    const colors = ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;

    colors.forEach((color) => {
      it(`should have no axe violations with ${color} color`, async () => {
        fixture = await mount('bit-select', {
          attrs: { label: 'Fruit', name: 'fruit', color },
          html: OPTIONS_HTML,
        });

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);
      });
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`should have no axe violations with ${size} size`, async () => {
        fixture = await mount('bit-select', {
          attrs: { label: 'Fruit', name: 'fruit', size },
          html: OPTIONS_HTML,
        });

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);
      });
    });
  });

  describe('ARIA Attribute Correctness', () => {
    it('should have role="combobox" on trigger field', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', name: 'fruit' },
        html: OPTIONS_HTML,
      });

      const field = fixture.query('.field');
      expect(field?.getAttribute('role')).toBe('combobox');
    });

    it('should have role="listbox" on dropdown', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', name: 'fruit' },
        html: OPTIONS_HTML,
      });

      const dropdown = fixture.query('.dropdown');
      expect(dropdown?.getAttribute('role')).toBe('listbox');
    });

    it('should have role="option" on each option when open', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', name: 'fruit' },
        html: OPTIONS_HTML,
      });

      const field = fixture.query<HTMLElement>('.field');
      await user.click(field!);

      const optionEls = fixture.queryAll('.option');
      for (const opt of optionEls) {
        expect(opt.getAttribute('role')).toBe('option');
      }
    });

    it('should have aria-expanded="false" initially', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', name: 'fruit' },
        html: OPTIONS_HTML,
      });

      const field = fixture.query('.field');
      expect(field?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should have aria-expanded="true" when open', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', name: 'fruit' },
        html: OPTIONS_HTML,
      });

      const field = fixture.query<HTMLElement>('.field');
      await user.click(field!);

      expect(field?.getAttribute('aria-expanded')).toBe('true');
    });

  });

  describe('Keyboard Accessibility', () => {
    it('should be keyboard focusable', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', name: 'fruit' },
        html: OPTIONS_HTML,
      });

      const field = fixture.query<HTMLElement>('.field');
      expect(field?.getAttribute('tabindex')).toBe('0');
    });

    it('should not be keyboard focusable when disabled', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', name: 'fruit', disabled: true },
        html: OPTIONS_HTML,
      });

      const field = fixture.query<HTMLElement>('.field');
      expect(field?.getAttribute('tabindex')).toBe('-1');
    });
  });
});
