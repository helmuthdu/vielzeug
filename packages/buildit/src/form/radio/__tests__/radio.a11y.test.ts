import { createFixture } from '@vielzeug/craftit/testing';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Accessibility tests for bit-radio component using axe-core
 * Tests WCAG 2.1 Level AA compliance
 */
describe('bit-radio accessibility', () => {
  beforeAll(async () => {
    await import('../radio');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations', async () => {
      const fixture = await createFixture('bit-radio', { name: 'test', value: 'option1' });
      fixture.element.textContent = 'Option 1';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when checked', async () => {
      const fixture = await createFixture('bit-radio', { checked: true, name: 'test', value: 'option1' });
      fixture.element.textContent = 'Selected option';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when disabled', async () => {
      const fixture = await createFixture('bit-radio', { disabled: true, name: 'test', value: 'option1' });
      fixture.element.textContent = 'Disabled option';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Colors and Sizes', () => {
    it('should have no violations for all colors', async () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'];

      for (const color of colors) {
        const fixture = await createFixture('bit-radio', { color, name: 'test', value: color });
        fixture.element.textContent = `${color} radio`;

        const results = await axe.run(fixture.element);
        expect(results.violations, `color="${color}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });

    it('should have no violations for all sizes', async () => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const fixture = await createFixture('bit-radio', { name: 'test', size, value: size });
        fixture.element.textContent = `${size} radio`;

        const results = await axe.run(fixture.element);
        expect(results.violations, `size="${size}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('ARIA Attributes', () => {
    it('should have proper ARIA attributes', async () => {
      const fixture = await createFixture('bit-radio', { name: 'test' });

      expect(fixture.element.getAttribute('role')).toBe('radio');
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
      expect(fixture.element.getAttribute('tabindex')).toBe('0');

      fixture.destroy();
    });

    it('should update aria-checked when checked', async () => {
      const fixture = await createFixture('bit-radio', { checked: true, name: 'test' });

      expect(fixture.element.getAttribute('aria-checked')).toBe('true');

      fixture.destroy();
    });

    it('should have aria-disabled when disabled', async () => {
      const fixture = await createFixture('bit-radio', { disabled: true, name: 'test' });

      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');

      fixture.destroy();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const fixture = await createFixture('bit-radio', { name: 'test' });
      fixture.element.textContent = 'Option';

      expect(fixture.element.getAttribute('tabindex')).toBe('0');

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should support arrow key navigation between radios', async () => {
      const fixture1 = await createFixture('bit-radio', { checked: true, name: 'group', value: 'option1' });
      const fixture2 = await createFixture('bit-radio', { name: 'group', value: 'option2' });

      fixture1.element.textContent = 'Option 1';
      fixture2.element.textContent = 'Option 2';

      document.body.appendChild(fixture1.element);
      document.body.appendChild(fixture2.element);

      const results1 = await axe.run(fixture1.element);
      const results2 = await axe.run(fixture2.element);

      expect(results1.violations).toHaveLength(0);
      expect(results2.violations).toHaveLength(0);

      fixture1.destroy();
      fixture2.destroy();
    });
  });
});
