import { describe, expect, it } from 'vitest';

import { contrastRatio, parseColor, readableOn } from '../index';

function rgb(r: number, g: number, b: number, a = 1) {
  return { a, b, g, r };
}

describe('contrast', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio(rgb(0, 0, 0), rgb(255, 255, 255))).toBeCloseTo(21, 5);
  });

  it('returns 1 for identical colors', () => {
    expect(contrastRatio(rgb(123, 45, 67), rgb(123, 45, 67))).toBeCloseTo(1, 10);
  });

  it('puts #767676 on white at the AA boundary of about 4.54', () => {
    expect(contrastRatio(parseColor('#767676'), rgb(255, 255, 255))).toBeCloseTo(4.54, 1);
  });

  it('is symmetric', () => {
    const a = parseColor('#336699');
    const b = parseColor('#eef0f2');
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });
});

describe('readableOn', () => {
  const white = rgb(255, 255, 255);
  const lightGray = rgb(200, 200, 200);
  const darkGray = rgb(60, 60, 60);

  it('picks the first candidate meeting the AA threshold', () => {
    expect(readableOn(white, [lightGray, darkGray])).toEqual(darkGray);
  });

  it('returns null when no candidate meets the threshold', () => {
    expect(readableOn(white, [lightGray])).toBeNull();
  });

  it('applies the AAA threshold of 7', () => {
    const mid = rgb(109, 109, 109); // ≈4.5 on white: passes AA, fails AAA
    expect(readableOn(white, [mid])).toEqual(mid);
    expect(readableOn(white, [mid], { level: 'AAA' })).toBeNull();
  });

  it('lowers the threshold to 3 for large text', () => {
    const mid = rgb(140, 140, 140); // ≈3.4 on white: fails normal AA, passes large AA
    expect(readableOn(white, [mid])).toBeNull();
    expect(readableOn(white, [mid], { large: true })).toEqual(mid);
  });
});
