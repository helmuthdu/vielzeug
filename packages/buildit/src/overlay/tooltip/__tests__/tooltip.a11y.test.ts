import { mount } from '@vielzeug/craftit/test';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Accessibility tests for bit-tooltip using axe-core.
 * Tests WCAG 2.1 Level AA compliance.
 */
describe('bit-tooltip accessibility', () => {
  beforeAll(async () => {
    await import('../tooltip');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations for default tooltip', async () => {
      const fixture = await mount('bit-tooltip', { attrs: { content: 'Help text' } });
      fixture.element.innerHTML = '<button>Trigger</button>';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations for light variant', async () => {
      const fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', variant: 'light' } });
      fixture.element.innerHTML = '<button>Trigger</button>';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when disabled', async () => {
      const fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', disabled: true } });
      fixture.element.innerHTML = '<button>Trigger</button>';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Placements', () => {
    it('should have no violations for all placements', async () => {
      const placements = ['top', 'bottom', 'left', 'right'];

      for (const placement of placements) {
        const fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', placement } });
        fixture.element.innerHTML = '<button>Trigger</button>';

        const results = await axe.run(fixture.element);
        expect(results.violations, `placement="${placement}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('Variants and Sizes', () => {
    it('should have no violations for all sizes', async () => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', size } });
        fixture.element.innerHTML = '<button>Trigger</button>';

        const results = await axe.run(fixture.element);
        expect(results.violations, `size="${size}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('ARIA Attributes', () => {
    it('should have role="tooltip" on the tooltip element', async () => {
      const fixture = await mount('bit-tooltip', { attrs: { content: 'Tooltip text' } });
      fixture.element.innerHTML = '<button>Trigger</button>';

      const tooltipEl = fixture.query('.tooltip');
      expect(tooltipEl?.getAttribute('role')).toBe('tooltip');

      fixture.destroy();
    });

    it('should have valid ARIA roles', async () => {
      const fixture = await mount('bit-tooltip', { attrs: { content: 'Tip' } });
      fixture.element.innerHTML = '<button>Trigger</button>';

      const results = await axe.run(fixture.element, {
        runOnly: { type: 'rule', values: ['aria-roles', 'aria-allowed-role'] },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have aria-hidden on arrow element', async () => {
      const fixture = await mount('bit-tooltip', { attrs: { content: 'Tip' } });
      fixture.element.innerHTML = '<button>Trigger</button>';

      const arrowEl = fixture.query('.arrow');
      expect(arrowEl?.getAttribute('aria-hidden')).toBe('true');

      fixture.destroy();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should not make tooltip itself focusable', async () => {
      const fixture = await mount('bit-tooltip', { attrs: { content: 'Tip' } });
      fixture.element.innerHTML = '<button>Trigger</button>';

      const tooltipEl = fixture.query('.tooltip');
      // Tooltip bubble should not be in tab order
      expect(tooltipEl?.getAttribute('tabindex')).not.toBe('0');

      fixture.destroy();
    });
  });
});
