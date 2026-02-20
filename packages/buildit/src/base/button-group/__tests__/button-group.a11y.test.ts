import { createFixture } from '@vielzeug/craftit/testing';
import axe from 'axe-core';

/**
 * Accessibility tests for bit-button-group component using axe-core
 * Tests WCAG 2.1 Level AA compliance
 */
describe('bit-button-group accessibility', () => {
  beforeAll(async () => {
    await import('../button-group');
    await import('../../button/button');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations for default group', async () => {
      const fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
        <bit-button>Button 3</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations for horizontal group', async () => {
      const fixture = await createFixture('bit-button-group', { orientation: 'horizontal' });
      fixture.element.innerHTML = `
        <bit-button>Left</bit-button>
        <bit-button>Center</bit-button>
        <bit-button>Right</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations for vertical group', async () => {
      const fixture = await createFixture('bit-button-group', { orientation: 'vertical' });
      fixture.element.innerHTML = `
        <bit-button>Top</bit-button>
        <bit-button>Middle</bit-button>
        <bit-button>Bottom</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations for attached mode', async () => {
      const fixture = await createFixture('bit-button-group', { attached: true });
      fixture.element.innerHTML = `
        <bit-button variant="bordered">Day</bit-button>
        <bit-button variant="solid">Week</bit-button>
        <bit-button variant="bordered">Month</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have role="group"', async () => {
      const fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      const group = fixture.query('.button-group');

      expect(group?.getAttribute('role')).toBe('group');

      fixture.destroy();
    });

    it('should respect aria-label on the group', async () => {
      const fixture = await createFixture('bit-button-group', { 'aria-label': 'View options' });
      fixture.element.innerHTML = `
        <bit-button>List</bit-button>
        <bit-button>Grid</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['aria-valid-attr', 'aria-valid-attr-value'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have valid ARIA attributes', async () => {
      const fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['aria-allowed-attr', 'aria-required-attr', 'aria-valid-attr'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow keyboard navigation between buttons', async () => {
      const fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
        <bit-button>Button 3</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const buttons = fixture.element.querySelectorAll('bit-button');

      // All buttons should be keyboard focusable
      buttons.forEach((button) => {
        const innerButton = button.shadowRoot?.querySelector('button');
        expect(innerButton?.tabIndex).toBe(0);
      });

      fixture.destroy();
    });

    it('should maintain keyboard navigation in attached mode', async () => {
      const fixture = await createFixture('bit-button-group', { attached: true });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['tabindex', 'focus-order-semantics'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('Button States', () => {
    it('should have no violations with disabled buttons', async () => {
      const fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button>Active</bit-button>
        <bit-button disabled>Disabled</bit-button>
        <bit-button>Active</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations with loading buttons', async () => {
      const fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button loading>Loading...</bit-button>
        <bit-button>Button 3</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('Different Sizes', () => {
    it('should have no violations for small size', async () => {
      const fixture = await createFixture('bit-button-group', { size: 'sm' });
      fixture.element.innerHTML = `
        <bit-button>Small 1</bit-button>
        <bit-button>Small 2</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations for large size', async () => {
      const fixture = await createFixture('bit-button-group', { size: 'lg' });
      fixture.element.innerHTML = `
        <bit-button>Large 1</bit-button>
        <bit-button>Large 2</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('Different Variants', () => {
    it('should have no violations for all variants', async () => {
      const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text'];

      for (const variant of variants) {
        const fixture = await createFixture('bit-button-group', { variant });
        fixture.element.innerHTML = `
          <bit-button>Button 1</bit-button>
          <bit-button>Button 2</bit-button>
        `;

        await new Promise((resolve) => setTimeout(resolve, 10));

        const results = await axe.run(fixture.element);

        expect(results.violations, `${variant} should have no violations`).toHaveLength(0);
        fixture.destroy();
      }
    });
  });

  describe('Icon Buttons in Group', () => {
    it('should have no violations with icon-only buttons', async () => {
      const fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button icon-only aria-label="Bold">
          <strong>B</strong>
        </bit-button>
        <bit-button icon-only aria-label="Italic">
          <em>I</em>
        </bit-button>
        <bit-button icon-only aria-label="Underline">
          <u>U</u>
        </bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should fail if icon-only buttons lack labels', async () => {
      const fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button icon-only>
          <svg width="16" height="16"><rect width="16" height="16"/></svg>
        </bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['button-name'],
        },
      });

      expect(results.violations.length).toBeGreaterThan(0);
      fixture.destroy();
    });
  });

  describe('Semantic HTML', () => {
    it('should not have nested interactive elements', async () => {
      const fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['nested-interactive'],
        },
      });

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('Color Contrast', () => {
    it('should have sufficient color contrast', async () => {
      const fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element, {
        runOnly: {
          type: 'rule',
          values: ['color-contrast'],
        },
      });

      // Note: jsdom doesn't support actual color rendering, so this may not fail
      // Real color contrast testing should be done in browser-based tests
      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });
});
