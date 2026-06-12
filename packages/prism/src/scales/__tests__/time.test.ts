import { signal } from '@vielzeug/ripple';
import { describe, expect, it } from 'vitest';

import { timeScale } from '../time';

describe('timeScale', () => {
  it('maps dates to pixel range', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    const scale = timeScale({ domain: [start, end], nice: false, range: [0, 1000] });

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
    const scale = timeScale({ domain: [start, end], nice: false, range: [0, 1000] });

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

  it('nice:true expands domain beyond raw bounds', () => {
    const start = new Date('2024-01-15');
    const end = new Date('2024-11-20');
    const niced = timeScale({ domain: [start, end], range: [0, 1000] });
    const exact = timeScale({ domain: [start, end], nice: false, range: [0, 1000] });

    expect(niced.domain[0].getTime()).toBeLessThanOrEqual(start.getTime());
    expect(niced.domain[1].getTime()).toBeGreaterThanOrEqual(end.getTime());
    expect(exact.domain[0].getTime()).toBe(start.getTime());
  });

  it('accepts MaybeSignal domain', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    const dom = signal<[Date, Date]>([start, end]);
    const scale = timeScale({ domain: dom, nice: false, range: [0, 1000] });

    expect(scale.map(start)).toBe(0);

    const newStart = new Date('2024-06-01');

    dom.value = [newStart, end];
    expect(scale.map(newStart)).toBeCloseTo(0, 0);
  });
});
