import { mount } from '@vielzeug/craftit/test';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Accessibility tests for bit-badge using axe-core.
 * Tests WCAG 2.1 Level AA compliance.
 */
describe('bit-badge accessibility', () => {
  beforeAll(async () => {
    await import('../badge');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations for default badge', async () => {
      const fixture = await mount('bit-badge');
      fixture.element.textContent = 'New';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations for count mode', async () => {
      const fixture = await mount('bit-badge', { attrs: { count: 5 } });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations for dot mode', async () => {
      const fixture = await mount('bit-badge', { attrs: { dot: true } });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Variants and Colors', () => {
    it('should have no violations for all variants', async () => {
      const variants = ['solid', 'flat', 'outline'];

      for (const variant of variants) {
        const fixture = await mount('bit-badge', { attrs: { variant } });
        fixture.element.textContent = 'Badge';

        const results = await axe.run(fixture.element);
        expect(results.violations, `variant="${variant}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });

    it('should have no violations for all colors', async () => {
      const colors = ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'];

      for (const color of colors) {
        const fixture = await mount('bit-badge', { attrs: { color } });
        fixture.element.textContent = 'Badge';

        const results = await axe.run(fixture.element);
        expect(results.violations, `color="${color}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });

    it('should have no violations for all sizes', async () => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const fixture = await mount('bit-badge', { attrs: { size } });
        fixture.element.textContent = 'Badge';

        const results = await axe.run(fixture.element);
        expect(results.violations, `size="${size}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('ARIA Attributes', () => {
    it('should have valid ARIA roles', async () => {
      const fixture = await mount('bit-badge');
      fixture.element.textContent = 'Beta';

      const results = await axe.run(fixture.element, {
        runOnly: { type: 'rule', values: ['aria-roles', 'aria-allowed-role'] },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });
});
