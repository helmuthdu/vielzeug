import { vi } from 'vitest';

import {
  abs,
  add,
  allocate,
  clamp,
  compare,
  CoinsError,
  CurrencyMismatchError,
  divide,
  fromJSON,
  greaterThan,
  greaterThanOrEqual,
  InvalidCurrencyError,
  isEqual,
  isMoney,
  isNegative,
  isNonNegative,
  isNonPositive,
  isPositive,
  isZero,
  lessThan,
  lessThanOrEqual,
  max,
  min,
  money,
  multiply,
  negate,
  roundTo,
  splitEvenly,
  subtract,
  sum,
  toDecimal,
  toJSON,
  toNumber,
  withAmount,
} from '../money';

describe('money factory', () => {
  describe('invalid amount strings', () => {
    it('throws RangeError for non-numeric string', () => {
      expect(() => money('abc', 'USD')).toThrow(RangeError);
      expect(() => money('abc', 'USD')).toThrow('Invalid decimal string');
    });

    it('throws RangeError for amount with multiple dots', () => {
      expect(() => money('1.2.3', 'USD')).toThrow(RangeError);
    });

    it('throws RangeError for empty string amount', () => {
      expect(() => money('', 'USD')).toThrow(RangeError);
    });
  });

  describe('special number inputs', () => {
    it('throws RangeError for NaN', () => {
      expect(() => money(NaN, 'USD')).toThrow(RangeError);
      expect(() => money(NaN, 'USD')).toThrow('Invalid decimal string');
    });

    it('throws RangeError for Infinity', () => {
      expect(() => money(Infinity, 'USD')).toThrow(RangeError);
      expect(() => money(Infinity, 'USD')).toThrow('Invalid decimal string');
    });

    it('throws RangeError for -Infinity', () => {
      expect(() => money(-Infinity, 'USD')).toThrow(RangeError);
      expect(() => money(-Infinity, 'USD')).toThrow('Invalid decimal string');
    });
  });

  describe('from decimal string', () => {
    it('parses standard two-decimal amounts', () => {
      expect(money('1234.56', 'USD')).toEqual({ amount: 123456n, currency: 'USD' });
    });

    it('pads short fraction to currency decimals', () => {
      expect(money('1.5', 'USD')).toEqual({ amount: 150n, currency: 'USD' });
    });

    it('handles missing fraction (whole number string)', () => {
      expect(money('100', 'USD')).toEqual({ amount: 10000n, currency: 'USD' });
    });

    it('handles zero', () => {
      expect(money('0.00', 'USD')).toEqual({ amount: 0n, currency: 'USD' });
    });

    it('handles negative amounts', () => {
      expect(money('-10.50', 'USD')).toEqual({ amount: -1050n, currency: 'USD' });
    });

    it('rounds up when extra digit >= 5', () => {
      expect(money('1.005', 'USD')).toEqual({ amount: 101n, currency: 'USD' });
      expect(money('1.235', 'USD')).toEqual({ amount: 124n, currency: 'USD' });
    });

    it('rounds down when extra digit < 5', () => {
      expect(money('1.004', 'USD')).toEqual({ amount: 100n, currency: 'USD' });
    });
  });

  describe('from number', () => {
    it('parses standard float', () => {
      expect(money(1234.56, 'USD')).toEqual({ amount: 123456n, currency: 'USD' });
    });

    it('parses integer', () => {
      expect(money(100, 'USD')).toEqual({ amount: 10000n, currency: 'USD' });
    });

    it('handles very small numbers that produce scientific notation via String()', () => {
      // String(1e-7) === '1e-7' — parseRational must expand it before parsing
      // 1e-7 USD = $0.0000001, rounds to $0.00 (0 minor units)
      expect(money(1e-7, 'USD')).toEqual({ amount: 0n, currency: 'USD' });
    });

    it('handles very large numbers that produce scientific notation via String()', () => {
      // String(1e21) === '1e+21' — expanded to '1000000000000000000000'
      expect(money(1e21, 'JPY')).toEqual({ amount: 1000000000000000000000n, currency: 'JPY' });
    });

    it('handles -0 (negative zero) — produces 0n minor units', () => {
      // String(-0) === '0'; parseRational('0') → { negative: false, numerator: 0n }
      expect(money(-0, 'USD')).toEqual({ amount: 0n, currency: 'USD' });
    });
  });

  describe('from bigint (raw minor units)', () => {
    it('uses bigint as-is', () => {
      expect(money(123456n, 'USD')).toEqual({ amount: 123456n, currency: 'USD' });
    });

    it('accepts negative bigint', () => {
      expect(money(-100n, 'USD')).toEqual({ amount: -100n, currency: 'USD' });
    });
  });

  describe('currency validation', () => {
    it('throws InvalidCurrencyError for invalid currency code (string amount)', () => {
      expect(() => money('100.00', 'NOTREAL')).toThrow(InvalidCurrencyError);
      expect(() => money('100.00', 'NOTREAL')).toThrow('Invalid ISO 4217 currency code');
    });

    it('throws InvalidCurrencyError for invalid currency code (number amount)', () => {
      expect(() => money(100, 'NOTREAL')).toThrow(InvalidCurrencyError);
    });

    it('throws InvalidCurrencyError for invalid currency code (bigint amount)', () => {
      expect(() => money(100n, 'NOTREAL')).toThrow(InvalidCurrencyError);
    });
  });

  describe('zero-decimal currencies', () => {
    it('JPY has no fractional units', () => {
      expect(money('1234', 'JPY')).toEqual({ amount: 1234n, currency: 'JPY' });
      expect(money(1234, 'JPY')).toEqual({ amount: 1234n, currency: 'JPY' });
    });
  });

  describe('three-decimal currencies', () => {
    it('KWD stores three decimal places', () => {
      expect(money('1.234', 'KWD')).toEqual({ amount: 1234n, currency: 'KWD' });
    });

    it('BHD stores three decimal places', () => {
      expect(money('123.456', 'BHD')).toEqual({ amount: 123456n, currency: 'BHD' });
    });
  });
});

