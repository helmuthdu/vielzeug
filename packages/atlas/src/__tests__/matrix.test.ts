import { describe, expect, it } from 'vitest';
import {
  apply,
  around,
  IDENTITY,
  invert,
  multiply,
  rotate,
  scale,
  scaleOf,
  toCssMatrix,
  translate,
} from '../matrix.js';

const close = (a: number, b: number): number => expect(a).toBeCloseTo(b, 9);

describe('matrix', () => {
  it('applies identity unchanged', () => {
    expect(apply(IDENTITY, { x: 3, y: -7 })).toEqual({ x: 3, y: -7 });
  });

  it('multiplies translate and scale in canvas order', () => {
    const m = multiply(translate(10, 20), scale(2));
    expect(apply(m, { x: 5, y: 5 })).toEqual({ x: 20, y: 30 });
  });

  it('rotates clockwise on screen for positive angles', () => {
    const p = apply(rotate(Math.PI / 2), { x: 1, y: 0 });
    close(p.x, 0);
    close(p.y, 1);
  });

  it('round-trips through invert', () => {
    const m = multiply(multiply(rotate(0.7), scale(2.5)), translate(-4, 9));
    const inv = invert(m);
    expect(inv).not.toBeNull();
    const p = apply(m, apply(inv as never, { x: 12, y: -3 }));
    close(p.x, 12);
    close(p.y, -3);
  });

  it('returns null inverse for degenerate matrices', () => {
    expect(invert(scale(0))).toBeNull();
  });

  it('applies a matrix around an anchor point', () => {
    const anchor = { x: 100, y: 50 };
    const m = around(anchor, scale(2));
    const p = apply(m, anchor);
    close(p.x, 100);
    close(p.y, 50);
  });

  it('decomposes uniform scale', () => {
    close(scaleOf(multiply(rotate(1.2), scale(3.5))), 3.5);
  });

  it('serializes to a CSS matrix() value', () => {
    expect(toCssMatrix([1, 2, 3, 4, 5, 6])).toBe('matrix(1,2,3,4,5,6)');
  });
});
