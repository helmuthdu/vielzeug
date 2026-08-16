declare const currencyBrand: unique symbol;
declare const decimalBrand: unique symbol;
declare const moneyBrand: unique symbol;

export type CurrencyCode<C extends string = string> = C & { readonly [currencyBrand]: C };

export type Currency<C extends string = string> = Readonly<{
  code: CurrencyCode<C>;
  minorUnit: number;
}>;

export type Decimal = Readonly<{
  readonly [decimalBrand]: true;
  denominator: bigint;
  numerator: bigint;
}>;

export type Money<C extends Currency = Currency> = Readonly<{
  amount: bigint;
  currency: C;
  readonly [moneyBrand]: C;
}>;

export type ExchangeRate<From extends Currency = Currency, To extends Currency = Currency> = Readonly<{
  from: From;
  to: To;
  value: Decimal;
}>;

export type FormatOptions = Readonly<{
  locale?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  rounding?: RoundingMode;
  style?: 'code' | 'name' | 'narrowSymbol' | 'symbol';
}>;

export type MoneyFormatPart = Readonly<{
  type: 'currency' | 'decimal' | 'fraction' | 'integer' | 'literal' | 'minusSign' | 'plusSign';
  value: string;
}>;

export type MoneyJSON = Readonly<{
  amount: string;
  currency: string;
  unit: 'minor';
}>;

export type RoundingMode = 'awayFromZero' | 'ceil' | 'floor' | 'halfAwayFromZero' | 'halfEven' | 'towardZero';