describe('money(0n) as zero', () => {
  it('creates a zero Money for USD', () => {
    expect(money(0n, 'USD')).toEqual({ amount: 0n, currency: 'USD' });
  });

  it('creates a zero Money for JPY (zero-decimal)', () => {
    expect(money(0n, 'JPY')).toEqual({ amount: 0n, currency: 'JPY' });
  });

  it('is recognized as zero by isZero()', () => {
    expect(isZero(money(0n, 'USD'))).toBe(true);
  });
});

describe('clamp', () => {
  const lower = money('1.00', 'USD');
  const upper = money('10.00', 'USD');

  it('returns m unchanged when within bounds', () => {
    expect(clamp(money('5.00', 'USD'), lower, upper)).toEqual({ amount: 500n, currency: 'USD' });
  });

  it('clamps to lower when m < lower', () => {
    expect(clamp(money('0.50', 'USD'), lower, upper)).toEqual({ amount: 100n, currency: 'USD' });
  });

  it('clamps to upper when m > upper', () => {
    expect(clamp(money('15.00', 'USD'), lower, upper)).toEqual({ amount: 1000n, currency: 'USD' });
  });

  it('returns lower when m equals lower', () => {
    expect(clamp(lower, lower, upper)).toEqual(lower);
  });

  it('returns upper when m equals upper', () => {
    expect(clamp(upper, lower, upper)).toEqual(upper);
  });

  it('works when lower === upper (degenerate range)', () => {
    expect(clamp(money('5.00', 'USD'), lower, lower)).toEqual(lower);
  });

  it('handles negative amounts within range', () => {
    const lo = money('-10.00', 'USD');
    const hi = money('-1.00', 'USD');

    expect(clamp(money('-5.00', 'USD'), lo, hi)).toEqual({ amount: -500n, currency: 'USD' });
    expect(clamp(money('-15.00', 'USD'), lo, hi)).toEqual({ amount: -1000n, currency: 'USD' });
    expect(clamp(money('0.00', 'USD'), lo, hi)).toEqual({ amount: -100n, currency: 'USD' });
  });

  it('throws RangeError when lower > upper', () => {
    expect(() => clamp(money('5.00', 'USD'), upper, lower)).toThrow(RangeError);
    expect(() => clamp(money('5.00', 'USD'), upper, lower)).toThrow('clamp');
  });

  it('throws CurrencyMismatchError on currency mismatch (m vs bounds)', () => {
    expect(() => clamp(money('5.00', 'EUR'), lower, upper)).toThrow(CurrencyMismatchError);
    expect(() => clamp(money('5.00', 'EUR'), lower, upper)).toThrow('Currency mismatch');
  });

  it('throws CurrencyMismatchError on currency mismatch (lower vs upper)', () => {
    expect(() => clamp(money('5.00', 'USD'), lower, money('10.00', 'EUR'))).toThrow(CurrencyMismatchError);
  });

  it('throws CurrencyMismatchError when only upper mismatches (m and lower same, upper different)', () => {
    // Exercises the new upfront guard: m.currency === lower.currency but !== upper.currency
    expect(() => clamp(money('5.00', 'USD'), money('1.00', 'USD'), money('10.00', 'EUR'))).toThrow(
      CurrencyMismatchError,
    );
    expect(() => clamp(money('5.00', 'USD'), money('1.00', 'USD'), money('10.00', 'EUR'))).toThrow('Currency mismatch');
  });

  it('throws CurrencyMismatchError when only lower mismatches (m and upper same, lower different)', () => {
    expect(() => clamp(money('5.00', 'USD'), money('1.00', 'EUR'), money('10.00', 'USD'))).toThrow(
      CurrencyMismatchError,
    );
  });
});

describe('add', () => {
  it('adds same-currency amounts', () => {
    expect(add(money('10.00', 'USD'), money('5.50', 'USD'))).toEqual({ amount: 1550n, currency: 'USD' });
  });

  it('handles negative addends', () => {
    expect(add(money('10.00', 'USD'), money('-3.00', 'USD'))).toEqual({ amount: 700n, currency: 'USD' });
  });

  it('throws on currency mismatch', () => {
    expect(() => add(money('10.00', 'USD'), money('5.00', 'EUR'))).toThrow(CurrencyMismatchError);
    expect(() => add(money('10.00', 'USD'), money('5.00', 'EUR'))).toThrow('Currency mismatch');
  });
});

describe('subtract', () => {
  it('subtracts same-currency amounts', () => {
    expect(subtract(money('10.00', 'USD'), money('3.00', 'USD'))).toEqual({ amount: 700n, currency: 'USD' });
  });

  it('produces negative result when b > a', () => {
    expect(subtract(money('3.00', 'USD'), money('10.00', 'USD'))).toEqual({ amount: -700n, currency: 'USD' });
  });

  it('throws on currency mismatch', () => {
    expect(() => subtract(money('10.00', 'USD'), money('5.00', 'EUR'))).toThrow(CurrencyMismatchError);
    expect(() => subtract(money('10.00', 'USD'), money('5.00', 'EUR'))).toThrow('Currency mismatch');
  });
});

