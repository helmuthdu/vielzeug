import { describe, expect, it } from 'vitest';
import { SHOWCASE_DEMOS, showcaseDemoById } from '../showcaseDemos';

describe('showcase demos', () => {
  it('keeps one complete entry per reference application', () => {
    expect(SHOWCASE_DEMOS.map((demo) => demo.id)).toEqual(['voyage', 'eshop', 'crm']);
    expect(SHOWCASE_DEMOS.every((demo) => demo.features.length === 4 && demo.packages.length > 0)).toBe(true);
  });

  it('resolves known demos without a fallback entry', () => {
    expect(showcaseDemoById('crm')?.name).toBe('CRM');
    expect(showcaseDemoById('unknown')).toBeUndefined();
  });
});
