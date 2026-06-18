import { boundedCache } from '../_cache';
import { InvalidCurrencyError } from '../errors';
import { applyRounding, getCurrencyDecimals, parseRational, pow10, validateCurrencyCode } from '../utils';

describe('boundedCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = boundedCache<string, number>(4);

    expect(cache.get('x')).toBeUndefined();
  });

  it('stores and retrieves a value', () => {
    const cache = boundedCache<string, number>(4);

    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('overwrites an existing key', () => {
    const cache = boundedCache<string, number>(4);

    cache.set('a', 1);
    cache.set('a', 2);
    expect(cache.get('a')).toBe(2);
  });

  it('evicts the oldest entry when full (FIFO)', () => {
    const cache = boundedCache<string, number>(3);

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // evicts 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('does not evict when size is below maxSize', () => {
    const cache = boundedCache<string, number>(10);

    for (let i = 0; i < 9; i++) cache.set(String(i), i);

    expect(cache.get('0')).toBe(0);
    expect(cache.get('8')).toBe(8);
  });

  it('works with maxSize of 1 (single-slot cache)', () => {
    const cache = boundedCache<string, number>(1);

    cache.set('a', 10);
    expect(cache.get('a')).toBe(10);
    cache.set('b', 20); // evicts 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(20);
  });
});

describe('pow10', () => {
  it('returns 1n for exponent 0', () => {
    expect(pow10(0)).toBe(1n);
  });

  it('returns 10n for exponent 1', () => {
    expect(pow10(1)).toBe(10n);
  });

  it('returns 100n for exponent 2', () => {
    expect(pow10(2)).toBe(100n);
  });

  it('returns 1000n for exponent 3', () => {
    expect(pow10(3)).toBe(1000n);
  });

  it('handles large exponents', () => {
    expect(pow10(18)).toBe(1000000000000000000n);
  });
});

describe('parseRational', () => {
  describe('standard decimal strings', () => {
    it('parses positive integer', () => {
      expect(parseRational('3')).toEqual({ denominator: 1n, negative: false, numerator: 3n });
    });

    it('parses zero', () => {
      expect(parseRational('0')).toEqual({ denominator: 1n, negative: false, numerator: 0n });
    });

    it('parses negative zero', () => {
      expect(parseRational('-0')).toEqual({ denominator: 1n, negative: true, numerator: 0n });
    });

    it('parses simple decimal', () => {
      expect(parseRational('1.5')).toEqual({ denominator: 10n, negative: false, numerator: 15n });
    });

    it('parses negative decimal', () => {
      expect(parseRational('-0.5')).toEqual({ denominator: 10n, negative: true, numerator: 5n });
    });

    it('parses multi-digit fraction', () => {
      expect(parseRational('3.14')).toEqual({ denominator: 100n, negative: false, numerator: 314n });
    });

    it('parses large integer', () => {
      expect(parseRational('1000000')).toEqual({ denominator: 1n, negative: false, numerator: 1000000n });
    });
  });

  describe('scientific notation', () => {
    it('expands 1e-7', () => {
      expect(parseRational('1e-7')).toEqual({ denominator: 10000000n, negative: false, numerator: 1n });
    });

    it('expands 1.23e+5', () => {
      expect(parseRational('1.23e+5')).toEqual({ denominator: 1n, negative: false, numerator: 123000n });
    });

    it('expands negative scientific notation', () => {
      expect(parseRational('-3.14E+2')).toEqual({ denominator: 1n, negative: true, numerator: 314n });
    });

    it('expands 1e+21', () => {
      const result = parseRational('1e+21');

      expect(result.numerator).toBe(1000000000000000000000n);
      expect(result.denominator).toBe(1n);
      expect(result.negative).toBe(false);
    });
  });

  describe('invalid inputs', () => {
    it('throws RangeError for empty string', () => {
      expect(() => parseRational('')).toThrow(RangeError);
      expect(() => parseRational('')).toThrow('Invalid decimal string');
    });

    it('throws RangeError for exponent > 1000 (S1 security guard)', () => {
      expect(() => parseRational('1e1001')).toThrow(RangeError);
      expect(() => parseRational('1e1001')).toThrow('exponent too large');
    });

    it('throws RangeError for negative exponent < -1000 (S1 security guard)', () => {
      expect(() => parseRational('1e-1001')).toThrow(RangeError);
      expect(() => parseRational('1e-1001')).toThrow('exponent too large');
    });

    it('does not throw for exponent exactly at the limit (±1000)', () => {
      expect(() => parseRational('1e1000')).not.toThrow();
      expect(() => parseRational('1e-1000')).not.toThrow();
    });

    it('throws RangeError for non-numeric string', () => {
      expect(() => parseRational('abc')).toThrow(RangeError);
    });

    it('throws RangeError for multiple dots', () => {
      expect(() => parseRational('1.2.3')).toThrow(RangeError);
    });

    it('throws RangeError for NaN string', () => {
      expect(() => parseRational('NaN')).toThrow(RangeError);
    });

    it('throws RangeError for Infinity string', () => {
      expect(() => parseRational('Infinity')).toThrow(RangeError);
    });
  });
});

