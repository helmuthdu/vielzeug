import { mount, user } from '@vielzeug/craftit/test';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Accessibility tests for bit-alert using axe-core.
 * Tests WCAG 2.1 Level AA compliance.
 */
describe('bit-alert accessibility', () => {
  beforeAll(async () => {
    await import('../alert');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations for default alert', async () => {
      const fixture = await mount('bit-alert');
      fixture.element.textContent = 'This is an alert message.';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when dismissable', async () => {
      const fixture = await mount('bit-alert', { attrs: { dismissable: true } });
      fixture.element.textContent = 'Dismissable alert';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with title', async () => {
      const fixture = await mount('bit-alert', { attrs: { title: 'Heads up!' } });
      fixture.element.textContent = 'Please review the following.';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when dismissed', async () => {
      const fixture = await mount('bit-alert', { attrs: { dismissable: true } });
      fixture.element.textContent = 'Dismissed alert';

      const closeBtn = fixture.query<HTMLButtonElement>('.close');
      if (closeBtn) {
        await user.click(closeBtn);
      }

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Variants and Colors', () => {
    it('should have no violations for all variants', async () => {
      const variants = ['flat', 'solid', 'outline', 'frost'];

      for (const variant of variants) {
        const fixture = await mount('bit-alert', { attrs: { variant } });
        fixture.element.textContent = `${variant} alert`;

        const results = await axe.run(fixture.element);
        expect(results.violations, `variant="${variant}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });

    it('should have no violations for all colors', async () => {
      const colors = ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'];

      for (const color of colors) {
        const fixture = await mount('bit-alert', { attrs: { color } });
        fixture.element.textContent = `${color} alert message`;

        const results = await axe.run(fixture.element);
        expect(results.violations, `color="${color}" should have no violations`).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('ARIA Attributes', () => {
    it('should have role="alert" on the inner element', async () => {
      const fixture = await mount('bit-alert');
      fixture.element.textContent = 'Alert content';

      const alertEl = fixture.query('.alert');
      expect(alertEl?.getAttribute('role')).toBe('alert');

      fixture.destroy();
    });

    it('should have aria-label on the close button', async () => {
      const fixture = await mount('bit-alert', { attrs: { dismissable: true } });
      fixture.element.textContent = 'Alert content';

      const closeBtn = fixture.query('.close');
      expect(closeBtn?.getAttribute('aria-label')).toBeTruthy();

      const results = await axe.run(fixture.element, {
        runOnly: { type: 'rule', values: ['aria-allowed-attr', 'aria-required-attr'] },
      });
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have valid ARIA roles', async () => {
      const fixture = await mount('bit-alert');
      fixture.element.textContent = 'Alert';

      const results = await axe.run(fixture.element, {
        runOnly: { type: 'rule', values: ['aria-roles', 'aria-allowed-role'] },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should have keyboard-accessible close button when dismissable', async () => {
      const fixture = await mount('bit-alert', { attrs: { dismissable: true } });
      fixture.element.textContent = 'Close me';

      const closeBtn = fixture.query<HTMLButtonElement>('.close');
      expect(closeBtn?.tagName.toLowerCase()).toBe('button');
      expect(closeBtn?.tabIndex).not.toBe(-1);

      fixture.destroy();
    });
  });
});
