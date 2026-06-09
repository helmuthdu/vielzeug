import { describe, expect, it } from 'vitest';

import { linearScale } from '../linear';

describe('linearScale', () => {
  it('maps domain values to range', () => {
    const scale = linearScale({ domain: [0, 100], nice: false, range: [0, 500] });

    expect(scale.map(0)).toBe(0);
    expect(scale.map(50)).toBe(250);
    expect(scale.map(100)).toBe(500);
  });

  it('inverts pixel values back to domain', () => {
    const scale = linearScale({ domain: [0, 100], nice: false, range: [0, 500] });

    expect(scale.invert(0)).toBe(0);
    expect(scale.invert(250)).toBe(50);
    expect(scale.invert(500)).toBe(100);
  });

  it('clamps output when configured', () => {
    const scale = linearScale({ clamp: true, domain: [0, 100], nice: false, range: [0, 500] });

    expect(scale.map(-50)).toBe(0);
    expect(scale.map(200)).toBe(500);
  });

  it('generates nice ticks', () => {
    const scale = linearScale({ domain: [0, 100], nice: false, range: [0, 500] });
    const ticks = scale.ticks(5);

    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks[0]).toBeGreaterThanOrEqual(0);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(100);
  });

  it('applies nice domain by default', () => {
    const scale = linearScale({ domain: [3, 97], range: [0, 500] });

    expect(scale.domain[0]).toBeLessThanOrEqual(3);
    expect(scale.domain[1]).toBeGreaterThanOrEqual(97);
  });

  it('handles zero-range domain', () => {
    const scale = linearScale({ domain: [50, 50], nice: false, range: [0, 500] });

    expect(scale.map(50)).toBe(0);
    expect(scale.ticks()).toEqual([50]);
  });
});
