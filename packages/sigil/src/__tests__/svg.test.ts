import { describe, expect, it } from 'vitest';
import { encodeQr } from '../encode';
import { toSvg } from '../svg';
import type { QrMatrix } from '../types';

/** Re-rasterize path 'd' subpaths (M x y hW vH h-W z) into a dark-module set. */
function modulesFromPath(d: string, scale: number, margin: number): Set<string> {
  const out = new Set<string>();
  const re = /M([\d.]+) ([\d.]+)h([\d.]+)v([\d.]+)h-?[\d.]+z/g;
  for (const m of d.matchAll(re)) {
    const x = Number(m[1]) / scale - margin;
    const y = Number(m[2]) / scale - margin;
    const w = Number(m[3]) / scale;
    const h = Number(m[4]) / scale;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.add(`${x + dx},${y + dy}`);
  }
  return out;
}

function darkModules(matrix: QrMatrix): Set<string> {
  const out = new Set<string>();
  for (let y = 0; y < matrix.size; y++)
    for (let x = 0; x < matrix.size; x++) if (matrix.get(x, y)) out.add(`${x},${y}`);
  return out;
}

describe('toSvg', () => {
  const matrix = encodeQr('HELLO WORLD');

  it('produces a viewBox covering size + 2·margin', () => {
    const svg = toSvg(matrix, { margin: 4 });
    expect(svg).toContain(`viewBox="0 0 ${matrix.size + 8} ${matrix.size + 8}"`);
  });

  it('scales the viewBox with scale', () => {
    const svg = toSvg(matrix, { margin: 4, scale: 2 });
    const dim = (matrix.size + 8) * 2;
    expect(svg).toContain(`viewBox="0 0 ${dim} ${dim}"`);
  });

  it('defaults to currentColor and no background rect', () => {
    const svg = toSvg(matrix);
    expect(svg).toContain('fill="currentColor"');
    expect(svg).not.toContain('<rect');
  });

  it('emits a light background rect for a non-transparent light color', () => {
    const svg = toSvg(matrix, { light: '#ffffff' });
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#ffffff"');
  });

  it('sets role="img" and a <title> + aria-label from label', () => {
    const svg = toSvg(matrix, { label: 'Scan me' });
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="Scan me"');
    expect(svg).toContain('<title>Scan me</title>');
  });

  it('escapes markup in the label', () => {
    const svg = toSvg(matrix, { label: '<b>&"x"' });
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('&lt;b&gt;');
  });

  it('optimized path covers exactly the dark modules', () => {
    const svg = toSvg(matrix, { optimizePath: true });
    const d = svg.match(/<path d="([^"]+)"/)?.[1] ?? '';
    expect(modulesFromPath(d, 1, 4)).toEqual(darkModules(matrix));
  });

  it('rects output covers identical modules', () => {
    const svg = toSvg(matrix, { optimizePath: false });
    const d = svg.match(/<path d="([^"]+)"/)?.[1] ?? '';
    expect(modulesFromPath(d, 1, 4)).toEqual(darkModules(matrix));
  });

  it('optimized output is smaller than per-module rects', () => {
    const optimized = toSvg(matrix, { optimizePath: true });
    const rects = toSvg(matrix, { optimizePath: false });
    expect(optimized.length).toBeLessThan(rects.length);
  });
});
