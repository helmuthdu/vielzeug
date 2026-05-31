import { format, formatParts } from '../format';
import { money } from '../money';

describe('format', () => {
  describe('basic formatting', () => {
    it('formats USD with default options', () => {
      expect(format(money('1234.56', 'USD'))).toBe('$1,234.56');
    });

    it('formats zero amount', () => {
      expect(format(money('0.00', 'USD'))).toBe('$0.00');
    });

    it('formats negative amounts', () => {
      expect(format(money('-100.00', 'USD'))).toBe('-$100.00');
    });

    it('formats large amounts without float precision loss', () => {
      // 1,234,567,890,123,456.78 USD
      expect(format(money(123456789012345678n, 'USD'))).toBe('$1,234,567,890,123,456.78');
    });

    it('formats largest safe-integer-range amounts exactly', () => {
      expect(format(money(99999999999999n, 'USD'))).toBe('$999,999,999,999.99');
    });

    it('formats thousand separators (grouping)', () => {
      // Validates that getIntegerFormatter (via Intl) adds grouping separators and
      // buildFromTemplate skips the template group parts to avoid duplication.
      expect(format(money('1234567.00', 'USD'))).toBe('$1,234,567.00');
    });
  });

  describe('locale formatting', () => {
    it('formats with German locale', () => {
      const result = format(money('1234.56', 'EUR'), { locale: 'de-DE' });

      expect(result).toContain('1.234,56');
    });

    it('formats with French locale', () => {
      const result = format(money('1234.56', 'EUR'), { locale: 'fr-FR' });

      expect(result).toContain('1\u202f234,56'); // narrow no-break space is standard in fr-FR
    });
  });

  describe('style option', () => {
    it('formats with symbol style (default)', () => {
      expect(format(money('1000.00', 'USD'), { style: 'symbol' })).toBe('$1,000.00');
    });

    it('formats with code style', () => {
      expect(format(money('1000.00', 'USD'), { style: 'code' })).toContain('USD');
      expect(format(money('1000.00', 'USD'), { style: 'code' })).toContain('1,000.00');
    });

    it('formats with name style', () => {
      const result = format(money('1000.00', 'USD'), { style: 'name' });

      expect(result).toContain('1,000.00');
      expect(result.toLowerCase()).toMatch(/us dollar/);
    });
  });

  describe('zero-decimal currencies', () => {
    it('formats JPY without decimal point', () => {
      expect(format(money('1234', 'JPY'))).toBe('¥1,234');
    });

    it('formats KRW without decimal point', () => {
      const result = format(money('5000', 'KRW'));

      expect(result).toContain('5,000');
      expect(result).not.toContain('.');
    });
  });

  describe('three-decimal currencies', () => {
    it('formats BHD with three decimal places', () => {
      const result = format(money('123.456', 'BHD'));

      expect(result).toContain('123.456');
    });

    it('formats KWD with three decimal places', () => {
      const result = format(money('1.000', 'KWD'));

      expect(result).toContain('1.000');
    });
  });

  describe('custom fraction digits', () => {
    it('respects minimumFractionDigits', () => {
      // Show at least 3 decimal places on a 2-decimal currency
      const result = format(money('100.00', 'USD'), { maximumFractionDigits: 3, minimumFractionDigits: 3 });

      expect(result).toBe('$100.000');
    });

    it('respects maximumFractionDigits = 0', () => {
      const result = format(money('100.99', 'USD'), { maximumFractionDigits: 0, minimumFractionDigits: 0 });

      expect(result).toBe('$101');
    });

    it('trims trailing zeros down to minimumFractionDigits', () => {
      // 100.50 with min=0 trims to $100.5
      const result = format(money('100.50', 'USD'), { maximumFractionDigits: 2, minimumFractionDigits: 0 });

      expect(result).toBe('$100.5');
    });

    it('throws when minimumFractionDigits > maximumFractionDigits', () => {
      expect(() => format(money('100.00', 'USD'), { maximumFractionDigits: 1, minimumFractionDigits: 2 })).toThrow(
        RangeError,
      );
    });

    it('throws on non-integer fraction digits', () => {
      expect(() => format(money('100.00', 'USD'), { maximumFractionDigits: 1.5 })).toThrow(RangeError);
      expect(() => format(money('100.00', 'USD'), { minimumFractionDigits: 1.5 })).toThrow(RangeError);
    });

    it('throws on negative fraction digits', () => {
      expect(() => format(money('100.00', 'USD'), { maximumFractionDigits: -1 })).toThrow(RangeError);
      expect(() => format(money('100.00', 'USD'), { minimumFractionDigits: -1 })).toThrow(RangeError);
    });
  });
});

describe('formatParts', () => {
  it('returns semantic parts for a simple USD amount', () => {
    const parts = formatParts(money('1234.56', 'USD'));

    expect(parts.find((p) => p.type === 'currency')?.value).toBe('$');
    expect(parts.find((p) => p.type === 'integer')?.value).toBe('1,234');
    expect(parts.find((p) => p.type === 'decimal')?.value).toBe('.');
    expect(parts.find((p) => p.type === 'fraction')?.value).toBe('56');
  });

  it('includes minusSign for negative amounts', () => {
    const parts = formatParts(money('-100.00', 'USD'));

    expect(parts.some((p) => p.type === 'minusSign')).toBe(true);
    expect(parts.find((p) => p.type === 'integer')?.value).toBe('100');
  });

  it('omits decimal and fraction when maximumFractionDigits is 0', () => {
    const parts = formatParts(money('100.56', 'USD'), { maximumFractionDigits: 0, minimumFractionDigits: 0 });

    expect(parts.some((p) => p.type === 'decimal')).toBe(false);
    expect(parts.some((p) => p.type === 'fraction')).toBe(false);
  });

  it('string-joined parts equal format() output', () => {
    const m = money('1234.56', 'USD');

    expect(
      formatParts(m)
        .map((p) => p.value)
        .join(''),
    ).toBe(format(m));
  });

  it('string-joined parts equal format() for negative amounts', () => {
    const m = money('-99.99', 'USD');

    expect(
      formatParts(m)
        .map((p) => p.value)
        .join(''),
    ).toBe(format(m));
  });

  it('string-joined parts equal format() with code style', () => {
    const m = money('1000.00', 'USD');
    const opts = { style: 'code' as const };

    expect(
      formatParts(m, opts)
        .map((p) => p.value)
        .join(''),
    ).toBe(format(m, opts));
  });
});
