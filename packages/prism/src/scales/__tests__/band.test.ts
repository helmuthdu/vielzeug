import { signal } from '@vielzeug/ripple';
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

  it('respects paddingOuter configuration', () => {
    const noOuter = bandScale({ domain: ['A', 'B'], padding: 0, paddingOuter: 0, range: [0, 200] });
    const withOuter = bandScale({ domain: ['A', 'B'], padding: 0, paddingOuter: 0.5, range: [0, 200] });

    expect(noOuter.bandwidth()).toBeGreaterThan(withOuter.bandwidth());
  });

  it('subsamples ticks when count < domain length', () => {
    const scale = bandScale({ domain: ['A', 'B', 'C', 'D', 'E', 'F'], range: [0, 600] });

    const ticks = scale.ticks(3);

    expect(ticks.length).toBeLessThan(6);
    expect(ticks.length).toBeGreaterThanOrEqual(1);
    expect(ticks[0]).toBe('A');
  });

  it('accepts MaybeSignal domain and range', () => {
    const dom = signal(['A', 'B', 'C']);
    const rng = signal<[number, number]>([0, 300]);
    const scale = bandScale({ domain: dom, range: rng });

    expect(scale.domain).toEqual(['A', 'B', 'C']);
    expect(scale.bandwidth()).toBeGreaterThan(0);

    dom.value = ['A', 'B'];
    expect(scale.domain).toEqual(['A', 'B']);
  });
});
