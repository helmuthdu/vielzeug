import { mount } from '@vielzeug/craftit/test';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Accessibility tests for a bit-checkbox component using axe-core
 * Tests WCAG 2.1 Level AA compliance
 */
describe('bit-checkbox accessibility', () => {
  beforeAll(async () => {
    await import('../checkbox');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations', async () => {
      const fixture = await mount('bit-checkbox');
      fixture.element.textContent = 'Accept terms';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when checked', async () => {
      const fixture = await mount('bit-checkbox', { attrs: { checked: true } });
      fixture.element.textContent = 'I agree';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when disabled', async () => {
      const fixture = await mount('bit-checkbox', { attrs: { disabled: true } });
      fixture.element.textContent = 'Disabled option';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have mixed state when indeterminate', async () => {
      const fixture = await mount('bit-checkbox', { attrs: { indeterminate: true } });
      fixture.element.textContent = 'Partially selected';

      expect(fixture.element.hasAttribute('indeterminate')).toBe(true);

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Colors and Sizes', () => {
    it('should have no violations for all colors', async () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'];

      for (const color of colors) {
        const fixture = await mount('bit-checkbox', { attrs: { color } });
        fixture.element.textContent = `${color} checkbox`;

        const results = await axe.run(fixture.element);
        expect(results.violations, `color="${color}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });

    it('should have no violations for all sizes', async () => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const fixture = await mount('bit-checkbox', { attrs: { size } });
        fixture.element.textContent = `${size} checkbox`;

        const results = await axe.run(fixture.element);
        expect(results.violations, `size="${size}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const fixture = await mount('bit-checkbox');
      fixture.element.textContent = 'Keyboard accessible';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should not be focusable when disabled', async () => {
      const fixture = await mount('bit-checkbox', { attrs: { disabled: true } });
      fixture.element.textContent = 'Not focusable';

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      expect(fixture.element.hasAttribute('tabindex')).toBe(false);

      fixture.destroy();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have proper ARIA attributes for all states', async () => {
      // Unchecked
      const fixture1 = await mount('bit-checkbox');
      fixture1.element.textContent = 'Unchecked';
      expect(fixture1.element.hasAttribute('checked')).toBe(false);
      fixture1.destroy();

      // Checked
      const fixture2 = await mount('bit-checkbox', { attrs: { checked: true } });
      fixture2.element.textContent = 'Checked';
      expect(fixture2.element.hasAttribute('checked')).toBe(true);
      fixture2.destroy();

      // Indeterminate
      const fixture3 = await mount('bit-checkbox', { attrs: { indeterminate: true } });
      fixture3.element.textContent = 'Indeterminate';
      expect(fixture3.element.hasAttribute('indeterminate')).toBe(true);
      fixture3.destroy();

      // Disabled
      const fixture4 = await mount('bit-checkbox', { attrs: { disabled: true } });
      fixture4.element.textContent = 'Disabled';
      expect(fixture4.element.hasAttribute('disabled')).toBe(true);
      fixture4.destroy();
    });
  });
});
