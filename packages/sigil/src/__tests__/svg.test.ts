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

  it('dots style paints circles for data modules and square finders', () => {
    const svg = toSvg(matrix, { dotStyle: 'dots' });
    expect(svg).toContain('<circle');
    expect(svg).toContain('shape-rendering="auto"');
    // The three finder zones contain no circles: finders stay square.
    const circles = [...svg.matchAll(/<circle cx="(\d+(?:\.\d+)?)" cy="(\d+(?:\.\d+)?)"/g)];
    expect(circles.some((m) => Number(m[1]) < 11 && Number(m[2]) < 11)).toBe(false);
  });

  it('rounded style rounds data modules but not finder zones', () => {
    const svg = toSvg(matrix, { dotStyle: 'rounded' });
    expect(svg).toContain('rx="');
    const zoneRects = [...svg.matchAll(/<rect x="(\d+(?:\.\d+)?)" y="(\d+(?:\.\d+)?)"[^>]*>/g)].filter(
      (m) => Number(m[1]) < 11 && Number(m[2]) < 11,
    );
    expect(zoneRects.length).toBeGreaterThan(0);
    expect(zoneRects.every((m) => !m[0].includes('rx='))).toBe(true);
  });

  it('non-square styles still cover exactly the dark modules', () => {
    const svg = toSvg(matrix, { dotStyle: 'dots' });
    // Default margin is 4: shapes are offset by it, modules are not.
    const circles = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map(
      (m) => `${Number(m[1]) - Number(m[3]) - 4},${Number(m[2]) - Number(m[3]) - 4}`,
    );
    const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="1" height="1"/g)]
      .map((m) => `${Number(m[1]) - 4},${Number(m[2]) - 4}`)
      // Exclude the light background rect (width/height equal the full canvas).
      .filter((key) => {
        const [x, y] = key.split(',').map(Number);
        return x >= 0 && y >= 0 && x < matrix.size && y < matrix.size;
      });
    const covered = new Set([...circles, ...rects]);
    expect(covered).toEqual(darkModules(matrix));
  });

  it('gradient replaces the module paint with a two-stop linear gradient', () => {
    const svg = toSvg(matrix, { gradient: { angle: 90, from: '#111111', id: 'g-fixed', to: '#eeeeee' } });
    expect(svg).toContain('<linearGradient id="g-fixed"');
    expect(svg).toContain('stop-color="#111111"');
    expect(svg).toContain('rotate(90 .5 .5)');
    expect(svg).toContain('fill="url(#g-fixed)"');
  });

  it('gradient without an explicit id uses a unique id per call', () => {
    const first = toSvg(matrix, { gradient: { from: '#000000', to: '#ffffff' } });
    const second = toSvg(matrix, { gradient: { from: '#000000', to: '#ffffff' } });
    const idOf = (svg: string) => svg.match(/<linearGradient id="([^"]+)"/)?.[1];
    expect(idOf(first)).toMatch(/^sigil-qr-gradient-\d+$/);
    expect(idOf(first)).not.toBe(idOf(second));
    expect(first).toContain(`fill="url(#${idOf(first)})"`);
  });

  it('image embeds a centered logo and carves the modules under it', () => {
    const svg = toSvg(matrix, { image: { href: 'https://example.test/logo.png', size: 0.4, spacing: 2 } });
    expect(svg).toContain('<image href="https://example.test/logo.png"');
    // Carving: fewer dark modules are painted than the plain render.
    const plain = darkModules(matrix);
    const d = svg.match(/<path d="([^"]+)"/)?.[1] ?? '';
    const carved = modulesFromPath(d, 1, 4);
    expect(carved.size).toBeLessThan(plain.size);
    for (const key of carved) expect(plain.has(key)).toBe(true);
    // The carve region is empty: the very center module is never painted.
    const center = Math.floor(matrix.size / 2);
    expect(carved.has(`${center},${center}`)).toBe(false);
  });

  it('image background patch draws before the logo', () => {
    const svg = toSvg(matrix, { image: { background: '#ffffff', href: 'logo.svg', radius: 2 } });
    const patch = svg.indexOf('fill="#ffffff"');
    const logo = svg.indexOf('<image');
    expect(patch).toBeGreaterThan(-1);
    expect(logo).toBeGreaterThan(patch);
    expect(svg).toContain('rx="2"');
  });

  it('falls back for non-finite gradient angles and non-positive patch radii', () => {
    const svg = toSvg(matrix, {
      gradient: { angle: Number.NaN, from: '#000000', id: 'g0', to: '#ffffff' },
      image: { background: '#ffffff', href: 'logo.svg', radius: -3 },
    });
    expect(svg).toContain('rotate(0 .5 .5)');
    const patch = svg.match(/<rect[^>]*fill="#ffffff"[^>]*>/)?.[0];
    expect(patch).toBeTruthy();
    expect(patch).not.toContain('rx=');
  });

  it('escapes the image href', () => {
    const svg = toSvg(matrix, { image: { href: 'x"onerror=alert(1)' } });
    expect(svg).toContain('href="x&quot;onerror=alert(1)"');
    expect(svg).not.toContain('x"onerror');
  });
});
