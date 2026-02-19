import { createFixture } from '@vielzeug/craftit/testing';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

describe('bit-accordion-item accessibility', () => {
  beforeAll(async () => {
    await import('../accordion-item');
  });

  it('should have no accessibility violations', async () => {
    const fixture = await createFixture('bit-accordion-item');
    fixture.element.innerHTML = '<span slot="title">Title</span>Content';

    const results = await axe.run(fixture.element);
    expect(results.violations).toHaveLength(0);

    fixture.destroy();
  });

  it('should be keyboard accessible', async () => {
    const fixture = await createFixture('bit-accordion-item');
    fixture.element.innerHTML = '<span slot="title">Title</span>Content';

    const summary = fixture.query<HTMLElement>('summary');
    expect(summary?.tabIndex).toBe(0);

    fixture.destroy();
  });
});