describe('multiply', () => {
  it('multiplies by integer', () => {
    expect(multiply(money('10.00', 'USD'), 3)).toEqual({ amount: 3000n, currency: 'USD' });
  });

  it('multiplies by decimal string', () => {
    expect(multiply(money('100.00', 'USD'), '0.85')).toEqual({ amount: 8500n, currency: 'USD' });
  });

  it('multiplies by decimal number', () => {
    expect(multiply(money('200.00', 'USD'), 1.5)).toEqual({ amount: 30000n, currency: 'USD' });
  });

  it('handles negative factor', () => {
    expect(multiply(money('100.00', 'USD'), -1)).toEqual({ amount: -10000n, currency: 'USD' });
  });

  it('handles negative money with positive factor', () => {
    expect(multiply(money('-100.00', 'USD'), 2)).toEqual({ amount: -20000n, currency: 'USD' });
  });

  it('handles negative money with negative factor', () => {
    expect(multiply(money('-100.00', 'USD'), -1)).toEqual({ amount: 10000n, currency: 'USD' });
  });

  it('handles zero factor', () => {
    expect(multiply(money('100.00', 'USD'), 0)).toEqual({ amount: 0n, currency: 'USD' });
  });

  it('handles very small number factors in scientific notation', () => {
    // String(1e-7) === '1e-7' — must not throw; 10000 * 1e-7 = 0.001 cents → rounds to 0
    expect(multiply(money('100.00', 'USD'), 1e-7)).toEqual({ amount: 0n, currency: 'USD' });
    // 100 cents * 0.01 = 1 cent
    expect(multiply(money('1.00', 'USD'), 1e-2)).toEqual({ amount: 1n, currency: 'USD' });
  });

  it('handles very large number factors in scientific notation', () => {
    // String(1e21) === '1e+21' — must not throw
    expect(multiply(money(1n, 'USD'), 1e21)).toEqual({ amount: 1000000000000000000000n, currency: 'USD' });
  });

  describe('rounding modes', () => {
    // 100 cents * 0.339 = 33.9 cents
    it("'half-away-from-zero' rounds .5 away from zero (default)", () => {
      expect(multiply(money('1.00', 'USD'), '1.005')).toEqual({ amount: 101n, currency: 'USD' });
      expect(multiply(money('1.00', 'USD'), '1.004')).toEqual({ amount: 100n, currency: 'USD' });
    });

    it("'down' truncates toward zero", () => {
      expect(multiply(money('1.00', 'USD'), '0.339', 'down')).toEqual({ amount: 33n, currency: 'USD' });
      expect(multiply(money('-1.00', 'USD'), '0.339', 'down')).toEqual({ amount: -33n, currency: 'USD' });
    });

    it("'up' rounds away from zero", () => {
      expect(multiply(money('1.00', 'USD'), '0.331', 'up')).toEqual({ amount: 34n, currency: 'USD' });
      expect(multiply(money('-1.00', 'USD'), '0.331', 'up')).toEqual({ amount: -34n, currency: 'USD' });
    });

    it("'floor' rounds toward −∞", () => {
      expect(multiply(money('1.00', 'USD'), '0.339', 'floor')).toEqual({ amount: 33n, currency: 'USD' });
      expect(multiply(money('-1.00', 'USD'), '0.331', 'floor')).toEqual({ amount: -34n, currency: 'USD' });
    });

    it("'ceiling' rounds toward +∞", () => {
      expect(multiply(money('1.00', 'USD'), '0.331', 'ceiling')).toEqual({ amount: 34n, currency: 'USD' });
      expect(multiply(money('-1.00', 'USD'), '0.339', 'ceiling')).toEqual({ amount: -33n, currency: 'USD' });
    });

    it("'half-even' rounds to nearest even (banker's rounding)", () => {
      // 100 * 0.045 = 4.5 → nearest even = 4
      expect(multiply(money('1.00', 'USD'), '0.045', 'half-even')).toEqual({ amount: 4n, currency: 'USD' });
      // 100 * 0.055 = 5.5 → nearest even = 6
      expect(multiply(money('1.00', 'USD'), '0.055', 'half-even')).toEqual({ amount: 6n, currency: 'USD' });
    });
  });

  describe('negative near-zero rounding (1 minor unit × factor < 1)', () => {
    // -1 cent × 0.5 = -0.5 cents — quotient is 0n but true result is negative
    it("'half-away-from-zero' rounds -0.5 to -1", () => {
      expect(multiply(money(-1n, 'USD'), '0.5')).toEqual({ amount: -1n, currency: 'USD' });
    });

    it("'floor' rounds -0.5 toward −∞ to -1", () => {
      expect(multiply(money(-1n, 'USD'), '0.5', 'floor')).toEqual({ amount: -1n, currency: 'USD' });
    });

    it("'ceiling' rounds -0.5 toward +∞ to 0", () => {
      expect(multiply(money(-1n, 'USD'), '0.5', 'ceiling')).toEqual({ amount: 0n, currency: 'USD' });
    });

    it("'up' rounds -0.5 away from zero to -1", () => {
      expect(multiply(money(-1n, 'USD'), '0.5', 'up')).toEqual({ amount: -1n, currency: 'USD' });
    });

    it("'down' truncates -0.5 toward zero to 0", () => {
      expect(multiply(money(-1n, 'USD'), '0.5', 'down')).toEqual({ amount: 0n, currency: 'USD' });
    });
  });
});

describe('divide', () => {
  it('divides by integer', () => {
    expect(divide(money('99.00', 'USD'), 3)).toEqual({ amount: 3300n, currency: 'USD' });
  });

  it('divides by decimal string', () => {
    expect(divide(money('100.00', 'USD'), '2.5')).toEqual({ amount: 4000n, currency: 'USD' });
  });

  it('divides by decimal number', () => {
    expect(divide(money('150.00', 'USD'), 1.5)).toEqual({ amount: 10000n, currency: 'USD' });
  });

  it('handles negative divisor', () => {
    expect(divide(money('100.00', 'USD'), -2)).toEqual({ amount: -5000n, currency: 'USD' });
  });

  it('handles negative money', () => {
    expect(divide(money('-100.00', 'USD'), 4)).toEqual({ amount: -2500n, currency: 'USD' });
  });

  it('throws on division by zero', () => {
    expect(() => divide(money('100.00', 'USD'), 0)).toThrow(RangeError);
    expect(() => divide(money('100.00', 'USD'), '0.0')).toThrow(RangeError);
  });

  it('handles very small number divisors in scientific notation', () => {
    // String(1e-7) === '1e-7' — must expand before parsing.
    // $1.00 / 1e-7 = $10,000,000 = 1,000,000,000 cents
    expect(divide(money('1.00', 'USD'), 1e-7)).toEqual({ amount: 1000000000n, currency: 'USD' });
  });

  it('handles very large number divisors in scientific notation', () => {
    // String(1e21) === '1e+21' — must not throw
    // 10000 / 1e21 rounds to 0
    expect(divide(money('100.00', 'USD'), 1e21)).toEqual({ amount: 0n, currency: 'USD' });
  });

  describe('rounding modes', () => {
    // 10000 / 3 = 3333.33...
    it("'down' truncates toward zero (default-equivalent when positive)", () => {
      expect(divide(money('100.00', 'USD'), 3, 'down')).toEqual({ amount: 3333n, currency: 'USD' });
    });

    it("'half-away-from-zero' (default) rounds 3333.33 down to 3333", () => {
      expect(divide(money('100.00', 'USD'), 3)).toEqual({ amount: 3333n, currency: 'USD' });
    });

    it("'ceiling' rounds fractional positive result up", () => {
      expect(divide(money('100.00', 'USD'), 3, 'ceiling')).toEqual({ amount: 3334n, currency: 'USD' });
    });

    it("'floor' rounds fractional negative result down", () => {
      expect(divide(money('-100.00', 'USD'), 3, 'floor')).toEqual({ amount: -3334n, currency: 'USD' });
    });

    it("'ceiling' truncates fractional negative result (toward zero)", () => {
      expect(divide(money('-100.00', 'USD'), 3, 'ceiling')).toEqual({ amount: -3333n, currency: 'USD' });
    });
  });

  describe('negative near-zero rounding (1 minor unit ÷ 2)', () => {
    // -1 cent ÷ 2 = -0.5 cents — quotient is 0n but true result is negative
    it("'half-away-from-zero' rounds -0.5 to -1", () => {
      expect(divide(money(-1n, 'USD'), 2)).toEqual({ amount: -1n, currency: 'USD' });
    });

    it("'floor' rounds -0.5 toward −∞ to -1", () => {
      expect(divide(money(-1n, 'USD'), 2, 'floor')).toEqual({ amount: -1n, currency: 'USD' });
    });

    it("'ceiling' rounds -0.5 toward +∞ to 0", () => {
      expect(divide(money(-1n, 'USD'), 2, 'ceiling')).toEqual({ amount: 0n, currency: 'USD' });
    });

    it("'up' rounds -0.5 away from zero to -1", () => {
      expect(divide(money(-1n, 'USD'), 2, 'up')).toEqual({ amount: -1n, currency: 'USD' });
    });

    it("'down' truncates -0.5 toward zero to 0", () => {
      expect(divide(money(-1n, 'USD'), 2, 'down')).toEqual({ amount: 0n, currency: 'USD' });
    });
  });
});

