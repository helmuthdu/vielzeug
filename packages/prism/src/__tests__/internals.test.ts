import { describe, expect, it, vi } from 'vitest';

import { renderAxis } from '../axes/axis';
import { computeAreaPoints } from '../charts/area/area-renderer';
import { computePoints } from '../charts/line/line-renderer';
import { arcCentroid, computeArcs } from '../charts/pie/pie-renderer';
import { buildXScale, buildYScale } from '../core/cartesian-scales';
import { chartArea, resolveMargin } from '../core/layout';
import { nearestPointX } from '../interaction/hit-test';
import { linearScale } from '../scales/linear';
import { areaPath, linePath, monotonePath, stepPath } from '../svg/path';
import { seriesColor } from '../theme';

// ─── nearestPointX ────────────────────────────────────────────────────────────

describe('nearestPointX', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 10, y: 5 },
    { x: 20, y: 10 },
  ];

  it('returns -1 for empty array', () => {
    expect(nearestPointX([], 5)).toBe(-1);
  });

  it('returns index of closest point by x', () => {
    expect(nearestPointX(pts, 9)).toBe(1);
    expect(nearestPointX(pts, 18)).toBe(2);
  });

  it('returns 0 for x left of all points', () => {
    expect(nearestPointX(pts, -100)).toBe(0);
  });

  it('returns last index for x right of all points', () => {
    expect(nearestPointX(pts, 1000)).toBe(2);
  });

  it('returns index 0 for single-point array', () => {
    expect(nearestPointX([{ x: 5, y: 5 }], 999)).toBe(0);
  });
});

// ─── resolveMargin + chartArea ────────────────────────────────────────────────

describe('resolveMargin', () => {
  it('returns default margin when undefined', () => {
    const m = resolveMargin(undefined);

    expect(m.top).toBeGreaterThanOrEqual(0);
    expect(m.bottom).toBeGreaterThanOrEqual(0);
  });

  it('accepts partial margin object', () => {
    const m = resolveMargin({ top: 10 });

    expect(m.top).toBe(10);
    expect(m.left).toBeGreaterThanOrEqual(0);
  });

  it('accepts full margin object', () => {
    const m = resolveMargin({ bottom: 5, left: 10, right: 15, top: 20 });

    expect(m).toEqual({ bottom: 5, left: 10, right: 15, top: 20 });
  });
});

describe('chartArea', () => {
  it('subtracts margins from width and height', () => {
    const area = chartArea(600, 400, { bottom: 20, left: 30, right: 10, top: 40 });

    expect(area.width).toBe(560);
    expect(area.height).toBe(340);
  });

  it('clamps to 0 when margins exceed dimensions', () => {
    const area = chartArea(10, 10, { bottom: 20, left: 20, right: 0, top: 0 });

    expect(area.width).toBeGreaterThanOrEqual(0);
    expect(area.height).toBeGreaterThanOrEqual(0);
  });
});

// ─── seriesColor ──────────────────────────────────────────────────────────────

