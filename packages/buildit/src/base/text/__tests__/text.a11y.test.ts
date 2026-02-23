import { createFixture } from '@vielzeug/craftit/testing';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Accessibility tests for bit-text component using axe-core
 * Tests WCAG 2.1 Level AA compliance
 */
describe('bit-text Accessibility', () => {
  beforeAll(async () => {
    await import('../text');
  });

  describe('Basic Accessibility', () => {
    it('should have no accessibility violations with default text', async () => {
      const fixture = await createFixture('bit-text');
      fixture.element.textContent = 'Hello World';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with empty text', async () => {
      const fixture = await createFixture('bit-text');

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Variants', () => {
    const variants = ['body', 'heading', 'label', 'caption', 'overline', 'code'] as const;

    variants.forEach((variant) => {
      it(`should have no violations with ${variant} variant`, async () => {
        const fixture = await createFixture('bit-text', { variant });
        fixture.element.textContent = `Sample text for ${variant}`;

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);

        fixture.destroy();
      });
    });
  });

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'heading', 'body', 'muted'] as const;

    colors.forEach((color) => {
      it(`should have no violations with ${color} color`, async () => {
        const fixture = await createFixture('bit-text', { color });
        fixture.element.textContent = `Text with ${color} color`;

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);

        fixture.destroy();
      });
    });

    // Note: disabled color is intentionally lower contrast and may not pass WCAG AA
    it('should allow lower contrast for disabled color', async () => {
      const fixture = await createFixture('bit-text', { color: 'disabled' });
      fixture.element.textContent = 'Disabled text';

      const results = await axe.run(fixture.element);

      // Disabled text is allowed to have lower contrast per WCAG
      // We just check that there are no critical violations
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      expect(criticalViolations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

    sizes.forEach((size) => {
      it(`should have no violations with ${size} size`, async () => {
        const fixture = await createFixture('bit-text', { size });
        fixture.element.textContent = `Text size ${size}`;

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);

        fixture.destroy();
      });
    });
  });

  describe('Font Weights', () => {
    const weights = ['normal', 'medium', 'semibold', 'bold'] as const;

    weights.forEach((weight) => {
      it(`should have no violations with ${weight} weight`, async () => {
        const fixture = await createFixture('bit-text', { weight });
        fixture.element.textContent = `Text weight ${weight}`;

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);

        fixture.destroy();
      });
    });
  });

  describe('Text Alignment', () => {
    const alignments = ['left', 'center', 'right', 'justify'] as const;

    alignments.forEach((align) => {
      it(`should have no violations with ${align} alignment`, async () => {
        const fixture = await createFixture('bit-text', { align });
        fixture.element.textContent = 'Aligned text content';

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);

        fixture.destroy();
      });
    });
  });

  describe('Truncate', () => {
    it('should have no violations with truncated text', async () => {
      const fixture = await createFixture('bit-text', { truncate: true });
      fixture.element.style.maxWidth = '200px';
      fixture.element.textContent = 'This is a very long text that will be truncated with an ellipsis';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should maintain accessibility with title attribute', async () => {
      const fixture = await createFixture('bit-text', { truncate: true });
      fixture.element.style.maxWidth = '100px';
      fixture.element.title = 'Full text content that is truncated';
      fixture.element.textContent = 'Full text content that is truncated';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Italic Style', () => {
    it('should have no violations with italic text', async () => {
      const fixture = await createFixture('bit-text', { italic: true });
      fixture.element.textContent = 'Italic text content';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Combined Attributes', () => {
    it('should have no violations with multiple attributes', async () => {
      const fixture = await createFixture('bit-text', {
        variant: 'heading',
        size: '2xl',
        weight: 'bold',
        color: 'primary',
        align: 'center',
      });
      fixture.element.textContent = 'Combined Attributes Heading';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Hidden Content', () => {
    it('should have no violations with hidden attribute', async () => {
      const fixture = await createFixture('bit-text', { hidden: true });
      fixture.element.textContent = 'Hidden text';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });
});


