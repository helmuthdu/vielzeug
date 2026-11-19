import { describe, expect, it } from 'vitest';
import { AtlasConfigError } from '../errors.js';
import { boundsOfFrame, frameMatrix, resizeRect } from '../frame.js';
import { apply, around, IDENTITY, multiply, rotate, scale, translate } from '../matrix.js';
import { containsPoint } from '../rect.js';
import type { Point, Rect } from '../shapes.js';

const close = (a: number, b: number): void => expect(a).toBeCloseTo(b, 9);
const closePoint = (p: Point, x: number, y: number): void => {
  close(p.x, x);
  close(p.y, y);
};

describe('frameMatrix', () => {
  it('is a pure translation when rotation and scale are unset', () => {
    expect(frameMatrix({ x: 12, y: -5 })).toEqual(translate(12, -5));
  });

  it('is identity at the origin with no rotation or scale', () => {
    expect(frameMatrix({ x: 0, y: 0 })).toEqual(IDENTITY);
  });

  it('matches the manual around · translate composition', () => {
    const local = multiply(rotate(0.7), scale(2.5));
    const manual = multiply(around({ x: 40, y: 30 }, local), multiply(translate(100, 50), IDENTITY));
    const m = frameMatrix({ origin: { x: 40, y: 30 }, rotation: 0.7, scale: 2.5, x: 100, y: 50 });
    for (let i = 0; i < 6; i++) close(m[i], manual[i]);
  });

  it('rotates and scales around its own position by default', () => {
    const m = frameMatrix({ rotation: Math.PI / 2, scale: 2, x: 10, y: 20 });
    closePoint(apply(m, { x: 0, y: 0 }), 10, 20);
    closePoint(apply(m, { x: 1, y: 0 }), 10, 22);
  });

  it('keeps the world origin point fixed under rotation and scale', () => {
    const m = frameMatrix({ origin: { x: 5, y: 7 }, rotation: 1.2, scale: 3, x: 50, y: 50 });
    // The local point that lands on the pivot maps back to the pivot itself.
    closePoint(apply(m, { x: 5 - 50, y: 7 - 50 }), 5, 7);
  });

  it('scales per axis with an object scale', () => {
    const m = frameMatrix({ scale: { x: 2, y: 1 }, x: 0, y: 0 });
    closePoint(apply(m, { x: 3, y: 4 }), 6, 4);
  });

  it('throws for non-finite placement, rotation, scale, or origin', () => {
    expect(() => frameMatrix({ x: Number.NaN, y: 0 })).toThrow(AtlasConfigError);
    expect(() => frameMatrix({ x: 0, y: Number.POSITIVE_INFINITY })).toThrow(AtlasConfigError);
    expect(() => frameMatrix({ rotation: Number.NaN, x: 0, y: 0 })).toThrow(AtlasConfigError);
    expect(() => frameMatrix({ scale: Number.NaN, x: 0, y: 0 })).toThrow(AtlasConfigError);
    expect(() => frameMatrix({ origin: { x: Number.NaN, y: 0 }, x: 0, y: 0 })).toThrow(AtlasConfigError);
  });
});

describe('boundsOfFrame', () => {
  const rect: Rect = { height: 40, width: 100, x: 10, y: 20 };
  const corners: readonly Point[] = [
    { x: 10, y: 20 },
    { x: 110, y: 20 },
    { x: 10, y: 60 },
    { x: 110, y: 60 },
  ];

  it('returns the rect itself under identity', () => {
    expect(boundsOfFrame(rect, IDENTITY)).toEqual(rect);
  });

  it('contains every transformed corner for a 90° rotation', () => {
    const m = frameMatrix({ rotation: Math.PI / 2, x: 0, y: 0 });
    const bounds = boundsOfFrame(rect, m);
    for (const corner of corners) {
      expect(containsPoint(bounds, apply(m, corner))).toBe(true);
    }
    close(bounds.width, 40);
    close(bounds.height, 100);
  });

  it('contains every transformed corner for a 45° rotation', () => {
    const m = frameMatrix({ rotation: Math.PI / 4, x: -30, y: 12 });
    const bounds = boundsOfFrame(rect, m);
    for (const corner of corners) {
      expect(containsPoint(bounds, apply(m, corner))).toBe(true);
    }
  });

  it('scales the bounds with the frame scale', () => {
    const bounds = boundsOfFrame(rect, frameMatrix({ scale: 2, x: 0, y: 0 }));
    expect(bounds).toEqual({ height: 80, width: 200, x: 20, y: 40 });
  });

  it('throws for non-finite rect or matrix entries', () => {
    expect(() => boundsOfFrame({ height: 1, width: Number.NaN, x: 0, y: 0 }, IDENTITY)).toThrow(AtlasConfigError);
    expect(() => boundsOfFrame(rect, [1, 0, 0, 1, Number.NaN, 0])).toThrow(AtlasConfigError);
  });
});

