import { signal } from '@vielzeug/ripple';
import { describe, expect, it, vi } from 'vitest';

import { buildXScale, buildYScale } from '../core/cartesian-scales';
import { bandScale } from '../scales/band';
import { linearScale } from '../scales/linear';
import { timeScale } from '../scales/time';

// ─── linearScale ──────────────────────────────────────────────────────────────

describe('linearScale', () => {
  it('maps domain min to range min and domain max to range max (nice off)', () => {
    const scale = linearScale({ domain: [0, 100], nice: false, range: [0, 200] });

    expect(scale.map(0)).toBe(0);
    expect(scale.map(100)).toBe(200);
  });

  it('maps midpoint correctly', () => {
    const scale = linearScale({ domain: [0, 10], nice: false, range: [0, 100] });

    expect(scale.map(5)).toBe(50);
  });

  it('inverts pixel back to domain value', () => {
    const scale = linearScale({ domain: [0, 10], nice: false, range: [0, 100] });

    expect(scale.invert(50)).toBeCloseTo(5);
  });

  it('clamp prevents out-of-range output', () => {
    const scale = linearScale({ clamp: true, domain: [0, 10], nice: false, range: [0, 100] });

    expect(scale.map(-5)).toBe(0);
    expect(scale.map(15)).toBe(100);
  });

  it('no clamp allows extrapolation', () => {
    const scale = linearScale({ domain: [0, 10], nice: false, range: [0, 100] });

    expect(scale.map(20)).toBe(200);
  });

  it('generates ticks within domain', () => {
    const scale = linearScale({ domain: [0, 100], nice: false, range: [0, 500] });
    const ticks = scale.ticks(5);

    expect(ticks.length).toBeGreaterThan(0);
    ticks.forEach((t) => {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(100);
    });
  });

  it('returns single tick when domain is degenerate', () => {
    const scale = linearScale({ domain: [5, 5], nice: false, range: [0, 100] });

    expect(scale.ticks()).toEqual([5]);
  });

  it('returns range min when domain is degenerate in map', () => {
    const scale = linearScale({ domain: [5, 5], nice: false, range: [0, 100] });

    expect(scale.map(5)).toBe(0);
  });

  it('nice mode extends domain to round numbers', () => {
    const scale = linearScale({ domain: [3, 97], range: [0, 500] });
    const [d0, d1] = scale.domain;

    expect(d0).toBeLessThanOrEqual(3);
    expect(d1).toBeGreaterThanOrEqual(97);
  });
});

// ─── timeScale ────────────────────────────────────────────────────────────────

describe('timeScale', () => {
  const d0 = new Date('2024-01-01T00:00:00Z');
  const d1 = new Date('2024-12-31T00:00:00Z');

  it('maps start date to range start and end to range end (nice off)', () => {
    const scale = timeScale({ domain: [d0, d1], nice: false, range: [0, 500] });

    expect(scale.map(d0)).toBeCloseTo(0, 0);
    expect(scale.map(d1)).toBeCloseTo(500, 0);
  });

  it('invert round-trips a pixel back to approximately the right date', () => {
    const scale = timeScale({ domain: [d0, d1], nice: false, range: [0, 500] });
    const mid = new Date((d0.getTime() + d1.getTime()) / 2);
    const px = scale.map(mid);
    const back = scale.invert(px);

    expect(Math.abs(back.getTime() - mid.getTime())).toBeLessThan(1000);
  });

  it('generates ticks as Date instances', () => {
    const scale = timeScale({ domain: [d0, d1], nice: false, range: [0, 500] });
    const ticks = scale.ticks(6);

    expect(ticks.length).toBeGreaterThan(0);
    ticks.forEach((t) => expect(t).toBeInstanceOf(Date));
  });

  it('returns zero pixel when domain range is zero', () => {
    const same = new Date('2024-06-01');
    const scale = timeScale({ domain: [same, same], nice: false, range: [0, 500] });

    expect(scale.map(same)).toBe(0);
  });

  it('nice mode snaps domain to clean interval boundaries', () => {
    const scale = timeScale({ domain: [d0, d1], range: [0, 500] });
    const [nd0, nd1] = scale.domain;

    expect(nd0.getTime()).toBeLessThanOrEqual(d0.getTime());
    expect(nd1.getTime()).toBeGreaterThanOrEqual(d1.getTime());
  });

  it('nice:false leaves domain unchanged', () => {
    const scale = timeScale({ domain: [d0, d1], nice: false, range: [0, 500] });
    const [nd0, nd1] = scale.domain;

    expect(nd0.getTime()).toBe(d0.getTime());
    expect(nd1.getTime()).toBe(d1.getTime());
  });
});

// ─── bandScale ────────────────────────────────────────────────────────────────

