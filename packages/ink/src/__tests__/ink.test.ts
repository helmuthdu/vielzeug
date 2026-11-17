import {
  InkConfigError,
  InkError,
  type StrokePoint,
  simplifyStroke,
  smoothStroke,
  strokeOutline,
  strokeOutlineToSvgPath,
  strokeToSvgPath,
  strokeWidths,
} from '../index.js';

/** Deterministic pseudo-jitter: no Math.random, same noise every run. */
function noisyLine(count: number, amplitude: number): StrokePoint[] {
  const points: StrokePoint[] = [];
  for (let i = 0; i < count; i++) {
    const wobble = i % 2 === 0 ? amplitude : -amplitude;
    points.push({ x: i * 10, y: 50 + wobble });
  }
  return points;
}

/** Largest turn angle between consecutive segments; sharp corners inflate it. */
function maxTurnAngle(points: readonly StrokePoint[]): number {
  let max = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1];
    const b = points[i];
    const c = points[i + 1];
    let delta = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    max = Math.max(max, Math.abs(delta));
  }
  return max;
}

/** RMS deviation from the ideal centerline y = 50. */
function centerlineDeviation(points: readonly StrokePoint[]): number {
  let sum = 0;
  for (const point of points) sum += (point.y - 50) * (point.y - 50);
  return Math.sqrt(sum / points.length);
}

describe('smoothStroke', () => {
  it('reduces deviation from the ideal line with the streamline algorithm', () => {
    const input = noisyLine(40, 6);
    const smoothed = smoothStroke(input, { algorithm: 'streamline' });
    expect(centerlineDeviation(smoothed)).toBeLessThan(centerlineDeviation(input));
  });

  it('reduces sharp corners with catmull-rom resampling', () => {
    const input = noisyLine(20, 6);
    const smoothed = smoothStroke(input);
    expect(maxTurnAngle(smoothed)).toBeLessThan(maxTurnAngle(input));
  });

  it('preserves the first and last input points with catmull-rom', () => {
    const input = noisyLine(10, 4);
    const smoothed = smoothStroke(input, { steps: 4 });
    expect(smoothed[0]).toEqual({ x: input[0].x, y: input[0].y });
    expect(smoothed[smoothed.length - 1]).toEqual({ x: input[input.length - 1].x, y: input[input.length - 1].y });
  });

  it('is deterministic for identical input', () => {
    const input = noisyLine(12, 3);
    expect(smoothStroke(input)).toEqual(smoothStroke(input));
  });

  it('interpolates linearly at tension 0', () => {
    // tension 0 must blend to plain linear interpolation, not collapse onto
    // the segment start (each emitted sample lies on the straight segment).
    const input = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];
    const smoothed = smoothStroke(input, { steps: 4, tension: 0 });
    for (const point of smoothed) {
      expect(point.x).toBeCloseTo(point.y, 9);
    }
    const xs = smoothed.map((p) => p.x);
    expect(new Set(xs).size).toBe(xs.length); // strictly increasing, no duplicates
    expect(smoothed[0]).toEqual({ x: 0, y: 0 });
    expect(smoothed[smoothed.length - 1]).toEqual({ x: 30, y: 30 });
  });

  it('keeps input length with the streamline algorithm', () => {
    const input = noisyLine(15, 5);
    expect(smoothStroke(input, { algorithm: 'streamline' })).toHaveLength(input.length);
  });

  it('interpolates pressure along smoothed segments', () => {
    const input: StrokePoint[] = [
      { pressure: 0, x: 0, y: 0 },
      { pressure: 1, x: 10, y: 0 },
      { pressure: 1, x: 20, y: 0 },
      { pressure: 0, x: 30, y: 0 },
    ];
    const smoothed = smoothStroke(input, { steps: 2 });
    expect(smoothed.some((point) => point.pressure !== undefined && point.pressure > 0 && point.pressure < 1)).toBe(
      true,
    );
  });

  it('returns copies for strokes too short to smooth', () => {
    const input: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ];
    expect(smoothStroke(input)).toEqual(input);
  });

  it('throws InkConfigError for a tension outside [0, 1]', () => {
    expect(() => smoothStroke(noisyLine(5, 1), { tension: 1.5 })).toThrow(InkConfigError);
  });

  it('throws InkConfigError for a non-integer steps value', () => {
    expect(() => smoothStroke(noisyLine(5, 1), { steps: 2.5 })).toThrow(InkConfigError);
  });

  it('throws InkConfigError for an unknown algorithm', () => {
    expect(() => smoothStroke(noisyLine(5, 1), { algorithm: 'bezier' as 'streamline' })).toThrow(InkConfigError);
  });

  it('throws InkConfigError for points with non-finite coordinates', () => {
    expect(() => smoothStroke([{ x: Number.NaN, y: 0 }])).toThrow(InkConfigError);
  });
});