describe('seriesColor', () => {
  it('returns a CSS custom property string for index 0', () => {
    const c = seriesColor(0);

    expect(c).toMatch(/var\(--prism-color-/);
  });

  it('returns override when provided', () => {
    expect(seriesColor(0, '#ff0000')).toBe('#ff0000');
  });

  it('cycles for out-of-range indices', () => {
    const a = seriesColor(0);
    const b = seriesColor(10);

    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });
});

// ─── buildXScale / buildYScale ────────────────────────────────────────────────

describe('buildXScale', () => {
  it('returns linearScale for numeric inputs', () => {
    const scale = buildXScale([1, 2, 3], 300);

    expect(scale.map).toBeDefined();
    expect(scale.ticks).toBeDefined();
  });

  it('returns timeScale for Date inputs', () => {
    const d0 = new Date('2024-01-01');
    const d1 = new Date('2024-12-31');
    const scale = buildXScale([d0, d1], 500);
    const px = scale.map(d0 as never);

    expect(typeof px).toBe('number');
    expect(isFinite(px)).toBe(true);
    expect(px).toBeLessThan(scale.map(d1 as never));
  });

  it('returns fallback [0,1] scale for empty input', () => {
    const scale = buildXScale([], 300);

    expect(scale.domain).toBeDefined();
  });
});

describe('buildYScale', () => {
  it('range max is 0 (pixel top) for positive-only data', () => {
    const scale = buildYScale([10, 20, 30], 400);

    expect(scale.map(30)).toBeLessThan(scale.map(10));
  });

  it('includes 0 in domain for positive-only data', () => {
    const scale = buildYScale([5, 10], 300);
    const [d0] = scale.domain;

    expect(d0).toBeLessThanOrEqual(0);
  });

  it('returns fallback scale for empty input', () => {
    const scale = buildYScale([], 300);

    expect(scale.domain).toBeDefined();
  });
});

// ─── arcCentroid + computeArcs ────────────────────────────────────────────────

describe('computeArcs', () => {
  const slices = [
    { label: 'A', value: 50 },
    { label: 'B', value: 50 },
  ];

  it('returns empty array when total is 0', () => {
    expect(computeArcs([{ label: 'Z', value: 0 }], 100, 100, 80, 0, 0, Math.PI * 2, 0, 0, () => '#000')).toEqual([]);
  });

  it('produces one arc per slice', () => {
    const arcs = computeArcs(slices, 100, 100, 80, 0, 0, Math.PI * 2, 0, 0, (i) => `#00${i}`);

    expect(arcs).toHaveLength(2);
  });

  it('arcs cover full circle (start of first = 0, end of last ≈ 2π)', () => {
    const arcs = computeArcs(slices, 100, 100, 80, 0, 0, Math.PI * 2, 0, 0, () => '#000');

    expect(arcs[0].startAngle).toBeCloseTo(0);
    expect(arcs[arcs.length - 1].endAngle).toBeCloseTo(Math.PI * 2, 5);
  });
});

describe('arcCentroid', () => {
  it('returns a point within outer radius', () => {
    const arc = {
      capEnd: false,
      capStart: false,
      centerX: 100,
      centerY: 100,
      color: '#000',
      cornerRadius: 0,
      endAngle: Math.PI,
      index: 0,
      innerRadius: 0,
      outerRadius: 80,
      padAngle: 0,
      slice: { label: 'A', value: 50 },
      startAngle: 0,
    };
    const { x, y } = arcCentroid(arc);
    const dx = x - 100;
    const dy = y - 100;
    const dist = Math.sqrt(dx * dx + dy * dy);

    expect(dist).toBeLessThanOrEqual(80);
  });
});

// ─── renderAxis: axis title (C2) ─────────────────────────────────────────────

describe('renderAxis — axis title', () => {
  it('renders .prism-axis-title element when config.label is set', () => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement;
    const scale = linearScale({ domain: [0, 100], range: [0, 400] });

    renderAxis(g, scale, { label: 'My Axis', position: 'bottom' }, 400);

    const title = g.querySelector('.prism-axis-title');

    expect(title).not.toBeNull();
    expect(title?.textContent).toBe('My Axis');
  });

  it('does not render .prism-axis-title when config.label is absent', () => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement;
    const scale = linearScale({ domain: [0, 100], range: [0, 400] });

    renderAxis(g, scale, { position: 'bottom' }, 400);

    expect(g.querySelector('.prism-axis-title')).toBeNull();
  });
});

// ─── linearScale clamp (C4) ───────────────────────────────────────────────────

describe('linearScale — clamp', () => {
  it('clamps output to range when clamp is true', () => {
    const scale = linearScale({ clamp: true, domain: [0, 100], range: [0, 400] });

    expect(scale.map(-50)).toBe(0);
    expect(scale.map(150)).toBe(400);
  });

  it('does not clamp by default', () => {
    const scale = linearScale({ domain: [0, 100], range: [0, 400] });

    expect(scale.map(-50)).toBeLessThan(0);
    expect(scale.map(150)).toBeGreaterThan(400);
  });
});

// ─── renderAxis smart tick density (F3) ──────────────────────────────────────

describe('renderAxis — smart tick density', () => {
  it('uses fewer ticks for narrow horizontal axis (< 160px → 2 ticks)', () => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement;
    const scale = linearScale({ domain: [0, 100], range: [0, 120] });

    renderAxis(g, scale, { position: 'bottom' }, 120);

    const labels = g.querySelectorAll('.prism-axis-label');

    expect(labels.length).toBeGreaterThanOrEqual(2);
  });

  it('respects explicit tickCount over smart default', () => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement;
    const scale = linearScale({ domain: [0, 100], range: [0, 800] });

    renderAxis(g, scale, { position: 'bottom', tickCount: 2 }, 800);

    const ticks = g.querySelectorAll('.prism-axis-tick');

    expect(ticks.length).toBe(2);
  });
});

