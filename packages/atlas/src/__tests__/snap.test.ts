import { describe, expect, it } from 'vitest';
import type { Rect } from '../index.js';
import { alignRects, distributeRects, snapRect } from '../index.js';

const rect = (x: number, y: number, width = 10, height = 10): Rect => ({ height, width, x, y });

describe('snapRect', () => {
  it('snaps the left edge to a candidate left edge within threshold', () => {
    const result = snapRect(rect(102, 0), { candidates: [rect(100, 50)], threshold: 5 });
    expect(result.delta).toEqual({ x: -2, y: 0 });
    expect(result.guides).toEqual([{ axis: 'x', from: 0, position: 100, to: 60 }]);
  });

  it('snaps center-to-center on both axes', () => {
    const result = snapRect(rect(0, 0, 20, 20), { candidates: [rect(100, 100, 40, 40)], threshold: 12 });
    // moving center (10,10) -> candidate center (120,120): delta 110 exceeds threshold; no snap.
    expect(result.delta).toEqual({ x: 0, y: 0 });
    expect(result.guides).toEqual([]);
  });

  it('picks the nearest target when several are in range', () => {
    const result = snapRect(rect(103, 0), { candidates: [rect(100, 50), rect(106, 50)], threshold: 5 });
    // moving center 108 snaps to candidate center 110 (nearer than either edge pair)
    expect(result.delta.x).toBe(2);
  });

  it('does not snap beyond the threshold but snaps exactly at it', () => {
    const beyond = snapRect(rect(120, 0), { candidates: [rect(100, 50)], threshold: 5 });
    expect(beyond.delta.x).toBe(0);
    const exact = snapRect(rect(115, 0), { candidates: [rect(100, 50)], threshold: 5 });
    expect(exact.delta.x).toBe(-5);
  });

  it('snaps to grid lines on both axes', () => {
    const result = snapRect(rect(48, 101), { candidates: [], grid: { x: 50, y: 50 }, threshold: 4 });
    expect(result.delta).toEqual({ x: 2, y: -1 });
    expect(result.guides).toEqual([
      { axis: 'x', from: 100, position: 50, to: 110 },
      { axis: 'y', from: 50, position: 100, to: 60 },
    ]);
  });

  it('ignores non-positive or non-finite grid spacing', () => {
    const result = snapRect(rect(48, 0), { candidates: [], grid: { x: 0 }, threshold: 4 });
    expect(result.delta.x).toBe(0);
  });

  it('snaps right edge to candidate right edge', () => {
    const result = snapRect(rect(88, 0), { candidates: [rect(50, 50, 50, 50)], threshold: 4 });
    // moving right edge 98 -> candidate right 100
    expect(result.delta.x).toBe(2);
  });

  it('rejects a negative threshold', () => {
    expect(() => snapRect(rect(0, 0), { candidates: [], threshold: -1 })).toThrow(RangeError);
  });

  it('returns zero delta with no candidates', () => {
    const result = snapRect(rect(5, 5), { candidates: [], threshold: 10 });
    expect(result.delta).toEqual({ x: 0, y: 0 });
    expect(result.guides).toEqual([]);
  });
});

describe('alignRects', () => {
  const rects = [rect(0, 0, 20, 10), rect(30, 25, 10, 10), rect(15, 60, 5, 10)];

  it('aligns left edges to the shared minimum', () => {
    expect(alignRects(rects, 'left').map((r) => r.x)).toEqual([0, 0, 0]);
  });

  it('aligns right edges to the shared maximum', () => {
    expect(alignRects(rects, 'right').map((r) => r.x + r.width)).toEqual([40, 40, 40]);
  });

  it('centers horizontally on the bounds center', () => {
    const aligned = alignRects(rects, 'horizontal-center');
    for (const r of aligned) expect(r.x + r.width / 2).toBe(20);
  });

  it('aligns top and bottom edges', () => {
    expect(alignRects(rects, 'top').map((r) => r.y)).toEqual([0, 0, 0]);
    expect(alignRects(rects, 'bottom').map((r) => r.y + r.height)).toEqual([70, 70, 70]);
  });

  it('centers vertically on the bounds center', () => {
    const aligned = alignRects(rects, 'vertical-center');
    for (const r of aligned) expect(r.y + r.height / 2).toBe(35);
  });

  it('returns an empty list for empty input', () => {
    expect(alignRects([], 'left')).toEqual([]);
  });
});

describe('distributeRects', () => {
  it('equalizes horizontal gaps between three rects', () => {
    const rects = [rect(0, 0, 10, 10), rect(20, 0, 10, 10), rect(100, 0, 10, 10)];
    const spread = distributeRects(rects, 'x');
    expect(spread.map((r) => r.x)).toEqual([0, 50, 100]);
  });

  it('keeps outermost rects fixed and preserves input order in the result', () => {
    const rects = [rect(100, 0, 10, 10), rect(0, 0, 10, 10), rect(40, 0, 10, 10)];
    const spread = distributeRects(rects, 'x');
    expect(spread[0]?.x).toBe(100);
    expect(spread[1]?.x).toBe(0);
    expect(spread[2]?.x).toBe(50);
  });

  it('distributes vertically', () => {
    const rects = [rect(0, 0, 10, 10), rect(0, 20, 10, 30), rect(0, 100, 10, 10)];
    const spread = distributeRects(rects, 'y');
    // total span 110, sizes 50, two gaps of 30 each
    expect(spread.map((r) => r.y)).toEqual([0, 40, 100]);
  });

  it('copies rects unchanged for fewer than three', () => {
    const rects = [rect(0, 0), rect(50, 0)];
    const spread = distributeRects(rects, 'x');
    expect(spread).toEqual(rects);
    expect(spread[0]).not.toBe(rects[0]);
  });
});
