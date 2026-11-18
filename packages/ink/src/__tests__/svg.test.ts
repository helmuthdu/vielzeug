import { InkConfigError, polylineToSvgPath, strokeOutline } from '../index.js';

describe('polylineToSvgPath', () => {
  const stroke = [
    { x: 1.23456, y: 2 },
    { x: 3, y: 4.98765 },
    { x: 5, y: 6 },
  ];

  it('starts with M and uses one command per point', () => {
    const d = polylineToSvgPath(stroke);
    expect(d.startsWith('M ')).toBe(true);
    const commands = d.split(/\s+(?=[MLZ])/);
    expect(commands).toHaveLength(3);
    expect(commands[1]?.startsWith('L ')).toBe(true);
  });

  it('emits two coordinates per move or line command', () => {
    const d = polylineToSvgPath(stroke);
    for (const command of d.split(/\s+(?=[MLZ])/)) {
      const numbers = command.replace(/[MLZ]/g, '').trim().split(/\s+/);
      expect(numbers).toHaveLength(2);
    }
  });

  it('rounds coordinates to the requested precision', () => {
    expect(polylineToSvgPath(stroke, { precision: 1 })).toContain('1.2');
    expect(polylineToSvgPath(stroke, { precision: 0 })).toBe('M 1 2 L 3 5 L 5 6');
  });

  it('appends Z when close is set', () => {
    expect(polylineToSvgPath(stroke, { close: true }).endsWith(' Z')).toBe(true);
    expect(polylineToSvgPath(stroke).endsWith('Z')).toBe(false);
  });

  it('throws InkConfigError for a precision outside [0, 12]', () => {
    expect(() => polylineToSvgPath(stroke, { precision: 20 })).toThrow(InkConfigError);
  });

  it('throws InkConfigError for an empty stroke', () => {
    expect(() => polylineToSvgPath([])).toThrow(InkConfigError);
  });
});

describe('polylineToSvgPath for outline rings', () => {
  it('produces a closed path from an outline ring', () => {
    const ring = strokeOutline(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      4,
    );
    const d = polylineToSvgPath(ring, { close: true });
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith(' Z')).toBe(true);
    const commands = d.split(/\s+(?=[MLZ])/);
    expect(commands).toHaveLength(ring.length + 1);
  });
});
