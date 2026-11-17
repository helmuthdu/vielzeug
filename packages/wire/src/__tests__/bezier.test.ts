import { describe, expect, it } from 'vitest';
import { bezierRoute } from '../bezier.js';
import { WireConfigError } from '../errors.js';

describe('bezierRoute', () => {
  it('emits a cubic path with default right-to-left sides', () => {
    const d = bezierRoute({ x: 10, y: 20 }, { x: 110, y: 20 });
    expect(d).toBe('M 10 20 C 50 20, 70 20, 110 20');
  });

  it('extends control points along explicit port sides', () => {
    const d = bezierRoute({ side: 'bottom', x: 0, y: 0 }, { side: 'top', x: 0, y: 100 }, { offset: 30 });
    expect(d).toBe('M 0 0 C 0 30, 0 70, 0 100');
  });

  it('supports zero offset', () => {
    expect(bezierRoute({ x: 1, y: 2 }, { x: 3, y: 4 }, { offset: 0 })).toBe('M 1 2 C 1 2, 3 4, 3 4');
  });

  it('validates offset', () => {
    expect(() => bezierRoute({ x: 0, y: 0 }, { x: 1, y: 1 }, { offset: -1 })).toThrow(WireConfigError);
    expect(() => bezierRoute({ x: 0, y: 0 }, { x: 1, y: 1 }, { offset: Number.NaN })).toThrow(WireConfigError);
  });
});
