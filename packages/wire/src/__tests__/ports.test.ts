import { describe, expect, it } from 'vitest';
import { WireConfigError } from '../errors.js';
import { floatingSide, portAnchor } from '../ports.js';

const rect = { height: 64, width: 160, x: 100, y: 50 };

describe('portAnchor', () => {
  it('places ports on each side at the offset fraction', () => {
    expect(portAnchor(rect, 'top', 0.25)).toEqual({ side: 'top', x: 140, y: 50 });
    expect(portAnchor(rect, 'right')).toEqual({ side: 'right', x: 260, y: 82 });
    expect(portAnchor(rect, 'bottom', 1)).toEqual({ side: 'bottom', x: 260, y: 114 });
    expect(portAnchor(rect, 'left', 0)).toEqual({ side: 'left', x: 100, y: 50 });
  });

  it('defaults to the middle of the side', () => {
    expect(portAnchor(rect, 'left')).toEqual({ side: 'left', x: 100, y: 82 });
  });

  it('rejects offsets outside 0..1', () => {
    expect(() => portAnchor(rect, 'top', 1.5)).toThrow(WireConfigError);
    expect(() => portAnchor(rect, 'top', Number.NaN)).toThrow(WireConfigError);
  });
});

describe('floatingSide', () => {
  it('picks the side facing the target in each quadrant', () => {
    // rect center is (180, 82).
    expect(floatingSide(rect, { x: 400, y: 200 })).toBe('right');
    expect(floatingSide(rect, { x: -50, y: 200 })).toBe('left');
    expect(floatingSide(rect, { x: 400, y: -100 })).toBe('right');
    expect(floatingSide(rect, { x: 180, y: -100 })).toBe('top');
    expect(floatingSide(rect, { x: 180, y: 500 })).toBe('bottom');
  });

  it('uses the dominant axis, not the raw offsets', () => {
    // Slightly above but far to the right: horizontal wins.
    expect(floatingSide(rect, { x: 900, y: 70 })).toBe('right');
    // Slightly right but far below: vertical wins.
    expect(floatingSide(rect, { x: 200, y: 900 })).toBe('bottom');
  });

  it('resolves diagonal ties to the horizontal side', () => {
    // |dx| === |dy| === 100 from the center.
    expect(floatingSide(rect, { x: 280, y: 182 })).toBe('right');
    expect(floatingSide(rect, { x: 80, y: 182 })).toBe('left');
    expect(floatingSide(rect, { x: 280, y: -18 })).toBe('right');
    expect(floatingSide(rect, { x: 80, y: -18 })).toBe('left');
  });

  it('resolves a target exactly on the center to right', () => {
    expect(floatingSide(rect, { x: 180, y: 82 })).toBe('right');
  });

  it('rejects non-finite rects and targets', () => {
    expect(() => floatingSide({ ...rect, width: Number.NaN }, { x: 0, y: 0 })).toThrow(WireConfigError);
    expect(() => floatingSide(rect, { x: Number.POSITIVE_INFINITY, y: 0 })).toThrow(WireConfigError);
  });
});
