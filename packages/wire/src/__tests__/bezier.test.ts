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

describe('bezierRoute selfLoop', () => {
  it('widens both handles to 1.5x the port spacing on a shared side', () => {
    const from = { side: 'top', x: 50, y: 0 } as const;
    const to = { side: 'top', x: 90, y: 0 } as const;
    const curve = bezierRoute(from, to, { selfLoop: true });
    // Spacing is 40, so each handle extends 60 upward from the port.
    expect(curve.c1).toEqual({ x: 50, y: -60 });
    expect(curve.c2).toEqual({ x: 90, y: -60 });
  });

  it('never shrinks handles below handleLength', () => {
    const from = { side: 'right', x: 10, y: 10 } as const;
    const to = { side: 'right', x: 12, y: 10 } as const;
    const curve = bezierRoute(from, to, { handleLength: 40, selfLoop: true });
    expect(curve.c1).toEqual({ x: 50, y: 10 });
    expect(curve.c2).toEqual({ x: 52, y: 10 });
  });

  it('leaves opposite-side routes unchanged', () => {
    const plain = bezierRoute({ side: 'right', x: 10, y: 10 }, { side: 'left', x: 110, y: 10 });
    const looped = bezierRoute({ side: 'right', x: 10, y: 10 }, { side: 'left', x: 110, y: 10 }, { selfLoop: true });
    expect(looped).toEqual(plain);
  });

  it('matches the plain route when the option is omitted', () => {
    const from = { side: 'top', x: 50, y: 0 } as const;
    const to = { side: 'top', x: 90, y: 0 } as const;
    expect(bezierRoute(from, to)).toEqual(bezierRoute(from, to, { selfLoop: false }));
  });
});
