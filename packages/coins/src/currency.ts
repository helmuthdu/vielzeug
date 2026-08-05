import type { Currency, CurrencyCode } from './types';

import { CoinsError, InvalidCurrencyError } from './errors';

const builtins = new Map<string, Currency>();
const custom = new Map<string, Currency>();

function builtin<C extends string>(code: C, minorUnit: number): Currency<C> {
  const definition = createDefinition(code, minorUnit);

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

/** Custom definitions are explicit process configuration; built-ins remain immutable and separate. */
export function defineCurrency<C extends string>({ code, minorUnit }: { code: C; minorUnit: number }): Currency<C> {
  validateDefinition(code, minorUnit);

  const builtinDefinition = builtins.get(code);

  if (builtinDefinition) {
    if (builtinDefinition.minorUnit !== minorUnit) throw duplicateScaleError(code, builtinDefinition.minorUnit);

    return builtinDefinition as Currency<C>;
  }

  const existing = custom.get(code);

  if (existing) {
    if (existing.minorUnit !== minorUnit) throw duplicateScaleError(code, existing.minorUnit);

    return existing as Currency<C>;
  }

  const definition = createDefinition(code, minorUnit);

  custom.set(code, definition);

  return definition;
}

export function currency(code: string): Currency {
  const definition = builtins.get(code) ?? custom.get(code);

  if (!definition) throw new InvalidCurrencyError(code);

  return definition;
}

export function isCurrency(value: unknown): value is Currency {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<Currency>;

  return (
    typeof candidate.code === 'string' &&
    (builtins.get(candidate.code) === value || custom.get(candidate.code) === value)
  );
}

export function resolveBuiltinCurrency(code: string): Currency {
  const definition = builtins.get(code);

  if (!definition) throw new InvalidCurrencyError(code);

  return definition;
}

function createDefinition<C extends string>(code: C, minorUnit: number): Currency<C> {
  validateDefinition(code, minorUnit);

  return Object.freeze({ code: code as CurrencyCode<C>, minorUnit }) as Currency<C>;
}

function validateDefinition(code: string, minorUnit: number): void {
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new CoinsError('INVALID_CURRENCY', `Currency code must be three uppercase letters: "${code}"`);
  }

  if (!Number.isInteger(minorUnit) || minorUnit < 0 || minorUnit > 6) {
    throw new CoinsError('INVALID_CURRENCY', `Currency "${code}" must have 0–6 minor-unit digits`);
  }
}

function duplicateScaleError(code: string, minorUnit: number): CoinsError {
  return new CoinsError('INVALID_CURRENCY', `Currency "${code}" already has ${minorUnit} minor-unit digits`);
}
