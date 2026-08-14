import type { Currency } from '@vielzeug/coins';

import { EUR, exchange, exchangeRate, format as formatMoney, GBP, money, USD } from '@vielzeug/coins';
import { signal } from '@vielzeug/ripple';

const RATES = {
  EUR: exchangeRate({ from: USD, to: EUR, value: '0.92' }),
  GBP: exchangeRate({ from: USD, to: GBP, value: '0.79' }),
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

export function formatPrice(usdAmount: string): string {
  return formatMoney(convertUsd(usdAmount), { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

export function currencyFromCode(code: string): Currency {
  return SUPPORTED_CURRENCIES.find((supported) => supported.code === code) ?? USD;
}