describe('strokeWidths', () => {
  const straight: StrokePoint[] = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 8, y: 0 },
  ];

  it('returns one width per point', () => {
    expect(strokeWidths(straight, { baseWidth: 6 })).toHaveLength(3);
  });

  it('widens slow segments and narrows fast segments', () => {
    const input: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 }, // slow: small spacing
      { x: 40, y: 0 }, // fast: large spacing
    ];
    const widths = strokeWidths(input, { baseWidth: 10, referenceSpeed: 4 });
    expect(widths[1]).toBeGreaterThan(widths[2]);
  });

  it('disables velocity modulation when velocityExponent is 0', () => {
    const input: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 40, y: 0 },
    ];
    const widths = strokeWidths(input, { baseWidth: 10, velocityExponent: 0 });
    expect(widths[1]).toBeCloseTo(10);
    expect(widths[2]).toBeCloseTo(10);
  });

  it('increases width with pressure', () => {
    const light: StrokePoint[] = [
      { pressure: 0.2, x: 0, y: 0 },
      { pressure: 0.2, x: 4, y: 0 },
    ];
    const heavy: StrokePoint[] = [
      { pressure: 0.9, x: 0, y: 0 },
      { pressure: 0.9, x: 4, y: 0 },
    ];
    const lightWidths = strokeWidths(light, { baseWidth: 8, velocityExponent: 0 });
    const heavyWidths = strokeWidths(heavy, { baseWidth: 8, velocityExponent: 0 });
    expect(heavyWidths[0]).toBeGreaterThan(lightWidths[0]);
  });

  it('clamps modulation to minScale and maxScale', () => {
    const input: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 0.001, y: 0 }, // extremely slow
      { x: 1000, y: 0 }, // extremely fast
    ];
    const widths = strokeWidths(input, { baseWidth: 10, maxScale: 1.5, minScale: 0.5, referenceSpeed: 4 });
    expect(widths[1]).toBeCloseTo(10 * 1.5);
    expect(widths[2]).toBeCloseTo(10 * 0.5);
  });

  it('is deterministic for identical input', () => {
    expect(strokeWidths(noisyLine(10, 2), { baseWidth: 5 })).toEqual(strokeWidths(noisyLine(10, 2), { baseWidth: 5 }));
  });

  it('throws InkConfigError for a non-positive baseWidth', () => {
    expect(() => strokeWidths(straight, { baseWidth: 0 })).toThrow(InkConfigError);
  });

  it('throws InkConfigError when minScale exceeds maxScale', () => {
    expect(() => strokeWidths(straight, { baseWidth: 4, maxScale: 1, minScale: 3 })).toThrow(InkConfigError);
  });

  it('throws InkConfigError for a negative velocityExponent', () => {
    expect(() => strokeWidths(straight, { baseWidth: 4, velocityExponent: -1 })).toThrow(InkConfigError);
  });

  it('throws InkConfigError for an empty stroke', () => {
    expect(() => strokeWidths([], { baseWidth: 4 })).toThrow(InkConfigError);
  });
});

describe('strokeOutline', () => {
  const stroke: StrokePoint[] = [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 40, y: 0 },
  ];

  it('is deterministic for identical input', () => {
    expect(strokeOutline(stroke)).toEqual(strokeOutline(stroke));
  });

  it('produces a closed ring: no repeated first/last vertex and positive enclosed area', () => {
    const ring = strokeOutline(stroke);
    expect(ring[0]).not.toEqual(ring[ring.length - 1]);
    // Shoelace area: a proper ring encloses the stroke body.
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      area += a.x * b.y - b.x * a.y;
    }
    expect(Math.abs(area / 2)).toBeGreaterThan(0);
  });

  it('offsets the ring by half the supplied width on each side', () => {
    const ring = strokeOutline(stroke, [8, 8, 8]);
    const ys = ring.map((point) => point.y);
    expect(Math.max(...ys)).toBeCloseTo(4);
    expect(Math.min(...ys)).toBeCloseTo(-4);
  });

  it('widens the ring where widths are larger', () => {
    const spread = (ring: { y: number }[]): number =>
      Math.max(...ring.map((p) => p.y)) - Math.min(...ring.map((p) => p.y));
    expect(spread(strokeOutline(stroke, [20, 20, 20]))).toBeGreaterThan(spread(strokeOutline(stroke, [2, 2, 2])));
  });

  it('throws InkConfigError when widths length mismatches', () => {
    expect(() => strokeOutline(stroke, [4, 4])).toThrow(InkConfigError);
  });

  it('throws InkConfigError for a non-positive width', () => {
    expect(() => strokeOutline(stroke, [4, 0, 4])).toThrow(InkConfigError);
  });
});

