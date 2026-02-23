import { createFixture } from '@vielzeug/craftit/testing';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Accessibility tests for bit-checkbox component using axe-core
 * Tests WCAG 2.1 Level AA compliance
 */
describe('bit-checkbox accessibility', () => {
  beforeAll(async () => {
    await import('../checkbox');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations', async () => {
      const fixture = await createFixture('bit-checkbox');
      fixture.element.textContent = 'Accept terms';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when checked', async () => {
      const fixture = await createFixture('bit-checkbox', { checked: true });
      fixture.element.textContent = 'I agree';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when disabled', async () => {
      const fixture = await createFixture('bit-checkbox', { disabled: true });
      fixture.element.textContent = 'Disabled option';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have mixed state when indeterminate', async () => {
      const fixture = await createFixture('bit-checkbox', { indeterminate: true });
      fixture.element.textContent = 'Partially selected';

      expect(fixture.element.getAttribute('aria-checked')).toBe('mixed');

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Colors and Sizes', () => {
    it('should have no violations for all colors', async () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'];

      for (const color of colors) {
        const fixture = await createFixture('bit-checkbox', { color });
        fixture.element.textContent = `${color} checkbox`;

        const results = await axe.run(fixture.element);
        expect(results.violations, `color="${color}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });

    it('should have no violations for all sizes', async () => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const fixture = await createFixture('bit-checkbox', { size });
        fixture.element.textContent = `${size} checkbox`;

        const results = await axe.run(fixture.element);
        expect(results.violations, `size="${size}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const fixture = await createFixture('bit-checkbox');
      fixture.element.textContent = 'Keyboard accessible';

      expect(fixture.element.getAttribute('tabindex')).toBe('0');
      expect(fixture.element.getAttribute('role')).toBe('checkbox');

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should not be focusable when disabled', async () => {
      const fixture = await createFixture('bit-checkbox', { disabled: true });
      fixture.element.textContent = 'Not focusable';

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');

      fixture.destroy();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have proper ARIA attributes for all states', async () => {
      // Unchecked
      const fixture1 = await createFixture('bit-checkbox');
      fixture1.element.textContent = 'Unchecked';
      expect(fixture1.element.getAttribute('aria-checked')).toBe('false');
      fixture1.destroy();

      // Checked
      const fixture2 = await createFixture('bit-checkbox', { checked: true });
      fixture2.element.textContent = 'Checked';
      expect(fixture2.element.getAttribute('aria-checked')).toBe('true');
      fixture2.destroy();

      // Indeterminate
      const fixture3 = await createFixture('bit-checkbox', { indeterminate: true });
      fixture3.element.textContent = 'Indeterminate';
      expect(fixture3.element.getAttribute('aria-checked')).toBe('mixed');
      fixture3.destroy();

      // Disabled
      const fixture4 = await createFixture('bit-checkbox', { disabled: true });
      fixture4.element.textContent = 'Disabled';
      expect(fixture4.element.getAttribute('aria-disabled')).toBe('true');
      fixture4.destroy();
    });
  });
});

