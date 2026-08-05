import { describe, expect, it } from 'vitest';

import { EUR, JPY, USD, format, formatParts, money } from '../index';

describe('format', () => {
  it('formats bigint-backed values without number conversion', () => {
    expect(format(money('1234.56', USD))).toBe('$1,234.56');
    expect(format(money(123456789012345678n, USD, { unit: 'minor' }))).toBe('$1,234,567,890,123,456.78');
  });

  it('honors locale, currency scale, and display options', () => {
    expect(format(money('1234.56', EUR), { locale: 'de-DE' })).toContain('1.234,56');
    expect(format(money('1234', JPY))).toBe('¥1,234');
    expect(format(money('1000', USD), { style: 'code' })).toContain('USD');
  });

  it('joins semantic parts back to the formatted value', () => {
    const value = money('-100.50', USD);

    expect(
      formatParts(value)
        .map((part) => part.value)
        .join(''),
    ).toBe(format(value));
  });

  it('rounds visible fraction digits with named options', () => {
    expect(format(money('100.99', USD), { maximumFractionDigits: 0, minimumFractionDigits: 0 })).toBe('$101');
  });

  it('bounds fraction digits before bigint or Intl work', () => {
    expect(() => format(money('1', USD), { maximumFractionDigits: 21 })).toThrow(/maximum ≤ 20/);
  });

  it('normalizes invalid locale failures into CoinsError', () => {
    expect(() => format(money('1', USD), { locale: 'not_a_locale' })).toThrow(/Cannot/);
  });
});