describe('bandScale', () => {
  it('maps first category to start of range (with outer padding)', () => {
    const scale = bandScale({ domain: ['A', 'B', 'C'], padding: 0, paddingOuter: 0, range: [0, 300] });

    expect(scale.map('A')).toBeCloseTo(0, 0);
  });

  it('bandwidth divides range evenly with no padding', () => {
    const scale = bandScale({ domain: ['A', 'B', 'C'], padding: 0, paddingOuter: 0, range: [0, 300] });

    expect(scale.bandwidth()).toBeCloseTo(100, 0);
  });

  it('gap returns inner padding * bandwidth', () => {
    const scale = bandScale({ domain: ['A', 'B'], padding: 0.2, paddingOuter: 0, range: [0, 200] });

    expect(scale.gap()).toBeCloseTo(scale.bandwidth() * 0.2, 3);
  });

  it('returns 0 bandwidth for empty domain', () => {
    const scale = bandScale({ domain: [], range: [0, 300] });

    expect(scale.bandwidth()).toBe(0);
  });

  it('map returns 0 for unknown category', () => {
    const scale = bandScale({ domain: ['A', 'B'], range: [0, 200] });

    expect(scale.map('Z')).toBe(0);
  });

  it('ticks returns all domain values', () => {
    const scale = bandScale({ domain: ['X', 'Y', 'Z'], range: [0, 300] });

    expect(scale.ticks()).toEqual(['X', 'Y', 'Z']);
  });

  it('uses plain-value domain (plain array)', () => {
    const scale = bandScale({ domain: ['A', 'B', 'C'], range: [0, 300] });

    expect(scale.ticks()).toEqual(['A', 'B', 'C']);
    expect(scale.domain).toEqual(['A', 'B', 'C']);
  });

  it('ticks() always returns all domain values (count arg ignored for categorical)', () => {
    const scale = bandScale({ domain: ['A', 'B', 'C', 'D', 'E'], range: [0, 500] });

    expect(scale.ticks()).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('emits warn for unknown category and returns 0', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const scale = bandScale({ domain: ['A', 'B'], range: [0, 200] });
    const result = scale.map('Z');

    expect(result).toBe(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown category'));
    warn.mockRestore();
  });
});

// ─── linearScale — reactive domain ────────────────────────────────────────────

describe('linearScale — plain-value domain', () => {
  it('maps correctly with explicit plain-value domain', () => {
    const scale = linearScale({ domain: [0, 10], nice: false, range: [0, 100] });

    expect(scale.map(10)).toBe(100);
    expect(scale.map(5)).toBe(50);
  });
});

// ─── timeScale — reactive domain ──────────────────────────────────────────────

describe('timeScale — plain-value domain', () => {
  it('maps correctly with explicit plain-value domain', () => {
    const d0 = new Date('2024-01-01');
    const d1 = new Date('2024-12-31');
    const scale = timeScale({ domain: [d0, d1], nice: false, range: [0, 500] });

    expect(scale.map(d0)).toBe(0);
    expect(scale.map(d1)).toBeCloseTo(500, 0);
  });
});

// ─── buildXScale — single-point domain ────────────────────────────────────────

describe('buildXScale — single-point domain', () => {
  it('does not produce Infinity domain when all x values are identical', () => {
    const scale = buildXScale([5, 5, 5], 300);

    expect(isFinite(scale.domain[0] as number)).toBe(true);
    expect(isFinite(scale.domain[1] as number)).toBe(true);
  });

  it('all-same-timestamp Date series produces finite domain', () => {
    const d = new Date('2024-06-01');
    const scale = buildXScale([d, d, d], 600);
    const [d0, d1] = scale.domain as [Date, Date];

    expect(isFinite(d0.getTime())).toBe(true);
    expect(isFinite(d1.getTime())).toBe(true);
    expect(d1.getTime()).toBeGreaterThan(d0.getTime());
  });
});

// ─── buildYScale — includeZero option ─────────────────────────────────────────

describe('buildYScale — includeZero option', () => {
  it('default includeZero:true anchors domain at 0 for positive data', () => {
    const scale = buildYScale([100, 110, 120], 300);

    expect(scale.domain[0]).toBe(0);
    expect(scale.domain[1]).toBeGreaterThanOrEqual(120);
  });

  it('includeZero:false uses data minimum as domain floor', () => {
    const scale = buildYScale([100, 110, 120], 300, false);

    expect(scale.domain[0]).toBe(100);
    expect(scale.domain[1]).toBeGreaterThanOrEqual(120);
  });

  it('includeZero:false with negative data keeps negative minimum', () => {
    const scale = buildYScale([-50, -10, 30], 300, false);

    expect(scale.domain[0]).toBe(-50);
  });

  it('includeZero:false with all-same values produces a non-zero range', () => {
    const scale = buildYScale([5, 5, 5], 300, false);
    const [d0, d1] = scale.domain;

    expect(d1).toBeGreaterThan(d0);
  });
});

// ─── buildXScale / buildYScale — null-guard warning paths ─────────────────────

describe('buildXScale — null-guard warning', () => {
  it('emits warn and returns fallback scale when any x value is null', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const scale = buildXScale([null as unknown as number, 1, 2], 300);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('null or undefined'));
    expect(scale.domain).toBeDefined();
    warnSpy.mockRestore();
  });
});

describe('buildYScale — null-guard warning', () => {
  it('emits warn and returns fallback scale when any y value is null', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const scale = buildYScale([null as unknown as number, 10, 20], 300);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('null or undefined'));
    expect(scale.domain).toBeDefined();
    warnSpy.mockRestore();
  });
});
