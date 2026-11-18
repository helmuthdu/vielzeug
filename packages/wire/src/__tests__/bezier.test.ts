import { describe, expect, it } from 'vitest';
import { bezierRoute } from '../bezier.js';
import { WireConfigError } from '../errors.js';

describe('bezierRoute', () => {
  it('extends control points along the port sides with the default handle length', () => {
    const curve = bezierRoute({ side: 'right', x: 10, y: 20 }, { side: 'left', x: 110, y: 20 });
    expect(curve).toEqual({
      c1: { x: 50, y: 20 },
      c2: { x: 70, y: 20 },
      from: { x: 10, y: 20 },
      to: { x: 110, y: 20 },
    });
  });

  it('honors a custom handle length and explicit sides', () => {
    const curve = bezierRoute({ side: 'bottom', x: 0, y: 0 }, { side: 'top', x: 0, y: 100 }, { handleLength: 30 });
    expect(curve.c1).toEqual({ x: 0, y: 30 });
    expect(curve.c2).toEqual({ x: 0, y: 70 });
  });

  it('supports zero handle length', () => {
    const curve = bezierRoute({ side: 'right', x: 1, y: 2 }, { side: 'left', x: 3, y: 4 }, { handleLength: 0 });
    expect(curve.c1).toEqual({ x: 1, y: 2 });
    expect(curve.c2).toEqual({ x: 3, y: 4 });
  });

  it('validates handle length', () => {
    expect(() =>
      bezierRoute({ side: 'right', x: 0, y: 0 }, { side: 'left', x: 1, y: 1 }, { handleLength: -1 }),
    ).toThrow(WireConfigError);
    expect(() =>
      bezierRoute({ side: 'right', x: 0, y: 0 }, { side: 'left', x: 1, y: 1 }, { handleLength: Number.NaN }),
    ).toThrow(WireConfigError);
  });
});