describe('allocate', () => {
  describe('single ratio', () => {
    it('returns the full amount when given one ratio', () => {
      const m = money('10.00', 'USD');

      expect(allocate(m, [1])).toEqual([m]);
      expect(allocate(m, [99])).toEqual([m]);
    });
  });

  describe('equal splits', () => {
    it('distributes evenly when divisible', () => {
      expect(allocate(money('9.00', 'USD'), [1, 1, 1])).toEqual([
        { amount: 300n, currency: 'USD' },
        { amount: 300n, currency: 'USD' },
        { amount: 300n, currency: 'USD' },
      ]);
    });

    it('gives the extra penny to the first share (largest remainder first)', () => {
      // $10.00 / 3 = $3.3333... → [$3.34, $3.33, $3.33]
      const result = allocate(money('10.00', 'USD'), [1, 1, 1]);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ amount: 334n, currency: 'USD' });
      expect(result[1]).toEqual({ amount: 333n, currency: 'USD' });
      expect(result[2]).toEqual({ amount: 333n, currency: 'USD' });
      expect(result.reduce((a, b) => a + b.amount, 0n)).toBe(1000n);
    });
  });

  describe('unequal ratios', () => {
    it('distributes 30/70 split exactly', () => {
      const result = allocate(money('10.00', 'USD'), [3, 7]);

      expect(result[0]).toEqual({ amount: 300n, currency: 'USD' });
      expect(result[1]).toEqual({ amount: 700n, currency: 'USD' });
    });

    it('distributes 1/2/3 split exactly', () => {
      const result = allocate(money('10.00', 'USD'), [1, 2, 3]);

      expect(result.reduce((a, b) => a + b.amount, 0n)).toBe(1000n);
      // 1/6 ≈ 1.67, 2/6 ≈ 3.33, 3/6 = 5.00
      expect(result[2]).toEqual({ amount: 500n, currency: 'USD' });
    });
  });

  describe('string ratios', () => {
    it('handles integer strings the same as numbers', () => {
      const result = allocate(money('10.00', 'USD'), ['1', '2']);

      expect(result.reduce((a, b) => a + b.amount, 0n)).toBe(1000n);
      expect(result[0]).toEqual({ amount: 333n, currency: 'USD' });
      expect(result[1]).toEqual({ amount: 667n, currency: 'USD' });
    });

    it('handles decimal string weights losslessly', () => {
      const result = allocate(money('10.00', 'USD'), ['0.3', '0.7']);

      expect(result[0]).toEqual({ amount: 300n, currency: 'USD' });
      expect(result[1]).toEqual({ amount: 700n, currency: 'USD' });
    });

    it('never loses or gains a minor unit with string ratios', () => {
      const result = allocate(money('7.00', 'USD'), ['0.333', '0.333', '0.334']);

      expect(result.reduce((a, b) => a + b.amount, 0n)).toBe(700n);
    });
  });

  describe('indivisible amounts', () => {
    it('never loses or gains a penny with any ratio combination', () => {
      for (const amount of [1n, 7n, 10n, 100n, 10000n]) {
        for (const ratios of [
          [1, 1],
          [1, 1, 1],
          [2, 3],
          [1, 2, 3],
        ] as number[][]) {
          const parts = allocate(money(amount, 'USD'), ratios);
          const total = parts.reduce((s, p) => s + p.amount, 0n);

          expect(total).toBe(amount);
        }
      }
    });
  });

  describe('negative amounts', () => {
    it('allocates negative money correctly', () => {
      const result = allocate(money('-10.00', 'USD'), [1, 1, 1]);

      expect(result[0]).toEqual({ amount: -334n, currency: 'USD' });
      expect(result[1]).toEqual({ amount: -333n, currency: 'USD' });
      expect(result[2]).toEqual({ amount: -333n, currency: 'USD' });
      expect(result.reduce((a, b) => a + b.amount, 0n)).toBe(-1000n);
    });
  });

  describe('float ratios', () => {
    it('handles fractional weights', () => {
      // [0.5, 0.5] = [1, 1]
      const result = allocate(money('10.00', 'USD'), [0.5, 0.5]);

      expect(result.reduce((a, b) => a + b.amount, 0n)).toBe(1000n);
    });
  });

  describe('zero ratios', () => {
    it('allocates nothing to zero-weight slots', () => {
      const result = allocate(money('10.00', 'USD'), [0, 1]);

      expect(result[0]).toEqual({ amount: 0n, currency: 'USD' });
      expect(result[1]).toEqual({ amount: 1000n, currency: 'USD' });
    });
  });

  describe('error cases', () => {
    it('throws on empty ratios', () => {
      expect(() => allocate(money('10.00', 'USD'), [])).toThrow(RangeError);
      expect(() => allocate(money('10.00', 'USD'), [])).toThrow('at least one ratio');
    });

    it('throws on negative ratios', () => {
      expect(() => allocate(money('10.00', 'USD'), [1, -1])).toThrow(RangeError);
      expect(() => allocate(money('10.00', 'USD'), [1, -1])).toThrow('non-negative');
    });

    it('throws when all ratios are zero', () => {
      expect(() => allocate(money('10.00', 'USD'), [0, 0])).toThrow(RangeError);
    });

    it('throws on negative string ratios (e.g. "-0.5")', () => {
      expect(() => allocate(money('10.00', 'USD'), ['-0.5', '1'])).toThrow(RangeError);
      expect(() => allocate(money('10.00', 'USD'), ['-0.5', '1'])).toThrow('non-negative');
    });
  });
});

