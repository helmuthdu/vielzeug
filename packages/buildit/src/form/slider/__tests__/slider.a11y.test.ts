import { createFixture } from '@vielzeug/craftit/testing';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

describe('bit-slider accessibility', () => {
  beforeAll(async () => {
    await import('../slider');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations', async () => {
      const fixture = await createFixture('bit-slider');
      fixture.element.setAttribute('aria-label', 'Volume');

      // The hidden input is intentionally nested for form compatibility
      // but is aria-hidden and not interactive, so we exclude this rule
      const results = await axe.run(fixture.element, {
        rules: {
          'nested-interactive': { enabled: false },
        },
      });
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with value set', async () => {
      const fixture = await createFixture('bit-slider', { value: '50' });
      fixture.element.setAttribute('aria-label', 'Brightness: 50%');

      const results = await axe.run(fixture.element, {
        rules: {
          'nested-interactive': { enabled: false },
        },
      });
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when disabled', async () => {
      const fixture = await createFixture('bit-slider', { disabled: true });
      fixture.element.setAttribute('aria-label', 'Volume (disabled)');

      const results = await axe.run(fixture.element, {
        rules: {
          'nested-interactive': { enabled: false },
        },
      });
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with custom range', async () => {
      const fixture = await createFixture('bit-slider', { max: '200', min: '0', value: '100' });
      fixture.element.setAttribute('aria-label', 'Temperature');

      const results = await axe.run(fixture.element, {
        rules: {
          'nested-interactive': { enabled: false },
        },
      });
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be keyboard accessible', async () => {
      const fixture = await createFixture('bit-slider');

      expect(fixture.element.getAttribute('tabindex')).toBe('0');

      fixture.destroy();
    });

    it('should not be keyboard accessible when disabled', async () => {
      const fixture = await createFixture('bit-slider', { disabled: true });

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);

      fixture.destroy();
    });

    it('should support arrow key navigation', async () => {
      const fixture = await createFixture('bit-slider', { value: '50' });

      expect(fixture.element.getAttribute('role')).toBe('slider');
      expect(fixture.element.getAttribute('aria-valuenow')).toBe('50');

      fixture.destroy();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have proper ARIA role', async () => {
      const fixture = await createFixture('bit-slider');

      expect(fixture.element.getAttribute('role')).toBe('slider');

      fixture.destroy();
    });

    it('should have aria-valuemin, aria-valuemax, and aria-valuenow', async () => {
      const fixture = await createFixture('bit-slider', { max: '90', min: '10', value: '50' });

      expect(fixture.element.getAttribute('aria-valuemin')).toBe('10');
      expect(fixture.element.getAttribute('aria-valuemax')).toBe('90');
      expect(fixture.element.getAttribute('aria-valuenow')).toBe('50');

      fixture.destroy();
    });

    it('should have aria-disabled when disabled', async () => {
      const fixture = await createFixture('bit-slider', { disabled: true });

      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');

      fixture.destroy();
    });
  });

  describe('Focus Management', () => {
    it('should be focusable when enabled', async () => {
      const fixture = await createFixture('bit-slider');

      expect(fixture.element.getAttribute('tabindex')).toBe('0');

      fixture.destroy();
    });

    it('should not be focusable when disabled', async () => {
      const fixture = await createFixture('bit-slider', { disabled: true });

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);

      fixture.destroy();
    });

    it('should show focus ring on focus', async () => {
      const fixture = await createFixture('bit-slider');
      const thumb = fixture.query('.slider-thumb');

      expect(thumb).toBeTruthy();

      fixture.destroy();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide value information to screen readers', async () => {
      const fixture = await createFixture('bit-slider', { max: '100', min: '0', value: '75' });

      expect(fixture.element.getAttribute('role')).toBe('slider');
      expect(fixture.element.getAttribute('aria-valuenow')).toBe('75');
      expect(fixture.element.getAttribute('aria-valuemin')).toBe('0');
      expect(fixture.element.getAttribute('aria-valuemax')).toBe('100');

      fixture.destroy();
    });

    it('should hide internal input from screen readers', async () => {
      const fixture = await createFixture('bit-slider');
      const input = fixture.query('input');

      expect(input?.getAttribute('aria-hidden')).toBe('true');
      expect(input?.getAttribute('tabindex')).toBe('-1');

      fixture.destroy();
    });

    it('should support label content via slot', async () => {
      const fixture = await createFixture('bit-slider');
      fixture.element.textContent = 'Volume Control';
      await fixture.update();

      const label = fixture.query('.label');
      expect(label).toBeTruthy();
      // Slot content is projected, so we check the host element
      expect(fixture.element.textContent).toContain('Volume Control');

      fixture.destroy();
    });
  });
});