describe('applyRounding', () => {
  describe('no remainder → always returns quotient unchanged', () => {
    for (const mode of ['half-away-from-zero', 'half-even', 'ceiling', 'floor', 'up', 'down'] as const) {
      it(`mode '${mode}' with zero remainder returns quotient`, () => {
        expect(applyRounding(5n, 0n, 10n, mode)).toBe(5n);
      });
    }
  });

  describe("'half-away-from-zero'", () => {
    it('rounds up at exactly half', () => {
      expect(applyRounding(3n, 5n, 10n, 'half-away-from-zero')).toBe(4n);
    });

    it('rounds down below half', () => {
      expect(applyRounding(3n, 4n, 10n, 'half-away-from-zero')).toBe(3n);
    });

    it('rounds up above half', () => {
      expect(applyRounding(3n, 6n, 10n, 'half-away-from-zero')).toBe(4n);
    });
  });

  describe("'half-even' (banker's rounding)", () => {
    it('rounds to even when exactly half: 1.5 → 2 (nearest even)', () => {
      expect(applyRounding(1n, 5n, 10n, 'half-even')).toBe(2n);
    });

    it('rounds to even when exactly half: 2.5 → 2 (nearest even)', () => {
      expect(applyRounding(2n, 5n, 10n, 'half-even')).toBe(2n);
    });

    it('rounds to even when exactly half: 3.5 → 4 (nearest even)', () => {
      expect(applyRounding(3n, 5n, 10n, 'half-even')).toBe(4n);
    });

    it('rounds down below half', () => {
      expect(applyRounding(3n, 4n, 10n, 'half-even')).toBe(3n);
    });

    it('rounds up above half', () => {
      expect(applyRounding(3n, 6n, 10n, 'half-even')).toBe(4n);
    });
  });

  describe("'ceiling'", () => {
    it('rounds up for positive results', () => {
      expect(applyRounding(3n, 1n, 10n, 'ceiling', false)).toBe(4n);
    });

    it('truncates for negative results', () => {
      expect(applyRounding(3n, 1n, 10n, 'ceiling', true)).toBe(3n);
    });
  });

  describe("'floor'", () => {
    it('truncates for positive results', () => {
      expect(applyRounding(3n, 1n, 10n, 'floor', false)).toBe(3n);
    });

    it('rounds away from zero for negative results', () => {
      expect(applyRounding(3n, 1n, 10n, 'floor', true)).toBe(4n);
    });
  });

  describe("'up'", () => {
    it('rounds away from zero regardless of sign (positive)', () => {
      expect(applyRounding(3n, 1n, 10n, 'up', false)).toBe(4n);
    });

    it('rounds away from zero regardless of sign (negative)', () => {
      expect(applyRounding(3n, 1n, 10n, 'up', true)).toBe(4n);
    });
  });

  describe("'down'", () => {
    it('truncates toward zero regardless of sign (positive)', () => {
      expect(applyRounding(3n, 9n, 10n, 'down', false)).toBe(3n);
    });

    it('truncates toward zero regardless of sign (negative)', () => {
      expect(applyRounding(3n, 9n, 10n, 'down', true)).toBe(3n);
    });
  });

  it('throws RangeError for unknown mode', () => {
    expect(() => applyRounding(3n, 5n, 10n, 'unknown-mode' as never)).toThrow(RangeError);
    expect(() => applyRounding(3n, 5n, 10n, 'unknown-mode' as never)).toThrow('Unknown rounding mode');
  });
});

describe('getCurrencyDecimals', () => {
  it('returns 2 for USD', () => {
    expect(getCurrencyDecimals('USD')).toBe(2);
  });

  it('returns 0 for JPY', () => {
    expect(getCurrencyDecimals('JPY')).toBe(0);
  });

  it('returns 3 for KWD', () => {
    expect(getCurrencyDecimals('KWD')).toBe(3);
  });

  it('returns cached result on repeated calls', () => {
    expect(getCurrencyDecimals('EUR')).toBe(2);
    expect(getCurrencyDecimals('EUR')).toBe(2);
  });

  it('throws InvalidCurrencyError for invalid currency code', () => {
    expect(() => getCurrencyDecimals('NOTREAL')).toThrow(InvalidCurrencyError);
    expect(() => getCurrencyDecimals('NOTREAL')).toThrow('Invalid ISO 4217 currency code');
  });
});

describe('validateCurrencyCode', () => {
  it('returns code string for valid code', () => {
    expect(validateCurrencyCode('USD')).toBe('USD');
    expect(validateCurrencyCode('EUR')).toBe('EUR');
  });

  it('throws InvalidCurrencyError for invalid code', () => {
    expect(() => validateCurrencyCode('FAKE')).toThrow(InvalidCurrencyError);
  });
});