describe('splitEvenly', () => {
  it('splits $10.00 into 3 equal parts', () => {
    const result = splitEvenly(money('10.00', 'USD'), 3);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ amount: 334n, currency: 'USD' });
    expect(result[1]).toEqual({ amount: 333n, currency: 'USD' });
    expect(result[2]).toEqual({ amount: 333n, currency: 'USD' });
    expect(result.reduce((a, b) => a + b.amount, 0n)).toBe(1000n);
  });

  it('splits $9.00 into 3 equal parts exactly', () => {
    const result = splitEvenly(money('9.00', 'USD'), 3);

    expect(result).toHaveLength(3);
    expect(result.every((m) => m.amount === 300n)).toBe(true);
    expect(result.reduce((a, b) => a + b.amount, 0n)).toBe(900n);
  });

  it('works for a single part', () => {
    const m = money('5.00', 'USD');

    expect(splitEvenly(m, 1)).toEqual([m]);
  });

  it('handles negative amounts', () => {
    const result = splitEvenly(money('-9.00', 'USD'), 3);

    expect(result.every((m) => m.amount === -300n)).toBe(true);
    expect(result.reduce((a, b) => a + b.amount, 0n)).toBe(-900n);
  });

  it('throws for non-integer parts', () => {
    expect(() => splitEvenly(money('10.00', 'USD'), 1.5)).toThrow(RangeError);
  });

  it('throws for zero parts', () => {
    expect(() => splitEvenly(money('10.00', 'USD'), 0)).toThrow(RangeError);
  });

  it('throws for negative parts', () => {
    expect(() => splitEvenly(money('10.00', 'USD'), -1)).toThrow(RangeError);
  });
});

describe('abs', () => {
  it('returns positive amount unchanged', () => {
    expect(abs(money('10.00', 'USD'))).toEqual({ amount: 1000n, currency: 'USD' });
  });

  it('makes negative amount positive', () => {
    expect(abs(money('-10.00', 'USD'))).toEqual({ amount: 1000n, currency: 'USD' });
  });

  it('handles zero', () => {
    expect(abs(money('0.00', 'USD'))).toEqual({ amount: 0n, currency: 'USD' });
  });
});

describe('negate', () => {
  it('flips sign of positive amount', () => {
    expect(negate(money('10.00', 'USD'))).toEqual({ amount: -1000n, currency: 'USD' });
  });

  it('flips sign of negative amount', () => {
    expect(negate(money('-10.00', 'USD'))).toEqual({ amount: 1000n, currency: 'USD' });
  });

  it('double negate is identity', () => {
    const original = money('42.99', 'USD');

    expect(negate(negate(original))).toEqual(original);
  });
});

describe('sum', () => {
  it('sums an array of money', () => {
    expect(sum([money('1.00', 'USD'), money('2.00', 'USD'), money('3.00', 'USD')])).toEqual({
      amount: 600n,
      currency: 'USD',
    });
  });

  it('handles a single element', () => {
    expect(sum([money('5.00', 'USD')])).toEqual({ amount: 500n, currency: 'USD' });
  });

  it('throws on empty array', () => {
    expect(() => sum([])).toThrow(RangeError);
    expect(() => sum([])).toThrow('at least one');
  });

  it('throws on currency mismatch', () => {
    expect(() => sum([money('1.00', 'USD'), money('1.00', 'EUR')])).toThrow(CurrencyMismatchError);
    expect(() => sum([money('1.00', 'USD'), money('1.00', 'EUR')])).toThrow('Currency mismatch');
  });

  it('detects mismatch at any position (not just adjacent pairs)', () => {
    expect(() => sum([money('1.00', 'USD'), money('2.00', 'USD'), money('3.00', 'EUR')])).toThrow(
      CurrencyMismatchError,
    );
    expect(() => sum([money('1.00', 'USD'), money('2.00', 'EUR'), money('3.00', 'USD')])).toThrow(
      CurrencyMismatchError,
    );
  });

  it('sums a large array without intermediate Money objects', () => {
    const items = Array.from({ length: 100 }, () => money('1.00', 'USD'));

    expect(sum(items)).toEqual({ amount: 10000n, currency: 'USD' });
  });
});

describe('min', () => {
  it('returns the smallest value', () => {
    expect(min([money('3.00', 'USD'), money('1.00', 'USD'), money('2.00', 'USD')])).toEqual({
      amount: 100n,
      currency: 'USD',
    });
  });

  it('works with a single-element array', () => {
    expect(min([money('5.00', 'USD')])).toEqual({ amount: 500n, currency: 'USD' });
  });

  it('throws RangeError on empty array', () => {
    expect(() => min([])).toThrow(RangeError);
  });

  it('throws on currency mismatch', () => {
    expect(() => min([money('1.00', 'USD'), money('1.00', 'EUR')])).toThrow(CurrencyMismatchError);
    expect(() => min([money('1.00', 'USD'), money('1.00', 'EUR')])).toThrow('Currency mismatch');
  });
});

