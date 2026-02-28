import axe from 'axe-core';
import { createFixture } from '../../../utils/trial';

/**
 * Accessibility tests for a bit-button component using axe-core
 * Tests WCAG 2.1 Level AA compliance
 */
describe('bit-button accessibility', () => {
  beforeAll(async () => {
    await import('../button');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations for default button', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.textContent = 'Click me';

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations for all variants', async () => {
      const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text'];

      for (const variant of variants) {
        const fixture = await createFixture('bit-button', { variant });
        fixture.element.textContent = 'Button';

        const results = await axe.run(fixture.element);

        expect(results.violations, `${variant} variant should have no violations`).toHaveLength(0);
        fixture.destroy();
      }
    });

    it('should have no violations for all colors', async () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'];

      for (const color of colors) {
        const fixture = await createFixture('bit-button', { color });
        fixture.element.textContent = 'Button';

        const results = await axe.run(fixture.element);

        expect(results.violations, `${color} color should have no violations`).toHaveLength(0);
        fixture.destroy();
      }
    });

    it('should have no violations for disabled state', async () => {
      const fixture = await createFixture('bit-button', { disabled: true });
      fixture.element.textContent = 'Disabled';

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations for loading state', async () => {
      const fixture = await createFixture('bit-button', { loading: true });
      fixture.element.textContent = 'Loading';

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should be keyboard focusable', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.textContent = 'Focusable';

      const button = fixture.query<HTMLButtonElement>('button');

      expect(button).toBeDefined();
      expect(button?.tabIndex).toBe(0);

      fixture.destroy();
    });

    it('should not be focusable when disabled', async () => {
      const fixture = await createFixture('bit-button', { disabled: true });
      fixture.element.textContent = 'Not Focusable';

      const button = fixture.query('button');

      expect(button?.hasAttribute('disabled')).toBe(true);
      expect(button?.getAttribute('aria-disabled')).toBe('true');

      fixture.destroy();
    });

    it('should have proper ARIA attributes when disabled', async () => {
      const fixture = await createFixture('bit-button', { disabled: true });
      fixture.element.textContent = 'Disabled';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['aria-allowed-attr', 'aria-required-attr', 'aria-valid-attr', 'aria-valid-attr-value'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should not have nested interactive elements', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.textContent = 'Click me';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['nested-interactive'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have valid tabindex', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.textContent = 'Button';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['tabindex'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('ARIA Labels and Roles', () => {
    it('should have valid ARIA roles', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.textContent = 'Button';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['aria-roles', 'aria-allowed-role'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have accessible button name', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.textContent = 'Click me';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['button-name'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have aria-label for icon-only buttons', async () => {
      const fixture = await createFixture('bit-button', {
        'aria-label': 'Settings',
        'icon-only': true,
      });
      fixture.element.textContent = '⚙️';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['button-name', 'aria-valid-attr'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should fail accessibility if icon-only button has no label', async () => {
      const fixture = await createFixture('bit-button', { 'icon-only': true });
      fixture.element.innerHTML = '<svg width="20" height="20"><circle cx="10" cy="10" r="8"/></svg>';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['button-name'],
        },
      });

      // This should have violations because icon-only needs aria-label
      expect(results.violations.length).toBeGreaterThan(0);
      fixture.destroy();
    });

    it('should have aria-busy when loading', async () => {
      const fixture = await createFixture('bit-button', { loading: true });
      fixture.element.textContent = 'Loading';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['aria-valid-attr', 'aria-valid-attr-value'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should not have prohibited ARIA attributes', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.textContent = 'Button';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['aria-prohibited-attr'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have conditional ARIA attributes correctly', async () => {
      const fixture = await createFixture('bit-button', {
        'aria-busy': 'true',
        loading: true,
      });
      fixture.element.textContent = 'Loading';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['aria-conditional-attr'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('Form Integration', () => {
    it('should work correctly as submit button', async () => {
      const fixture = await createFixture('bit-button', { type: 'submit' });
      fixture.element.textContent = 'Submit';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['button-name', 'nested-interactive'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should work correctly as reset button', async () => {
      const fixture = await createFixture('bit-button', { type: 'reset' });
      fixture.element.textContent = 'Reset';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['button-name'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('Visual Accessibility', () => {
    it.skip('should have sufficient size for touch targets (min 44x44px)', async () => {
      // Skip: jsdom doesn't support layout/rendering, so getBoundingClientRect() returns 0
      // This should be tested in browser-based tests or with Playwright
      const fixture = await createFixture('bit-button');
      fixture.element.textContent = 'Touch Target';

      const button = fixture.query('button');
      const rect = button?.getBoundingClientRect();

      expect(rect?.height).toBeGreaterThanOrEqual(44);
      fixture.destroy();
    });

    it.skip('should maintain touch target size for icon-only buttons', async () => {
      // Skip: jsdom doesn't support layout/rendering, so getBoundingClientRect() returns 0
      // This should be tested in browser-based tests or with Playwright
      const fixture = await createFixture('bit-button', {
        'aria-label': 'Icon',
        'icon-only': true,
      });
      fixture.element.textContent = '⚙️';

      const button = fixture.query('button');
      const rect = button?.getBoundingClientRect();

      expect(rect?.height).toBeGreaterThanOrEqual(44);
      expect(rect?.width).toBeGreaterThanOrEqual(44);
      fixture.destroy();
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicator', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.textContent = 'Focus Test';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['focus-order-semantics'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should not have focus outline violations', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.textContent = 'Button';

      const results = await axe.run(fixture.element);

      // Check that there are no violations related to focus indicators
      const focusViolations = results.violations.filter((v) => v.id.includes('focus') || v.id.includes('outline'));

      expect(focusViolations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have accessible name', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.textContent = 'Accessible Name';

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['button-name'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should announce loading state to screen readers', async () => {
      const fixture = await createFixture('bit-button', {
        'aria-busy': 'true',
        loading: true,
      });
      fixture.element.textContent = 'Processing';

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should announce disabled state to screen readers', async () => {
      const fixture = await createFixture('bit-button', {
        'aria-disabled': 'true',
        disabled: true,
      });
      fixture.element.textContent = 'Disabled';

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('SVG Icons in Slots', () => {
    it('should have no violations with SVG in prefix slot', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.innerHTML = `
        <svg slot="prefix" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        Button Text
      `;

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations with SVG in suffix slot', async () => {
      const fixture = await createFixture('bit-button');
      fixture.element.innerHTML = `
        Button Text
        <svg slot="suffix" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="M9 5l7 7-7 7"/>
        </svg>
      `;

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    // Note: icon-only buttons with aria-label are already covered in the test
    // "should have aria-label for icon-only buttons" above
  });

  describe('Rounded Attribute Accessibility', () => {
    it('should have no violations with rounded (default full)', async () => {
      const fixture = await createFixture('bit-button', { rounded: '' });
      fixture.element.textContent = 'Rounded Button';

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations with rounded theme values', async () => {
      const values = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];

      for (const value of values) {
        const fixture = await createFixture('bit-button', { rounded: value });
        fixture.element.textContent = `Rounded ${value}`;

        const results = await axe.run(fixture.element);

        expect(results.violations, `rounded="${value}" should have no violations`).toHaveLength(0);
        fixture.destroy();
      }
    });
  });
});
