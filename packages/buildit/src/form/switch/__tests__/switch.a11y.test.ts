import { mount } from '@vielzeug/craftit/test';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

describe('bit-switch accessibility', () => {
  beforeAll(async () => {
    await import('../switch');
  });

  it('should have no accessibility violations', async () => {
    const fixture = await mount('bit-switch');
    fixture.element.textContent = 'Enable notifications';

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

  it('should have no violations when checked', async () => {
    const fixture = await mount('bit-switch', { attrs: { checked: true } });
    fixture.element.textContent = 'Enable notifications';

    expect(fixture.element.hasAttribute('checked')).toBe(true);

    const results = await axe.run(fixture.element, {
      rules: {
        'nested-interactive': { enabled: false },
      },
    });
    expect(results.violations).toHaveLength(0);

    fixture.destroy();
  });

  it('should have no violations when disabled', async () => {
    const fixture = await mount('bit-switch', { attrs: { disabled: true } });
    fixture.element.textContent = 'Enable notifications';

    expect(fixture.element.hasAttribute('disabled')).toBe(true);

    const results = await axe.run(fixture.element, {
      rules: {
        'nested-interactive': { enabled: false },
      },
    });
    expect(results.violations).toHaveLength(0);

    fixture.destroy();
  });

  it('should have no violations with different color variants', async () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'];

    for (const color of colors) {
      const fixture = await mount('bit-switch', { attrs: { checked: true, color } });
      fixture.element.textContent = `${color} switch`;

      const results = await axe.run(fixture.element, {
        rules: {
          'nested-interactive': { enabled: false },
        },
      });
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    }
  });

  it('should have no violations with different sizes', async () => {
    const sizes = ['sm', 'md', 'lg'];

    for (const size of sizes) {
      const fixture = await mount('bit-switch', { attrs: { size } });
      fixture.element.textContent = `${size} switch`;

      const results = await axe.run(fixture.element, {
        rules: {
          'nested-interactive': { enabled: false },
        },
      });
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    }
  });
});