describe('max', () => {
  it('returns the largest value', () => {
    expect(max([money('1.00', 'USD'), money('3.00', 'USD'), money('2.00', 'USD')])).toEqual({
      amount: 300n,
      currency: 'USD',
    });
  });

  it('works with a single-element array', () => {
    expect(max([money('5.00', 'USD')])).toEqual({ amount: 500n, currency: 'USD' });
  });

  it('throws RangeError on empty array', () => {
    expect(() => max([])).toThrow(RangeError);
  });

  it('throws on currency mismatch', () => {
    expect(() => max([money('1.00', 'USD'), money('1.00', 'EUR')])).toThrow(CurrencyMismatchError);
    expect(() => max([money('1.00', 'USD'), money('1.00', 'EUR')])).toThrow('Currency mismatch');
  });
});

describe('comparison predicates', () => {
  const five = money('5.00', 'USD');
  const ten = money('10.00', 'USD');

  it('isZero', () => {
    expect(isZero(money('0.00', 'USD'))).toBe(true);
    expect(isZero(five)).toBe(false);
  });

  it('isPositive', () => {
    expect(isPositive(five)).toBe(true);
    expect(isPositive(money('0.00', 'USD'))).toBe(false);
    expect(isPositive(money('-1.00', 'USD'))).toBe(false);
  });

  it('isNegative', () => {
    expect(isNegative(money('-1.00', 'USD'))).toBe(true);
    expect(isNegative(money('0.00', 'USD'))).toBe(false);
    expect(isNegative(five)).toBe(false);
  });

  it('isNonNegative', () => {
    expect(isNonNegative(five)).toBe(true);
    expect(isNonNegative(money('0.00', 'USD'))).toBe(true);
    expect(isNonNegative(money('-1.00', 'USD'))).toBe(false);
  });

  it('isNonPositive', () => {
    expect(isNonPositive(money('-1.00', 'USD'))).toBe(true);
    expect(isNonPositive(money('0.00', 'USD'))).toBe(true);
    expect(isNonPositive(five)).toBe(false);
  });

  it('greaterThan', () => {
    expect(greaterThan(ten, five)).toBe(true);
    expect(greaterThan(five, ten)).toBe(false);
    expect(greaterThan(five, five)).toBe(false);
  });

  it('greaterThanOrEqual', () => {
    expect(greaterThanOrEqual(ten, five)).toBe(true);
    expect(greaterThanOrEqual(five, five)).toBe(true);
    expect(greaterThanOrEqual(five, ten)).toBe(false);
  });

  it('lessThan', () => {
    expect(lessThan(five, ten)).toBe(true);
    expect(lessThan(ten, five)).toBe(false);
    expect(lessThan(five, five)).toBe(false);
  });

  it('lessThanOrEqual', () => {
    expect(lessThanOrEqual(five, ten)).toBe(true);
    expect(lessThanOrEqual(five, five)).toBe(true);
    expect(lessThanOrEqual(ten, five)).toBe(false);
  });

  it('predicates throw on currency mismatch', () => {
    const eur = money('5.00', 'EUR');

    expect(() => greaterThan(five, eur)).toThrow(CurrencyMismatchError);
    expect(() => greaterThan(five, eur)).toThrow('Currency mismatch');
    expect(() => lessThan(five, eur)).toThrow(CurrencyMismatchError);
    expect(() => lessThan(five, eur)).toThrow('Currency mismatch');
  });
});

describe('compare', () => {
  it('returns -1 when a < b', () => {
    expect(compare(money('5.00', 'USD'), money('10.00', 'USD'))).toBe(-1);
  });

  it('returns 0 when equal', () => {
    expect(compare(money('10.00', 'USD'), money('10.00', 'USD'))).toBe(0);
  });

  it('returns 1 when a > b', () => {
    expect(compare(money('10.00', 'USD'), money('5.00', 'USD'))).toBe(1);
  });

  it('throws on currency mismatch', () => {
    expect(() => compare(money('10.00', 'USD'), money('10.00', 'EUR'))).toThrow(CurrencyMismatchError);
    expect(() => compare(money('10.00', 'USD'), money('10.00', 'EUR'))).toThrow('Currency mismatch');
  });
});

describe('isEqual', () => {
  it('returns true for equal money', () => {
    expect(isEqual(money('10.00', 'USD'), money('10.00', 'USD'))).toBe(true);
  });

  it('returns false for different amounts', () => {
    expect(isEqual(money('10.00', 'USD'), money('10.01', 'USD'))).toBe(false);
  });

  it('returns false on currency mismatch', () => {
    expect(isEqual(money('10.00', 'USD'), money('10.00', 'EUR'))).toBe(false);
  });
});

describe('toJSON / fromJSON', () => {
  it('serializes to JSON-safe object', () => {
    expect(toJSON(money('1234.56', 'USD'))).toEqual({ amount: '123456', currency: 'USD' });
  });

  it('serializes negative amounts', () => {
    expect(toJSON(money('-50.00', 'USD'))).toEqual({ amount: '-5000', currency: 'USD' });
  });

  it('is JSON.stringify safe (bigint becomes string)', () => {
    expect(() => JSON.stringify(toJSON(money('99.99', 'USD')))).not.toThrow();
    expect(JSON.stringify(toJSON(money('99.99', 'USD')))).toBe('{"amount":"9999","currency":"USD"}');
  });

  it('round-trips via toJSON/fromJSON', () => {
    const original = money('1234.56', 'USD');

    expect(fromJSON(toJSON(original))).toEqual(original);
  });

  it('round-trips negative amounts', () => {
    const original = money('-50.00', 'USD');

    expect(fromJSON(toJSON(original))).toEqual(original);
  });

  it('throws InvalidCurrencyError for invalid currency in fromJSON', () => {
    expect(() => fromJSON({ amount: '100', currency: 'FAKE' })).toThrow(InvalidCurrencyError);
  });

  it('throws TypeError for invalid amount string in fromJSON', () => {
    expect(() => fromJSON({ amount: 'not-a-number', currency: 'USD' })).toThrow(TypeError);
  });

  it('throws TypeError for decimal (float) amount string in fromJSON', () => {
    expect(() => fromJSON({ amount: '1.5', currency: 'USD' })).toThrow(TypeError);
    expect(() => fromJSON({ amount: '1.5', currency: 'USD' })).toThrow('expected an integer string');
  });

  it('throws TypeError when amount is a number instead of string', () => {
    expect(() => fromJSON({ amount: 123456 as unknown as string, currency: 'USD' })).toThrow(TypeError);
    expect(() => fromJSON({ amount: 123456 as unknown as string, currency: 'USD' })).toThrow(
      'expected an integer string',
    );
  });

  it('throws TypeError when amount is a bigint instead of string', () => {
    expect(() => fromJSON({ amount: 123456n as unknown as string, currency: 'USD' })).toThrow(TypeError);
  });
});

