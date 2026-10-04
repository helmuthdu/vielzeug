import { describe, expect, it } from 'vitest';
import {
  axisAngles,
  closedPath,
  fitRadius,
  labelPlacement,
  nearestAxis,
  normalize,
  radarPoints,
  resolveAxisDomains,
  ringPath,
  toRadians,
} from '../charts/radar/radar-geometry';

const AXES = [
  { key: 'str', label: 'Strength' },
  { key: 'agi', label: 'Agility' },
  { key: 'int', label: 'Intellect' },
  { key: 'luck', label: 'Luck' },
];

describe('axisAngles', () => {
  it('spaces axes evenly clockwise from the start angle', () => {
    expect(axisAngles(4)).toEqual([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]);
  });

  it('offsets every axis by the start angle', () => {
    expect(axisAngles(2, toRadians(90))[0]).toBeCloseTo(Math.PI / 2);
  });
});

describe('resolveAxisDomains', () => {
  it('derives one nice shared range from the data when no domain is given', () => {
    const domains = resolveAxisDomains(AXES, [{ data: [{ key: 'str', value: 8.7 }], name: 'A' }]);

    expect(domains).toEqual(Array(4).fill([0, 9]));
  });

  it('uses the chart domain for axes without overrides', () => {
    expect(resolveAxisDomains(AXES, [], [0, 10])[0]).toEqual([0, 10]);
  });

  it('lets an axis min/max override the chart domain', () => {
    const domains = resolveAxisDomains([{ key: 'spd', label: 'Speed', max: 5, min: 1 }, ...AXES], [], [0, 20]);

    expect(domains[0]).toEqual([1, 5]);
    expect(domains[1]).toEqual([0, 20]);
  });
});

describe('normalize', () => {
  it('maps a value onto 0..1 within its domain', () => {
    expect(normalize(5, [0, 20])).toBe(0.25);
  });

  it('clamps values outside the domain', () => {
    expect(normalize(30, [0, 20])).toBe(1);
    expect(normalize(-5, [0, 20])).toBe(0);
  });

  it('returns 0 for an empty domain', () => {
    expect(normalize(3, [2, 2])).toBe(0);
  });
});

describe('radarPoints', () => {
  it('places the first axis straight up from the centre', () => {
    const [top] = radarPoints([1, 0, 0], 100, 100, 50, axisAngles(3));

    expect(top.x).toBeCloseTo(100);
    expect(top.y).toBeCloseTo(50);
  });
});

describe('closedPath', () => {
  const triangle = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 5, y: 10 },
  ];

  it('joins points with straight lines and closes the shape', () => {
    expect(closedPath(triangle)).toBe('M0,0L10,0L5,10Z');
  });

  it('draws a closed curve through every point when rounded', () => {
    const d = closedPath(triangle, 'rounded');

    expect(d.match(/C/g)).toHaveLength(3);
    expect(d.endsWith('0,0Z')).toBe(true);
  });

  it('returns an empty path for no points', () => {
    expect(closedPath([])).toBe('');
  });
});

describe('ringPath', () => {
  it('draws a polygon ring with one vertex per axis', () => {
    expect(ringPath('polygon', 0, 0, 10, axisAngles(5)).match(/[ML]/g)).toHaveLength(5);
  });

  it('draws a circular ring as two arcs', () => {
    expect(ringPath('circle', 50, 50, 10, axisAngles(5))).toBe('M50,40A10,10 0 1 1 50,60A10,10 0 1 1 50,40Z');
  });

  it('draws nothing for a zero radius', () => {
    expect(ringPath('circle', 0, 0, 0, [])).toBe('');
  });
});

describe('labelPlacement', () => {
  it('centres labels above the top axis and below the bottom axis', () => {
    expect(labelPlacement(0)).toEqual({ anchor: 'middle', baseline: 'auto' });
    expect(labelPlacement(Math.PI)).toEqual({ anchor: 'middle', baseline: 'hanging' });
  });

  it('anchors side labels away from the chart', () => {
    expect(labelPlacement(Math.PI / 2)).toEqual({ anchor: 'start', baseline: 'middle' });
    expect(labelPlacement((3 * Math.PI) / 2)).toEqual({ anchor: 'end', baseline: 'middle' });
  });
});

describe('fitRadius', () => {
  it('reserves horizontal room for the longest side label', () => {
    const short = fitRadius(400, 400, ['A', 'B', 'C', 'D'], axisAngles(4), 10, 10);
    const long = fitRadius(400, 400, ['A', 'A very long label', 'C', 'D'], axisAngles(4), 10, 10);

    expect(long).toBeLessThan(short);
  });

  it('never returns less than a minimum radius', () => {
    expect(fitRadius(10, 10, ['Long label'], [Math.PI / 2], 12, 10)).toBe(8);
  });
});

describe('nearestAxis', () => {
  it('picks the axis closest in angle to the pointer', () => {
    expect(nearestAxis(0, -10, 4)).toBe(0);
    expect(nearestAxis(10, 0, 4)).toBe(1);
    expect(nearestAxis(1, 10, 4)).toBe(2);
    expect(nearestAxis(-10, -9, 4)).toBe(3);
  });

  it('accounts for the start angle', () => {
    expect(nearestAxis(10, 0, 4, toRadians(90))).toBe(0);
  });

  it('returns -1 when there are no axes', () => {
    expect(nearestAxis(1, 1, 0)).toBe(-1);
  });
});
