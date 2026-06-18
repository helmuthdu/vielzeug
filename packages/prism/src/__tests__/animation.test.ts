import { describe, expect, it, vi } from 'vitest';

import { resolveEasing } from '../animation/easing';
import { animate } from '../animation/transition';
import { tweenColor, tweenNumber } from '../animation/tween';

// ─── tweenNumber ──────────────────────────────────────────────────────────────

describe('tweenNumber', () => {
  it('returns from at t=0', () => {
    expect(tweenNumber(0, 100, 0)).toBe(0);
  });

  it('returns to at t=1', () => {
    expect(tweenNumber(0, 100, 1)).toBe(100);
  });

  it('returns midpoint at t=0.5', () => {
    expect(tweenNumber(0, 100, 0.5)).toBe(50);
  });

  it('handles negative range', () => {
    expect(tweenNumber(100, 0, 0.25)).toBe(75);
  });
});

// ─── tweenColor ───────────────────────────────────────────────────────────────

describe('tweenColor', () => {
  it('returns from color at t=0', () => {
    expect(tweenColor('#000000', '#ffffff', 0)).toBe('rgb(0,0,0)');
  });

  it('returns to color at t=1', () => {
    expect(tweenColor('#000000', '#ffffff', 1)).toBe('rgb(255,255,255)');
  });

  it('interpolates midpoint', () => {
    expect(tweenColor('#000000', '#ffffff', 0.5)).toBe('rgb(128,128,128)');
  });

  it('handles shorthand hex', () => {
    expect(tweenColor('#000', '#fff', 1)).toBe('rgb(255,255,255)');
  });

  it('parses rgb() format', () => {
    expect(tweenColor('rgb(0,0,0)', 'rgb(100,100,100)', 0.5)).toBe('rgb(50,50,50)');
  });

  it('falls back to from color for invalid input at t<0.5', () => {
    expect(tweenColor('not-a-color', '#fff', 0.3)).toBe('not-a-color');
  });

  it('falls back to to color for invalid input at t>=0.5', () => {
    expect(tweenColor('not-a-color', '#fff', 0.7)).toBe('#fff');
  });
});

// ─── resolveEasing ────────────────────────────────────────────────────────────

describe('resolveEasing', () => {
  it('resolves undefined to ease-out (default)', () => {
    const fn = resolveEasing(undefined);

    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(1);
  });

  it('resolves "linear" to identity', () => {
    const fn = resolveEasing('linear');

    expect(fn(0.5)).toBeCloseTo(0.5, 5);
  });

  it('resolves "ease-in" — output < t for t in (0,1)', () => {
    const fn = resolveEasing('ease-in');

    expect(fn(0.5)).toBeLessThan(0.5);
  });

  it('resolves "ease-out" — output > t for t in (0,1)', () => {
    const fn = resolveEasing('ease-out');

    expect(fn(0.5)).toBeGreaterThan(0.5);
  });

  it('passes through custom function unchanged', () => {
    const custom = (t: number) => t * t;
    const fn = resolveEasing(custom);

    expect(fn(0.5)).toBeCloseTo(0.25, 5);
  });

  it('all built-in easings are 0 at t=0 and 1 at t=1', () => {
    const names = ['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const;

    for (const name of names) {
      const fn = resolveEasing(name);

      expect(fn(0)).toBeCloseTo(0, 5);
      expect(fn(1)).toBeCloseTo(1, 5);
    }
  });
});

// ─── animate ──────────────────────────────────────────────────────────────────

describe('animate', () => {
  it('empty targets calls onComplete immediately without RAF', () => {
    const onComplete = vi.fn();

    animate([], { duration: 300 }, onComplete);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('empty targets with no onComplete does not throw', () => {
    expect(() => animate([], { duration: 300 })).not.toThrow();
  });

  it('duration=0 sets final values synchronously and calls onComplete', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const targets = [{ attrs: { width: { from: 0, to: 100 } }, el }];
    const onComplete = vi.fn();

    animate(targets, { duration: 0 }, onComplete);
    expect(el.getAttribute('width')).toBe('100');
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('negative stagger is clamped to 0 — all targets animate without negative delay', () => {
    const el1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const el2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const targets = [
      { attrs: { width: { from: 0, to: 50 } }, el: el1 },
      { attrs: { width: { from: 0, to: 80 } }, el: el2 },
    ];

    animate(targets, { duration: 0, stagger: -999 });
    expect(el1.getAttribute('width')).toBe('50');
    expect(el2.getAttribute('width')).toBe('80');
  });
});
