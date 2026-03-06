import axe from 'axe-core';
import { type Fixture, mount } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

describe('bit-textarea a11y', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../textarea');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no axe violations with label', async () => {
      fixture = await mount('bit-textarea', {
        attrs: { label: 'Message', 'label-placement': 'outside', name: 'message' },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);
    });

    it('should have no axe violations with error state', async () => {
      fixture = await mount('bit-textarea', {
        attrs: { label: 'Message', 'label-placement': 'outside', name: 'message', error: 'This field is required', value: '' },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);
    });

    it('should have no axe violations when disabled', async () => {
      fixture = await mount('bit-textarea', {
        attrs: { label: 'Message', 'label-placement': 'outside', name: 'message', disabled: true },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);
    });

    it('should have no axe violations when readonly', async () => {
      fixture = await mount('bit-textarea', {
        attrs: { label: 'Content', 'label-placement': 'outside', name: 'content', readonly: true, value: 'Some content' },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Variants', () => {
    const variants = ['solid', 'flat', 'outline', 'bordered', 'ghost', 'frost'] as const;

    variants.forEach((variant) => {
      it(`should have no axe violations with ${variant} variant`, async () => {
        fixture = await mount('bit-textarea', {
          attrs: { label: 'Message', 'label-placement': 'outside', name: 'message', variant },
        });

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);
      });
    });
  });

  describe('Colors', () => {
    const colors = ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;

    colors.forEach((color) => {
      it(`should have no axe violations with ${color} color`, async () => {
        fixture = await mount('bit-textarea', {
          attrs: { label: 'Message', 'label-placement': 'outside', name: 'message', color },
        });

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);
      });
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`should have no axe violations with ${size} size`, async () => {
        fixture = await mount('bit-textarea', {
          attrs: { label: 'Message', 'label-placement': 'outside', name: 'message', size },
        });

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);
      });
    });
  });

  describe('ARIA Attributes', () => {
    it('should set aria-invalid when error is present', async () => {
      fixture = await mount('bit-textarea', {
        attrs: { label: 'Message', name: 'message', error: 'Invalid input' },
      });

      const ta = fixture.query<HTMLTextAreaElement>('textarea');
      expect(ta?.getAttribute('aria-invalid')).toBe('true');
    });

    it('should not set aria-invalid when no error', async () => {
      fixture = await mount('bit-textarea', { attrs: { label: 'Message', name: 'message' } });

      const ta = fixture.query<HTMLTextAreaElement>('textarea');
      expect(ta?.getAttribute('aria-invalid')).not.toBe('true');
    });

    it('should be keyboard accessible', async () => {
      fixture = await mount('bit-textarea', { attrs: { label: 'Message', name: 'message' } });

      const ta = fixture.query<HTMLTextAreaElement>('textarea');
      expect(ta).toBeTruthy();
      // Native textarea is inherently keyboard accessible
      expect(ta?.tagName.toLowerCase()).toBe('textarea');
    });
  });
});
