import { createFixture } from '@vielzeug/craftit/testing';
import axe from 'axe-core';

describe('bit-input accessibility', () => {
  beforeAll(async () => {
    await import('../input');
  });

  it('should have no accessibility violations', async () => {
    const fixture = await createFixture('bit-input', {
      name: 'test-input',
      placeholder: 'Enter text',
    });

    const results = await axe.run(fixture.element);
    expect(results.violations).toHaveLength(0);

    fixture.destroy();
  });

  it('should have no violations with all states', async () => {
    const fixture = await createFixture('bit-input', {
      disabled: true,
      placeholder: 'Enter text',
      required: true,
      value: 'Test value',
    });

    const results = await axe.run(fixture.element);
    expect(results.violations).toHaveLength(0);

    fixture.destroy();
  });

  it('should be keyboard accessible', async () => {
    const fixture = await createFixture('bit-input');
    const input = fixture.query('input') as HTMLInputElement;

    // Input should not have tabindex -1 (should be naturally focusable)
    expect(input.tabIndex).not.toBe(-1);

    fixture.destroy();
  });

  it('should not be focusable when disabled', async () => {
    const fixture = await createFixture('bit-input', { disabled: true });
    const input = fixture.query('input') as HTMLInputElement;

    expect(input.disabled).toBe(true);

    fixture.destroy();
  });

  it('should handle all input types accessibly', async () => {
    const types = ['text', 'email', 'password', 'search', 'url', 'tel'];

    for (const type of types) {
      const fixture = await createFixture('bit-input', {
        placeholder: `Enter ${type}`,
        type,
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    }
  });
});