// ─── buildYScale includeZero (E2) ─────────────────────────────────────────────

describe('buildYScale — includeZero', () => {
  it('forces min to 0 by default for positive-only data', () => {
    const scale = buildYScale([100, 110], 400);
    const [d0] = scale.domain;

    expect(d0).toBeLessThanOrEqual(0);
  });

  it('does not force 0 when includeZero is false', () => {
    const scale = buildYScale([100, 110], 400, false);
    const [d0] = scale.domain;

    expect(d0).toBeGreaterThan(0);
  });
});

// ─── SVG path generators ──────────────────────────────────────────────────────

describe('SVG path generators', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 10, y: 5 },
    { x: 20, y: 10 },
  ];
  const bottom = [
    { x: 0, y: 20 },
    { x: 10, y: 20 },
    { x: 20, y: 20 },
  ];

  it('linePath returns a non-empty string starting with M', () => {
    expect(linePath(pts)).toMatch(/^M/);
  });

  it('monotonePath returns a non-empty string starting with M', () => {
    expect(monotonePath(pts)).toMatch(/^M/);
  });

  it('stepPath returns a non-empty string starting with M', () => {
    expect(stepPath(pts)).toMatch(/^M/);
  });

  it('areaPath returns a closed path string', () => {
    const d = areaPath(pts, bottom);

    expect(d).toMatch(/Z/i);
  });

  it('linePath returns empty string for empty input', () => {
    expect(linePath([])).toBe('');
  });

  it('areaPath returns empty string when top is empty', () => {
    expect(areaPath([], [])).toBe('');
  });

  it('areaPath with monotone curve starts with M and contains cubic bezier', () => {
    const d = areaPath(pts, bottom, 'monotone');

    expect(d).toMatch(/^M/);
    expect(d).toContain('C');
    expect(d).toMatch(/Z/i);
  });

  it('areaPath with step curve contains H and V segments', () => {
    const d = areaPath(pts, bottom, 'step');

    expect(d).toContain('H');
    expect(d).toContain('V');
  });
});

// ─── computePoints / computeAreaPoints — null-key warning ───────────────────────────────

describe('computePoints — null-key warning', () => {
  it('emits warn when datum.key is null', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const xScale = linearScale({ domain: [0, 10], nice: false, range: [0, 100] });
    const yScale = linearScale({ domain: [0, 100], nice: false, range: [300, 0] });

    computePoints(
      [{ key: null as unknown as number, value: 10 }],
      xScale as Parameters<typeof computePoints>[1],
      yScale,
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('null or undefined'));
    warnSpy.mockRestore();
  });
});

describe('computeAreaPoints — null-key warning', () => {
  it('emits warn when datum.key is null', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const xScale = linearScale({ domain: [0, 10], nice: false, range: [0, 100] });
    const yScale = linearScale({ domain: [0, 100], nice: false, range: [300, 0] });

    computeAreaPoints(
      [{ key: null as unknown as number, value: 10 }],
      xScale as Parameters<typeof computeAreaPoints>[1],
      yScale,
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('null or undefined'));
    warnSpy.mockRestore();
  });
});

// ─── computePoints — string-key warning ────────────────────────────────────────────────

describe('computePoints — string-key warning', () => {
  it('emits warn once when any datum has a string key', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const xScale = linearScale({ domain: [0, 10], nice: false, range: [0, 100] });
    const yScale = linearScale({ domain: [0, 100], nice: false, range: [300, 0] });

    computePoints(
      [
        { key: 'A', value: 10 },
        { key: 'B', value: 20 },
      ],
      xScale as Parameters<typeof computePoints>[1],
      yScale,
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('string keys'));
    warnSpy.mockRestore();
  });

  it('does not warn when all keys are numbers', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const xScale = linearScale({ domain: [0, 10], nice: false, range: [0, 100] });
    const yScale = linearScale({ domain: [0, 100], nice: false, range: [300, 0] });

    computePoints(
      [
        { key: 1, value: 10 },
        { key: 2, value: 20 },
      ],
      xScale as Parameters<typeof computePoints>[1],
      yScale,
    );

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