describe('simplifyStroke', () => {
  it('preserves the first and last points', () => {
    const input = noisyLine(20, 5);
    const result = simplifyStroke(input, 1);
    expect(result[0]).toBe(input[0]);
    expect(result[result.length - 1]).toBe(input[input.length - 1]);
  });

  it('returns a subsequence of the input points', () => {
    const input = noisyLine(20, 5);
    const result = simplifyStroke(input, 2);
    expect(result.length).toBeLessThanOrEqual(input.length);
    let cursor = 0;
    for (const point of result) {
      const found = input.indexOf(point, cursor);
      expect(found).toBeGreaterThan(-1);
      cursor = found + 1;
    }
  });

  it('collapses points within tolerance to a straight line', () => {
    const input: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0.1 },
      { x: 10, y: -0.1 },
      { x: 15, y: 0 },
    ];
    expect(simplifyStroke(input, 1)).toEqual([input[0], input[3]]);
  });

  it('keeps points that exceed tolerance', () => {
    const input: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 5, y: 50 },
      { x: 10, y: 0 },
    ];
    expect(simplifyStroke(input, 1)).toHaveLength(3);
  });

  it('is a no-op for strokes shorter than three points', () => {
    const input: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(simplifyStroke(input, 5)).toEqual(input);
  });

  it('throws InkConfigError for a negative tolerance', () => {
    expect(() => simplifyStroke(noisyLine(5, 1), -1)).toThrow(InkConfigError);
  });

  it('throws InkConfigError for a non-finite tolerance', () => {
    expect(() => simplifyStroke(noisyLine(5, 1), Number.POSITIVE_INFINITY)).toThrow(InkConfigError);
  });
});

describe('strokeToSvgPath', () => {
  const stroke: StrokePoint[] = [
    { x: 1.23456, y: 2 },
    { x: 3, y: 4.98765 },
    { x: 5, y: 6 },
  ];

  it('starts with M and uses one command per point', () => {
    const d = strokeToSvgPath(stroke);
    expect(d.startsWith('M ')).toBe(true);
    const commands = d.split(/\s+(?=[MLZ])/);
    expect(commands).toHaveLength(3);
    expect(commands[1]?.startsWith('L ')).toBe(true);
  });

  it('emits two coordinates per move or line command', () => {
    const d = strokeToSvgPath(stroke);
    for (const command of d.split(/\s+(?=[MLZ])/)) {
      const numbers = command.replace(/[MLZ]/g, '').trim().split(/\s+/);
      expect(numbers).toHaveLength(2);
    }
  });

  it('rounds coordinates to the requested precision', () => {
    expect(strokeToSvgPath(stroke, { precision: 1 })).toContain('1.2');
    expect(strokeToSvgPath(stroke, { precision: 0 })).toBe('M 1 2 L 3 5 L 5 6');
  });

  it('appends Z when close is set', () => {
    expect(strokeToSvgPath(stroke, { close: true }).endsWith(' Z')).toBe(true);
    expect(strokeToSvgPath(stroke).endsWith('Z')).toBe(false);
  });

  it('throws InkConfigError for a precision outside [0, 12]', () => {
    expect(() => strokeToSvgPath(stroke, { precision: 20 })).toThrow(InkConfigError);
  });

  it('throws InkConfigError for an empty stroke', () => {
    expect(() => strokeToSvgPath([])).toThrow(InkConfigError);
  });
});

describe('strokeOutlineToSvgPath', () => {
  it('produces a closed path from an outline ring', () => {
    const ring = strokeOutline([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    const d = strokeOutlineToSvgPath(ring);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith(' Z')).toBe(true);
    const commands = d.split(/\s+(?=[MLZ])/);
    expect(commands).toHaveLength(ring.length + 1);
  });

  it('throws InkConfigError for an empty polygon', () => {
    expect(() => strokeOutlineToSvgPath([])).toThrow(InkConfigError);
  });
});

describe('error hierarchy', () => {
  it('narrows configuration errors with instanceof InkError', () => {
    try {
      strokeWidths([{ x: 0, y: 0 }], { baseWidth: -1 });
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InkError);
      expect(error).toBeInstanceOf(InkConfigError);
      expect((error as Error).name).toBe('InkConfigError');
    }
  });
});