describe('toDecimal', () => {
  it('converts minor units to decimal string', () => {
    expect(toDecimal(money(123456n, 'USD'))).toBe('1234.56');
  });

  it('pads fraction with leading zeros', () => {
    expect(toDecimal(money(5n, 'USD'))).toBe('0.05');
    expect(toDecimal(money(10n, 'USD'))).toBe('0.10');
  });

  it('handles whole amounts', () => {
    expect(toDecimal(money(10000n, 'USD'))).toBe('100.00');
  });

  it('handles zero', () => {
    expect(toDecimal(money(0n, 'USD'))).toBe('0.00');
  });

  it('handles negative amounts', () => {
    expect(toDecimal(money(-123456n, 'USD'))).toBe('-1234.56');
    expect(toDecimal(money(-5n, 'USD'))).toBe('-0.05');
  });

  it('handles zero-decimal currencies', () => {
    expect(toDecimal(money(1234n, 'JPY'))).toBe('1234');
  });

  it('handles negative zero-decimal currencies', () => {
    expect(toDecimal(money(-1234n, 'JPY'))).toBe('-1234');
  });

  it('handles three-decimal currencies', () => {
    expect(toDecimal(money(123456n, 'KWD'))).toBe('123.456');
  });

  it('round-trips with money()', () => {
    const original = money('9876.54', 'USD');

    expect(money(toDecimal(original), 'USD')).toEqual(original);
  });
});

describe('toNumber', () => {
  it('converts to floating-point', () => {
    expect(toNumber(money(123456n, 'USD'))).toBeCloseTo(1234.56, 5);
  });

  it('handles zero', () => {
    expect(toNumber(money(0n, 'USD'))).toBe(0);
  });

  it('handles negative amounts', () => {
    expect(toNumber(money(-100n, 'USD'))).toBeCloseTo(-1.0, 5);
  });

  it('handles zero-decimal currencies', () => {
    expect(toNumber(money(1234n, 'JPY'))).toBe(1234);
  });

  it('returns Infinity for amounts that exceed Number.MAX_VALUE', () => {
    // bigint amounts larger than Number.MAX_VALUE lose precision — documented lossy behavior
    const huge = money(BigInt('9'.repeat(400)), 'USD');

    expect(toNumber(huge)).toBe(Infinity);
  });
});

describe('withAmount', () => {
  it('returns Money with given amount and same currency', () => {
    const m = money('9.99', 'USD');

    expect(withAmount(m, 1999n)).toEqual({ amount: 1999n, currency: 'USD' });
  });

  it('preserves currency', () => {
    const m = money('1.00', 'EUR');
    const result = withAmount(m, 0n);

    expect(result.currency).toBe('EUR');
    expect(result.amount).toBe(0n);
  });

  it('accepts negative amounts', () => {
    const m = money('5.00', 'USD');

    expect(withAmount(m, -500n)).toEqual({ amount: -500n, currency: 'USD' });
  });
});

