import { type Currency, EUR, GBP, type Money, money, USD } from '@vielzeug/coins';

import { floatFixed } from '../_helpers/float';
import { int } from '../_helpers/int';
import { alphanumeric, base58String, hexString, numericString, pick } from '../_helpers/string';
import type { IllusionistContext } from '../types';
import { FINANCE_DATA } from './data';

const CURRENCIES: Record<'USD' | 'EUR' | 'GBP', Currency> = { EUR, GBP, USD };

const CREDIT_CARD_TYPES = ['visa', 'mastercard', 'amex'] as const;
type CreditCardType = (typeof CREDIT_CARD_TYPES)[number];

const IBAN_COUNTRIES = Object.keys(FINANCE_DATA.ibanCountryCodes) as (keyof typeof FINANCE_DATA.ibanCountryCodes)[];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function letters(count: number, ctx: IllusionistContext): string {
  let result = '';

  for (let i = 0; i < count; i++) {
    result += LETTERS[Math.floor(ctx.source.next() * LETTERS.length)];
  }

  return result;
}

/** Computes `n mod 97` for an arbitrarily long numeric string. */
function mod97(numeric: string): number {
  let remainder = 0;

  for (const ch of numeric) {
    remainder = (remainder * 10 + Number(ch)) % 97;
  }

  return remainder;
}

/** Computes the two IBAN check digits so the resulting IBAN passes the mod-97 validation. */
function ibanCheckDigits(country: string, bban: string): string {
  const rearranged = `${bban}${country}00`;
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  const check = 98 - mod97(numeric);

  return check.toString().padStart(2, '0');
}

/** Computes the Luhn check digit for a partial card number (the final digit is appended). */
function luhnCheckDigit(partial: string): string {
  const digits = partial.split('').map(Number);
  let sum = 0;
  let double = true;

  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i]!;

    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }

    sum += d;
    double = !double;
  }

  const check = (10 - (sum % 10)) % 10;

  return String(check);
}

export type AmountOptions = {
  readonly min?: number;
  readonly max?: number;
  readonly currency?: 'USD' | 'EUR' | 'GBP';
};

export function amount(ctx: IllusionistContext, opts: AmountOptions = {}): Money {
  const min = opts.min ?? 100;
  const max = opts.max ?? 10000;
  const code = opts.currency ?? 'USD';
  const value = floatFixed(min, max, 2, ctx.source);

  return money(value.toFixed(2), CURRENCIES[code]);
}

export function iban(ctx: IllusionistContext, countryCode?: string): string {
  const country = (countryCode ?? pick(IBAN_COUNTRIES, ctx.source)!) as keyof typeof FINANCE_DATA.ibanLengths;

  if (!(country in FINANCE_DATA.ibanLengths)) {
    throw new RangeError(`iban: unsupported country code "${countryCode}". Supported: ${IBAN_COUNTRIES.join(', ')}`);
  }

  const totalLength = FINANCE_DATA.ibanLengths[country];
  const bbanLength = totalLength - 4;
  const bban = numericString(bbanLength, ctx.source);
  const checkDigits = ibanCheckDigits(country, bban);

  return `${country}${checkDigits}${bban}`;
}

export function bic(ctx: IllusionistContext): string {
  const bankCode = letters(4, ctx);
  const country = letters(2, ctx);
  const location = alphanumeric(2, ctx.source).toUpperCase();
  const useBranch = int(0, 1, ctx.source) === 1;
  const branch = useBranch ? alphanumeric(3, ctx.source).toUpperCase() : '';

  return `${bankCode}${country}${location}${branch}`;
}

export function creditCardNumber(ctx: IllusionistContext, type?: CreditCardType): string {
  const cardType = type ?? pick(CREDIT_CARD_TYPES, ctx.source)!;
  const iin = pick(FINANCE_DATA.creditCardIins[cardType], ctx.source)!;
  const totalLength = cardType === 'amex' ? 15 : 16;
  const partial = iin + numericString(totalLength - iin.length - 1, ctx.source);
  const checkDigit = luhnCheckDigit(partial);

  return `${partial}${checkDigit}`;
}

export function creditCardCVV(ctx: IllusionistContext, type?: CreditCardType): string {
  const cardType = type ?? pick(CREDIT_CARD_TYPES, ctx.source)!;
  const length = cardType === 'amex' ? 4 : 3;

  return numericString(length, ctx.source);
}

export function bitcoinAddress(ctx: IllusionistContext): string {
  const prefix = pick(['1', '3', 'bc1'], ctx.source)!;
  const suffixLength = int(25, 34, ctx.source);

  return `${prefix}${base58String(suffixLength, ctx.source)}`;
}

export function ethereumAddress(ctx: IllusionistContext): string {
  return `0x${hexString(40, ctx.source)}`;
}

export function transactionType(ctx: IllusionistContext): string {
  return pick(FINANCE_DATA.transactionTypes, ctx.source)!;
}

export function bank(ctx: IllusionistContext): string {
  return pick(FINANCE_DATA.banks, ctx.source)!;
}
