import { createFixture } from '@vielzeug/craftit/testing';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

describe('bit-checkbox accessibility', () => {
  beforeAll(async () => {
    await import('../checkbox');
  });

  it('should have no accessibility violations', async () => {
    const fixture = await createFixture('bit-checkbox');
    fixture.element.textContent = 'Label';

    const results = await axe.run(fixture.element);
    expect(results.violations).toHaveLength(0);

    fixture.destroy();
  });

  it('should have mixed state when indeterminate', async () => {
    const fixture = await createFixture('bit-checkbox', { indeterminate: true });
    fixture.element.textContent = 'Label';

    expect(fixture.element.getAttribute('aria-checked')).toBe('mixed');

    const results = await axe.run(fixture.element);
    expect(results.violations).toHaveLength(0);

    fixture.destroy();
  });
});
