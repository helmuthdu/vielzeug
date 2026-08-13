import type { Currency } from '@vielzeug/coins';

import { currency, EUR, exchange, exchangeRate, format as formatMoney, GBP, money, USD } from '@vielzeug/coins';
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

export function toDisplayCurrency(usdAmount: string) {
  const selected = currentCurrency.value;
  const value = money(usdAmount, USD);
  const converted = selected.code === USD.code ? value : exchange(value, RATES[selected.code as keyof typeof RATES]);

  return converted;
}

export function formatPrice(usdAmount: string): string {
  const selected = currentCurrency.value;
  const value = money(usdAmount, USD);
  const converted = selected.code === USD.code ? value : exchange(value, RATES[selected.code as keyof typeof RATES]);

  return formatMoney(converted, { maximumFractionDigits: 0 });
}

export function currencyFromCode(code: string): Currency {
  return currency(code);
}
