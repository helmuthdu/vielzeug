import { mount } from '@vielzeug/craftit/test';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

describe('bit-accordion-item accessibility', () => {
  beforeAll(async () => {
    await import('../accordion-item');
  });

  it('should have no accessibility violations', async () => {
    const { element, destroy } = await mount('bit-accordion-item');
    element.innerHTML = '<span slot="title">Title</span>Content';

    const results = await axe.run(element);
    expect(results.violations).toHaveLength(0);

    destroy();
  });

  it('should be keyboard accessible', async () => {
    const { query, element, destroy } = await mount('bit-accordion-item');
    element.innerHTML = '<span slot="title">Title</span>Content';

    const summary = query<HTMLElement>('summary');
    expect(summary?.tabIndex).toBe(0);

    destroy();
  });
});