describe('resizeRect', () => {
  const rect: Rect = { height: 50, width: 100, x: 0, y: 0 };

  it('anchors the left edge when dragging east', () => {
    expect(resizeRect(rect, 'e', { x: 150, y: 999 })).toEqual({ height: 50, width: 150, x: 0, y: 0 });
  });

  it('anchors the right edge when dragging west', () => {
    expect(resizeRect(rect, 'w', { x: -20, y: 999 })).toEqual({ height: 50, width: 120, x: -20, y: 0 });
  });

  it('anchors the top edge when dragging south', () => {
    expect(resizeRect(rect, 's', { x: 999, y: 80 })).toEqual({ height: 80, width: 100, x: 0, y: 0 });
  });

  it('anchors the bottom edge when dragging north', () => {
    expect(resizeRect(rect, 'n', { x: 999, y: -10 })).toEqual({ height: 60, width: 100, x: 0, y: -10 });
  });

  it('keeps the opposite corner fixed for each corner direction', () => {
    expect(resizeRect(rect, 'se', { x: 200, y: 100 })).toEqual({ height: 100, width: 200, x: 0, y: 0 });
    expect(resizeRect(rect, 'nw', { x: -20, y: -10 })).toEqual({ height: 60, width: 120, x: -20, y: -10 });
    expect(resizeRect(rect, 'ne', { x: 200, y: -10 })).toEqual({ height: 60, width: 200, x: 0, y: -10 });
    expect(resizeRect(rect, 'sw', { x: -20, y: 100 })).toEqual({ height: 100, width: 120, x: -20, y: 0 });
  });

  it('clamps width and height at min without moving the fixed edge', () => {
    expect(resizeRect(rect, 'e', { x: -500, y: 0 }, { min: 4 })).toEqual({ height: 50, width: 4, x: 0, y: 0 });
    expect(resizeRect(rect, 'w', { x: 500, y: 0 }, { min: 4 })).toEqual({ height: 50, width: 4, x: 96, y: 0 });
    expect(resizeRect(rect, 'n', { x: 0, y: 500 }, { min: 4 })).toEqual({ height: 4, width: 100, x: 0, y: 46 });
    expect(resizeRect(rect, 'se', { x: -500, y: -500 }, { min: 4 })).toEqual({ height: 4, width: 4, x: 0, y: 0 });
  });

  it('locks the ratio on a corner drag driven by the wider-moved axis', () => {
    const result = resizeRect(rect, 'se', { x: 200, y: 60 }, { aspect: 2 });
    close(result.width / result.height, 2);
    close(result.x, 0);
    close(result.y, 0);
    close(result.width, 200);
  });

  it('locks the ratio on a corner drag driven by the taller-moved axis', () => {
    const result = resizeRect(rect, 'se', { x: 110, y: 200 }, { aspect: 2 });
    close(result.width / result.height, 2);
    close(result.x, 0);
    close(result.y, 0);
    close(result.height, 200);
  });

  it('keeps the fixed corner anchored under aspect lock', () => {
    const result = resizeRect(rect, 'nw', { x: -100, y: -25 }, { aspect: 2 });
    close(result.width / result.height, 2);
    close(result.x + result.width, 100);
    close(result.y + result.height, 50);
  });

  it('grows the free dimension about its centre on an edge drag', () => {
    const horizontal = resizeRect(rect, 'e', { x: 200, y: 0 }, { aspect: 2 });
    close(horizontal.width / horizontal.height, 2);
    close(horizontal.x, 0);
    close(horizontal.y + horizontal.height / 2, 25);
    const vertical = resizeRect(rect, 's', { x: 0, y: 150 }, { aspect: 2 });
    close(vertical.width / vertical.height, 2);
    close(vertical.y, 0);
    close(vertical.x + vertical.width / 2, 50);
  });

  it('keeps both axes at or above min under aspect lock', () => {
    const result = resizeRect(rect, 'se', { x: -500, y: -500 }, { aspect: 2, min: 10 });
    expect(result.width).toBeGreaterThanOrEqual(10);
    expect(result.height).toBeGreaterThanOrEqual(10);
    close(result.width / result.height, 2);
  });

  it('keeps the ratio when an edge drag collapses past min under aspect lock', () => {
    const wide = resizeRect({ height: 50, width: 100, x: 0, y: 0 }, 'e', { x: -500, y: 0 }, { aspect: 2, min: 10 });
    expect(wide.width).toBeGreaterThanOrEqual(10);
    expect(wide.height).toBeGreaterThanOrEqual(10);
    close(wide.width / wide.height, 2);
    const tall = resizeRect({ height: 50, width: 100, x: 0, y: 0 }, 's', { x: 0, y: -500 }, { aspect: 0.5, min: 10 });
    expect(tall.width).toBeGreaterThanOrEqual(10);
    expect(tall.height).toBeGreaterThanOrEqual(10);
    close(tall.width / tall.height, 0.5);
  });

  it('throws for unknown edges, non-finite inputs, negative min, and non-positive aspect', () => {
    expect(() => resizeRect(rect, 'x' as never, { x: 0, y: 0 })).toThrow(AtlasConfigError);
    expect(() => resizeRect({ height: 1, width: Number.NaN, x: 0, y: 0 }, 'e', { x: 0, y: 0 })).toThrow(
      AtlasConfigError,
    );
    expect(() => resizeRect(rect, 'e', { x: Number.NaN, y: 0 })).toThrow(AtlasConfigError);
    expect(() => resizeRect(rect, 'e', { x: 0, y: 0 }, { min: -1 })).toThrow(AtlasConfigError);
    expect(() => resizeRect(rect, 'e', { x: 0, y: 0 }, { aspect: 0 })).toThrow(AtlasConfigError);
  });
});