describe('isMoney', () => {
  it('returns true for a valid Money object', () => {
    expect(isMoney(money('10.00', 'USD'))).toBe(true);
    expect(isMoney({ amount: 100n, currency: 'USD' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isMoney(null)).toBe(false);
  });

  it('returns false for non-object primitives', () => {
    expect(isMoney(42)).toBe(false);
    expect(isMoney('USD')).toBe(false);
    expect(isMoney(undefined)).toBe(false);
  });

  it('returns false when amount is not bigint', () => {
    expect(isMoney({ amount: 100, currency: 'USD' })).toBe(false);
    expect(isMoney({ amount: '100', currency: 'USD' })).toBe(false);
  });

  it('returns false when currency is not string', () => {
    expect(isMoney({ amount: 100n, currency: 42 })).toBe(false);
  });

  it('returns false when fields are missing', () => {
    expect(isMoney({ amount: 100n })).toBe(false);
    expect(isMoney({ currency: 'USD' })).toBe(false);
    expect(isMoney({})).toBe(false);
  });

  it('returns false for arrays', () => {
    expect(isMoney([])).toBe(false);
    expect(isMoney([100n, 'USD'])).toBe(false);
  });

  it('returns false when properties only exist on prototype (prototype pollution guard)', () => {
    const proto = { amount: 100n, currency: 'USD' };
    const obj = Object.create(proto) as unknown;

    expect(isMoney(obj)).toBe(false);
  });

  it('returns true for zero-amount Money', () => {
    expect(isMoney({ amount: 0n, currency: 'USD' })).toBe(true);
  });

  it('narrows type correctly (TS)', () => {
    const unknown: unknown = { amount: 100n, currency: 'USD' };

    if (isMoney(unknown)) {
      expect(unknown.amount).toBe(100n);
      expect(unknown.currency).toBe('USD');
    } else {
      throw new Error('Expected isMoney to return true');
    }
  });
});

// ─── Coverage gap tests ────────────────────────────────────────────────────

describe('money(-0) number path', () => {
  it('String(-0) is "0" so produces 0n minor units', () => {
    expect(money(-0, 'USD')).toEqual({ amount: 0n, currency: 'USD' });
  });

  it('result equals money(0n)', () => {
    expect(money(-0, 'USD')).toEqual(money(0n, 'USD'));
  });
});

describe('allocate single ratio', () => {
  it('returns the original amount unchanged as a single-element array', () => {
    const m = money('10.00', 'USD');
    const result = allocate(m, [1]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(m);
  });

  it('returns the original amount for a string ratio', () => {
    const m = money('7.77', 'USD');
    const result = allocate(m, ['1.0']);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(m);
  });
});

describe('splitEvenly with 1 part', () => {
  it('returns array with the original amount unchanged', () => {
    const m = money('10.00', 'USD');
    const result = splitEvenly(m, 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(m);
  });
});

describe('splitEvenly large parts', () => {
  it('splits $100.00 into 100 parts of exactly $1.00 each', () => {
    const result = splitEvenly(money('100.00', 'USD'), 100);

    expect(result).toHaveLength(100);
    expect(result.every((m) => m.amount === 100n)).toBe(true);
    expect(result.reduce((a, b) => a + b.amount, 0n)).toBe(10000n);
  });

  it('distributes remainder correctly across 101 parts (1 penny extra to first)', () => {
    // $1.00 = 100 minor units / 101 parts = 0 per part with 100 remainder
    // → first 100 parts get 1n, last 1 part gets 0n
    const result = splitEvenly(money('1.00', 'USD'), 101);

    expect(result).toHaveLength(101);
    expect(result.reduce((a, b) => a + b.amount, 0n)).toBe(100n);
  });
});

describe('sum single-element array', () => {
  it('returns the single element unchanged', () => {
    const m = money('42.50', 'USD');

    expect(sum([m])).toEqual(m);
  });
});

describe('toNumber zero-decimal currency', () => {
  it('returns integer for JPY (0 decimal places)', () => {
    expect(toNumber(money(1234n, 'JPY'))).toBe(1234);
  });

  it('returns integer for KRW', () => {
    expect(toNumber(money(5000n, 'KRW'))).toBe(5000);
  });
});

describe('roundTo', () => {
  it('rounds to 0 places (whole dollars)', () => {
    // 123456n / 100 = 1234 remainder 56; 56/100 > 0.5 → rounds up to 1235
    expect(roundTo(money('1234.56', 'USD'), 0)).toEqual({ amount: 1235n, currency: 'USD' });
  });

  it('rounds to 0 places truncating case', () => {
    // 123410n / 100 = 1234 remainder 10; 10/100 < 0.5 → rounds down to 1234
    expect(roundTo(money('1234.10', 'USD'), 0)).toEqual({ amount: 1234n, currency: 'USD' });
  });

  it('rounds to 1 place', () => {
    // 123456n / 10 = 12345 remainder 6; 6/10 > 0.5 → rounds up to 12346
    expect(roundTo(money('1234.56', 'USD'), 1)).toEqual({ amount: 12346n, currency: 'USD' });
  });

  it('is a no-op when places equals currency decimals', () => {
    const m = money('1234.56', 'USD');

    expect(roundTo(m, 2)).toBe(m);
  });

  it('respects rounding mode: floor', () => {
    expect(roundTo(money('1234.56', 'USD'), 1, 'floor')).toEqual({ amount: 12345n, currency: 'USD' });
  });

  it('respects rounding mode: ceiling', () => {
    expect(roundTo(money('1234.51', 'USD'), 1, 'ceiling')).toEqual({ amount: 12346n, currency: 'USD' });
  });

  it('handles negative amounts', () => {
    // -123456n → abs=123456n / 100 = 1234 rem 56 → rounds up to 1235 → -1235n
    expect(roundTo(money('-1234.56', 'USD'), 0)).toEqual({ amount: -1235n, currency: 'USD' });
  });

  it('no-op for zero-decimal currency (places=0)', () => {
    const m = money(1234n, 'JPY');

    expect(roundTo(m, 0)).toBe(m);
  });

  it('throws RangeError for negative places', () => {
    expect(() => roundTo(money('10.00', 'USD'), -1)).toThrow(RangeError);
  });

  it('throws RangeError for places > currency decimals', () => {
    expect(() => roundTo(money('10.00', 'USD'), 3)).toThrow(RangeError);
    expect(() => roundTo(money('10.00', 'USD'), 3)).toThrow('exceeds');
  });

  it('throws RangeError for non-integer places', () => {
    expect(() => roundTo(money('10.00', 'USD'), 1.5)).toThrow(RangeError);
  });
});

describe('CurrencyMismatchError', () => {
  it('is instanceof CoinsError', () => {
    const e = new CurrencyMismatchError('USD', 'EUR');

    expect(e).toBeInstanceOf(CoinsError);
    expect(e).toBeInstanceOf(CurrencyMismatchError);
  });

  it('has expected and received properties', () => {
    const e = new CurrencyMismatchError('USD', 'EUR');

    expect(e.expected).toBe('USD');
    expect(e.received).toBe('EUR');
  });

  it('has correct name', () => {
    expect(new CurrencyMismatchError('USD', 'EUR').name).toBe('CurrencyMismatchError');
  });

  it('instanceof check works', () => {
    const e = new CurrencyMismatchError('USD', 'EUR');

    expect(e instanceof CurrencyMismatchError).toBe(true);
    expect(new TypeError('other') instanceof CurrencyMismatchError).toBe(false);
  });

  it('message contains both currencies', () => {
    const e = new CurrencyMismatchError('USD', 'EUR');

    expect(e.message).toContain('USD');
    expect(e.message).toContain('EUR');
  });
});

describe('InvalidCurrencyError', () => {
  it('is instanceof CoinsError', () => {
    const e = new InvalidCurrencyError('FAKE');

    expect(e).toBeInstanceOf(CoinsError);
    expect(e).toBeInstanceOf(InvalidCurrencyError);
  });

  it('has code property', () => {
    expect(new InvalidCurrencyError('FAKE').code).toBe('FAKE');
  });

  it('has correct name', () => {
    expect(new InvalidCurrencyError('FAKE').name).toBe('InvalidCurrencyError');
  });

  it('instanceof check works', () => {
    const e = new InvalidCurrencyError('FAKE');

    expect(e instanceof InvalidCurrencyError).toBe(true);
    expect(new RangeError('other') instanceof InvalidCurrencyError).toBe(false);
  });

  it('message contains the bad code', () => {
    expect(new InvalidCurrencyError('FAKE').message).toContain('FAKE');
  });
});

describe('money() dev warning for number inputs', () => {
  it('emits a console.warn when number has more decimal places than currency supports', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    money(0.123, 'USD');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/coins]'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('0.123'));
    spy.mockRestore();
  });

  it('does not warn when number has exactly the right decimal places', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    money(1.5, 'USD');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not warn for integer numbers', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    money(100, 'USD');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
