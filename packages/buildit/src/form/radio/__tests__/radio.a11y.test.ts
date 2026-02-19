import axe from 'axe-core';
import { describe, it, expect, beforeAll } from 'vitest';
import { createFixture } from '@vielzeug/craftit/testing';

describe('bit-radio accessibility', () => {
  beforeAll(async () => {
    await import('../radio');
  });

  it('should have no accessibility violations', async () => {
    const fixture = await createFixture('bit-radio', { name: 'test', value: 'option1' });
    fixture.element.textContent = 'Option 1';

    const results = await axe.run(fixture.element);
    expect(results.violations).toHaveLength(0);

    fixture.destroy();
  });

  it('should have proper ARIA attributes', async () => {
    const fixture = await createFixture('bit-radio', { name: 'test' });

    expect(fixture.element.getAttribute('role')).toBe('radio');
    expect(fixture.element.getAttribute('aria-checked')).toBe('false');
    expect(fixture.element.getAttribute('tabindex')).toBe('0');

    fixture.destroy();
  });

  it('should update aria-checked when checked', async () => {
    const fixture = await createFixture('bit-radio', { checked: true, name: 'test' });

    expect(fixture.element.getAttribute('aria-checked')).toBe('true');

    fixture.destroy();
  });

  it('should have aria-disabled when disabled', async () => {
    const fixture = await createFixture('bit-radio', { disabled: true, name: 'test' });

    expect(fixture.element.getAttribute('aria-disabled')).toBe('true');

    fixture.destroy();
  });

  it('should be keyboard accessible', async () => {
    const fixture = await createFixture('bit-radio', { name: 'test' });
    fixture.element.textContent = 'Option';

    expect(fixture.element.getAttribute('tabindex')).toBe('0');

    const results = await axe.run(fixture.element);
    expect(results.violations).toHaveLength(0);

    fixture.destroy();
  });

  it('should support arrow key navigation between radios', async () => {
    const fixture1 = await createFixture('bit-radio', { name: 'group', value: 'option1', checked: true });
    const fixture2 = await createFixture('bit-radio', { name: 'group', value: 'option2' });

    fixture1.element.textContent = 'Option 1';
    fixture2.element.textContent = 'Option 2';

    document.body.appendChild(fixture1.element);
    document.body.appendChild(fixture2.element);

    const results1 = await axe.run(fixture1.element);
    const results2 = await axe.run(fixture2.element);

    expect(results1.violations).toHaveLength(0);
    expect(results2.violations).toHaveLength(0);

    fixture1.destroy();
    fixture2.destroy();
  });
});

