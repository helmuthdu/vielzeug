// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { drawToCanvas } from '../canvas';
import { encodeQr } from '../encode';

/**
 * jsdom has no real canvas — a fake 2D context records every fillRect so the
 * test can assert coverage and sizing math (including devicePixelRatio).
 */

interface RectCall {
  fill: string;
  h: number;
  w: number;
  x: number;
  y: number;
}

function fakeCanvas() {
  const fills: RectCall[] = [];
  const scales: number[] = [];
  let fillStyle = '#000';
  const ctx = {
    fillRect(x: number, y: number, w: number, h: number) {
      fills.push({ fill: fillStyle, h, w, x, y });
    },
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(v: string) {
      fillStyle = v;
    },
    scale(x: number) {
      scales.push(x);
    },
  };
  const canvas = {
    getContext: () => ctx,
    height: 0,
    style: { height: '', width: '' } as CSSStyleDeclaration,
    width: 0,
  } as unknown as HTMLCanvasElement;
  return { canvas, fills, scales };
}

/** Temporarily pin devicePixelRatio (jsdom reports 1). */
function withDpr(dpr: number, fn: () => void): void {
  const original = globalThis.devicePixelRatio;
  Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, value: dpr });
  try {
    fn();
  } finally {
    Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, value: original });
  }
}

describe('drawToCanvas', () => {
  const matrix = encodeQr('HELLO WORLD');

  it('sizes the backing store by cssSize × devicePixelRatio', () => {
    withDpr(2, () => {
      const { canvas, fills, scales } = fakeCanvas();
      const css = drawToCanvas(matrix, canvas, { scale: 2 });
      const expected = (matrix.size + 8) * 2;
      expect(css).toBe(expected);
      expect(canvas.width).toBe(expected * 2);
      expect(canvas.height).toBe(expected * 2);
      expect(canvas.style.width).toBe(`${expected}px`);
      expect(scales).toEqual([2]);
      // First fill covers the whole canvas in the light color.
      expect(fills[0]).toEqual({ fill: '#ffffff', h: expected, w: expected, x: 0, y: 0 });
    });
  });

  it('paints one fillRect per dark module', () => {
    const { canvas, fills } = fakeCanvas();
    drawToCanvas(matrix, canvas, { margin: 4, scale: 1 });
    let dark = 0;
    for (let y = 0; y < matrix.size; y++) for (let x = 0; x < matrix.size; x++) if (matrix.get(x, y)) dark++;
    // One light background fill + one fill per dark module.
    expect(fills.length).toBe(1 + dark);
    const darkFills = fills.slice(1);
    const covered = new Set(darkFills.map((f) => `${f.x - 4},${f.y - 4}`));
    for (let y = 0; y < matrix.size; y++)
      for (let x = 0; x < matrix.size; x++) expect(covered.has(`${x},${y}`)).toBe(matrix.get(x, y));
  });

  it('honors custom colors and margin', () => {
    const { canvas, fills } = fakeCanvas();
    drawToCanvas(matrix, canvas, { dark: '#123456', light: '#fed', margin: 2 });
    expect(fills[0].fill).toBe('#fed');
    expect(fills[1].fill).toBe('#123456');
    // Dark modules are offset by the 2-module margin.
    expect(fills.slice(1).every((f) => f.x >= 2 && f.y >= 2)).toBe(true);
  });
});
