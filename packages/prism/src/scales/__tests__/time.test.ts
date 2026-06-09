import { describe, expect, it } from 'vitest';

import { timeScale } from '../time';

describe('timeScale', () => {
  it('maps dates to pixel range', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    const scale = timeScale({ domain: [start, end], range: [0, 1000] });

    expect(scale.map(start)).toBe(0);
    expect(scale.map(end)).toBe(1000);
  });

  it('inverts pixels back to dates', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    const scale = timeScale({ domain: [start, end], range: [0, 1000] });

    const mid = scale.invert(500);

    expect(mid.getTime()).toBeGreaterThan(start.getTime());
    expect(mid.getTime()).toBeLessThan(end.getTime());
  });

  it('generates time ticks', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    const scale = timeScale({ domain: [start, end], range: [0, 1000] });

    const ticks = scale.ticks(6);

    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks[0].getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(ticks[ticks.length - 1].getTime()).toBeLessThanOrEqual(end.getTime());
  });

  it('handles same start and end date', () => {
    const date = new Date('2024-06-15');
    const scale = timeScale({ domain: [date, date], range: [0, 500] });

    expect(scale.map(date)).toBe(0);
  });
});
