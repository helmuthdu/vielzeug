export const coinsTypes = String.raw`
declare module '/coins' {
  type CurrencyCode = string;

  type Money = {
    readonly amount: bigint;
    readonly currency: string;
  };

  type ExchangeRate = {
    readonly from: string;
    readonly rate: string;
    readonly to: string;
  };

  type RoundingMode = 'ceiling' | 'down' | 'floor' | 'half-away-from-zero' | 'half-even' | 'up';

  type FormatOptions = {
    locale?: string;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    style?: 'code' | 'name' | 'narrowSymbol' | 'symbol';
  };

  type MoneyJSON = { amount: string; currency: string };
  type MoneyFormatPart = { type: string; value: string };

  export class CurrencyMismatchError extends TypeError {
    readonly expected: string;
    readonly received: string;
    constructor(expected: string, received: string);
  }

  export class InvalidCurrencyError extends RangeError {
    readonly code: string;
    constructor(code: string);
  }

  export function money(amount: bigint | number | string, currency: string): Money;

  export function add(a: Money, b: Money): Money;
  export function subtract(a: Money, b: Money): Money;
  export function multiply(m: Money, factor: number | string, mode?: RoundingMode): Money;
  export function divide(m: Money, divisor: number | string, mode?: RoundingMode): Money;
  export function negate(m: Money): Money;
  export function abs(m: Money): Money;
  export function roundTo(m: Money, places: number, mode?: RoundingMode): Money;

  export function sum(moneys: readonly Money[]): Money;
  export function allocate(m: Money, ratios: readonly (number | string)[]): [Money, ...Money[]];
  export function splitEvenly(m: Money, parts: number): [Money, ...Money[]];
  export function clamp(m: Money, lower: Money, upper: Money): Money;
  export function min(moneys: readonly Money[]): Money;
  export function max(moneys: readonly Money[]): Money;

  export function compare(a: Money, b: Money): -1 | 0 | 1;
  export function isEqual(a: Money, b: Money): boolean;
  export function isZero(m: Money): boolean;
  export function isPositive(m: Money): boolean;
  export function isNegative(m: Money): boolean;
  export function isNonNegative(m: Money): boolean;
  export function isNonPositive(m: Money): boolean;
  export function greaterThan(a: Money, b: Money): boolean;
  export function greaterThanOrEqual(a: Money, b: Money): boolean;
  export function lessThan(a: Money, b: Money): boolean;
  export function lessThanOrEqual(a: Money, b: Money): boolean;
  export function isMoney(value: unknown): value is Money;

  export function exchange(m: Money, rate: ExchangeRate, mode?: RoundingMode): Money;
  export function format(m: Money, options?: FormatOptions): string;
  export function formatParts(m: Money, options?: FormatOptions): MoneyFormatPart[];

  export function toDecimal(m: Money): string;
  export function toNumber(m: Money): number;
  export function toJSON(m: Money): MoneyJSON;
  export function fromJSON(json: MoneyJSON): Money;
  export function withAmount(m: Money, amount: bigint): Money;
  export function validateCurrencyCode(code: string): string;
  export function getCurrencyDecimals(currencyCode: string): number;

  export type { CurrencyCode, ExchangeRate, FormatOptions, Money, MoneyFormatPart, MoneyJSON, RoundingMode };
}

declare module '@vielzeug/coins' {
  export * from '/coins';
}
`;
