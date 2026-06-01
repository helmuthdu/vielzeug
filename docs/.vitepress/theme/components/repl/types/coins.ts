export const coinsTypes = String.raw`
declare module '/coins' {
  type CurrencyCode = string & { readonly __currencyBrand: true };

  type Money = {
    readonly amount: bigint;
    readonly currency: CurrencyCode;
  };

  type ExchangeRate = {
    readonly from: CurrencyCode;
    readonly rate: string;
    readonly to: CurrencyCode;
  };

  type RoundingMode = 'ceiling' | 'down' | 'floor' | 'half-away-from-zero' | 'half-even' | 'up';

  type FormatOptions = {
    locale?: string;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    style?: 'code' | 'name' | 'symbol';
  };

  type MoneyJSON = { amount: string; currency: string };
  type MoneyFormatPart = { type: string; value: string };

  export function toCurrencyCode(code: string): CurrencyCode;
  export function money(amount: bigint | number | string, currency: CurrencyCode | string): Money;

  export function add(a: Money, b: Money): Money;
  export function subtract(a: Money, b: Money): Money;
  export function multiply(m: Money, factor: number | string): Money;
  export function divide(m: Money, divisor: number, roundingMode?: RoundingMode): Money;
  export function negate(m: Money): Money;
  export function abs(m: Money): Money;
  export function sum(...items: Money[]): Money;
  export function allocate(m: Money, ratios: readonly (number | string)[]): Money[];
  export function splitEvenly(m: Money, parts: number): Money[];

  export function compare(a: Money, b: Money): -1 | 0 | 1;
  export function isEqual(a: Money, b: Money): boolean;
  export function isZero(m: Money): boolean;
  export function isPositive(m: Money): boolean;
  export function isNegative(m: Money): boolean;
  export function greaterThan(a: Money, b: Money): boolean;
  export function greaterThanOrEqual(a: Money, b: Money): boolean;
  export function lessThan(a: Money, b: Money): boolean;
  export function lessThanOrEqual(a: Money, b: Money): boolean;
  export function min(...items: Money[]): Money;
  export function max(...items: Money[]): Money;

  export function exchange(m: Money, rate: ExchangeRate, roundingMode?: RoundingMode): Money;
  export function format(m: Money, options?: FormatOptions): string;
  export function formatParts(m: Money, options?: FormatOptions): MoneyFormatPart[];

  export function toDecimal(m: Money): string;
  export function toNumber(m: Money): number;
  export function toJSON(m: Money): MoneyJSON;
  export function fromJSON(json: MoneyJSON): Money;
  export function toCurrencyCode(code: string): CurrencyCode;

  export type { CurrencyCode, ExchangeRate, FormatOptions, Money, MoneyFormatPart, MoneyJSON, RoundingMode };
}

declare module '@vielzeug/coins' {
  export * from '/coins';
}
`;
