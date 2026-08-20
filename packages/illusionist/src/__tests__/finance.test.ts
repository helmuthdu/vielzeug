import {
  amount,
  bank,
  bic,
  bitcoinAddress,
  creditCardCVV,
  creditCardNumber,
  ethereumAddress,
  iban,
  transactionType,
} from '../finance/finance';
import { en } from '../locales/en';
import { createSeed } from '../seed/create-seed';
import type { IllusionistContext, IllusionistLocale } from '../types';

function ctx(seed = 12345, locale: IllusionistLocale = en): IllusionistContext {
  return { locale, source: createSeed(seed) };
}

describe('finance', () => {
  it('amount() returns a Money object with USD currency', () => {
    const result = amount(ctx());

    expect(typeof result.amount).toBe('bigint');
    expect(result.currency.code).toBe('USD');
  });

  it('iban() starts with a 2-letter country code followed by 2 digits', () => {
    const value = iban(ctx());

    expect(value).toMatch(/^[A-Z]{2}\d{2}/);
  });

  it('bic() is 8 or 11 characters, alphanumeric', () => {
    const value = bic(ctx());

    expect([8, 11]).toContain(value.length);
    expect(value).toMatch(/^[A-Z0-9]+$/i);
  });

  it('creditCardNumber("visa") starts with "4" and is 16 digits', () => {
    const value = creditCardNumber(ctx(), 'visa');

    expect(value.startsWith('4')).toBe(true);
    expect(value.length).toBe(16);
    expect(value).toMatch(/^\d+$/);
  });

  it('creditCardNumber("mastercard") starts with 5 and is 16 digits', () => {
    const value = creditCardNumber(ctx(), 'mastercard');

    expect(value.startsWith('5')).toBe(true);
    expect(value.length).toBe(16);
    expect(value).toMatch(/^\d+$/);
  });

  it('creditCardNumber("amex") starts with 34 or 37 and is 15 digits', () => {
    const value = creditCardNumber(ctx(), 'amex');

    expect(value.startsWith('34') || value.startsWith('37')).toBe(true);
    expect(value.length).toBe(15);
    expect(value).toMatch(/^\d+$/);
  });

  it('creditCardCVV() is 3 digits', () => {
    const value = creditCardCVV(ctx(), 'visa');

    expect(value.length).toBe(3);
    expect(value).toMatch(/^\d{3}$/);
  });

  it('bitcoinAddress starts with "1", "3", or "bc1"', () => {
    const value = bitcoinAddress(ctx());

    expect(value.startsWith('1') || value.startsWith('3') || value.startsWith('bc1')).toBe(true);
  });

  it('ethereumAddress starts with "0x" and is 42 chars total', () => {
    const value = ethereumAddress(ctx());

    expect(value.startsWith('0x')).toBe(true);
    expect(value.length).toBe(42);
  });

  it('transactionType is non-empty', () => {
    const value = transactionType(ctx());

    expect(value.length).toBeGreaterThan(0);
  });

  it('bank is non-empty', () => {
    const value = bank(ctx());

    expect(value.length).toBeGreaterThan(0);
  });

  it('iban() passes mod-97 validation for 10 generated values', () => {
    function mod97(numeric: string): number {
      let remainder = 0;
      for (const ch of numeric) {
        remainder = (remainder * 10 + Number(ch)) % 97;
      }
      return remainder;
    }

    function charToNumber(ch: string): number {
      return ch >= 'A' && ch <= 'Z' ? ch.charCodeAt(0) - 55 : Number(ch);
    }

    for (let i = 0; i < 10; i++) {
      const value = iban(ctx(i + 1));
      // Move the first 4 chars (country + check digits) to the end.
      const rearranged = `${value.slice(4)}${value.slice(0, 4)}`;
      const numeric = rearranged
        .split('')
        .map((ch) => charToNumber(ch.toUpperCase()))
        .join('');

      expect(mod97(numeric)).toBe(1);
    }
  });

  it.each(['visa', 'mastercard', 'amex'] as const)(
    'creditCardNumber("%s") passes Luhn validation for 10 generated values',
    (type) => {
      function luhnValid(cardNumber: string): boolean {
        let sum = 0;
        let double = false;
        for (let i = cardNumber.length - 1; i >= 0; i--) {
          let d = Number(cardNumber[i]);
          if (double) {
            d *= 2;
            if (d > 9) d -= 9;
          }
          sum += d;
          double = !double;
        }
        return sum % 10 === 0;
      }

      for (let i = 0; i < 10; i++) {
        const value = creditCardNumber(ctx(i + 1), type);
        expect(luhnValid(value)).toBe(true);
      }
    },
  );
});
