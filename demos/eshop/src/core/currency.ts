import type { Currency } from '@vielzeug/coins';

import { EUR, exchange, exchangeRate, format as formatMoney, GBP, money, toDecimal, USD } from '@vielzeug/coins';
import { signal } from '@vielzeug/ripple';

const RATES = {
  EUR: exchangeRate({ from: USD, to: EUR, value: '0.92' }),
  GBP: exchangeRate({ from: USD, to: GBP, value: '0.79' }),
} as const;

const USD_RATES = {
  EUR: exchangeRate({ from: EUR, to: USD, value: '1.0869565217391304' }),
  GBP: exchangeRate({ from: GBP, to: USD, value: '1.2658227848101266' }),
} as const;

export const SUPPORTED_CURRENCIES = [USD, EUR, GBP] as const;
export const currentCurrency = signal<Currency>(USD);

export function setCurrency(next: Currency): void {
  currentCurrency.value = next;
}

function convertUsd(usdAmount: string) {
  const value = money(usdAmount, USD);

  switch (currentCurrency.value.code) {
    case EUR.code:
      return exchange(value, RATES.EUR);
    case GBP.code:
      return exchange(value, RATES.GBP);
    default:
      return value;
  }
}

export function toDisplayCurrency(usdAmount: string) {
  return convertUsd(usdAmount);
}

export function displayAmount(usdAmount: string): string {
  return toDecimal(convertUsd(usdAmount));
}

export function displayAmountToUsd(amount: string): string {
  const value = money(amount, currentCurrency.value);

  switch (currentCurrency.value.code) {
    case EUR.code:
      return toDecimal(exchange(value, USD_RATES.EUR));
    case GBP.code:
      return toDecimal(exchange(value, USD_RATES.GBP));
    default:
      return toDecimal(value);
  }
}

export function formatPrice(usdAmount: string): string {
  return formatMoney(convertUsd(usdAmount), { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

export function currencyFromCode(code: string): Currency {
  return SUPPORTED_CURRENCIES.find((supported) => supported.code === code) ?? USD;
}
