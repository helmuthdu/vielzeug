import { describe, expect, it } from 'vitest';

import { bandScale } from '../band';

describe('bandScale', () => {
  it('maps categories to positions', () => {
    const scale = bandScale({ domain: ['A', 'B', 'C'], range: [0, 300] });
    const posA = scale.map('A');
    const posB = scale.map('B');
    const posC = scale.map('C');

    expect(posA).toBeLessThan(posB);
    expect(posB).toBeLessThan(posC);
  });

  it('returns positive bandwidth', () => {
    const scale = bandScale({ domain: ['A', 'B', 'C'], range: [0, 300] });

    expect(scale.bandwidth()).toBeGreaterThan(0);
  });

  it('returns 0 bandwidth for empty domain', () => {
    const scale = bandScale({ domain: [], range: [0, 300] });

    expect(scale.bandwidth()).toBe(0);
  });

  it('returns 0 for unknown category', () => {
    const scale = bandScale({ domain: ['A', 'B'], range: [0, 200] });

    expect(scale.map('Z')).toBe(0);
  });

  it('respects padding configuration', () => {
    const tight = bandScale({ domain: ['A', 'B'], padding: 0, range: [0, 200] });
    const loose = bandScale({ domain: ['A', 'B'], padding: 0.5, range: [0, 200] });

    expect(tight.bandwidth()).toBeGreaterThan(loose.bandwidth());
  });
});
