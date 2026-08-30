import { CoinsError, InvalidCurrencyError } from './errors';
import type { Currency, CurrencyCode } from './types';

const builtins = new Map<string, Currency>();
const canonicalCurrencies = new WeakSet<object>();

function register<C extends string>(code: C, minorUnit: number): Currency<C> {
  validateDefinition(code, minorUnit);

  const definition = Object.freeze({ code: code as CurrencyCode<C>, minorUnit }) as Currency<C>;

  canonicalCurrencies.add(definition);

  return definition;
}

function builtin<C extends string>(code: C, minorUnit: number): Currency<C> {
  const definition = register(code, minorUnit);

  builtins.set(code, definition);

  return definition;
}

export const USD = builtin('USD', 2);
export const EUR = builtin('EUR', 2);
export const GBP = builtin('GBP', 2);
export const JPY = builtin('JPY', 0);
export const KRW = builtin('KRW', 0);
export const BHD = builtin('BHD', 3);
export const KWD = builtin('KWD', 3);

/** Resolve a built-in currency by code, or construct an immutable custom currency from a definition. */
export function currency<C extends string>(code: C): Currency<C>;
export function currency<C extends string>(definition: { code: C; minorUnit: number }): Currency<C>;
export function currency<C extends string>(input: C | { code: C; minorUnit: number }): Currency<C> {
  if (typeof input === 'string') {
    const definition = builtins.get(input);

    if (!definition) throw new InvalidCurrencyError(input);

    return definition as Currency<C>;
  }

  return register(input.code, input.minorUnit);
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'object' && value !== null && canonicalCurrencies.has(value);
}

function validateDefinition(code: string, minorUnit: number): void {
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new CoinsError('INVALID_CURRENCY', `Currency code must be three uppercase letters: "${code}"`);
  }

  if (!Number.isInteger(minorUnit) || minorUnit < 0 || minorUnit > 6) {
    throw new CoinsError('INVALID_CURRENCY', `Currency "${code}" must have 0–6 minor-unit digits`);
  }
}
