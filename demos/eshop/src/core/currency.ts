import type { CurrencyCode } from '@vielzeug/coins';

import { format as formatMoney, money } from '@vielzeug/coins';
import { signal } from '@vielzeug/ripple';

/**
 * Static demo exchange rates against the storage currency (USD) — real apps would source these
 * from a rates API via `@vielzeug/courier`; the point here is exercising `@vielzeug/coins`'
 * `exchange()`-shaped conversion + `format()`, not building a live FX feed.
 */
const RATES: Record<CurrencyCode, number> = {
  EUR: 0.92,
  GBP: 0.79,
  USD: 1,
};

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP'];

export const currentCurrency = signal<CurrencyCode>('USD');

export function setCurrency(currency: CurrencyCode): void {
  currentCurrency.value = currency;
}

/** Converts a USD-denominated decimal amount string into the currently selected display currency. */
export function toDisplayCurrency(usdAmount: string): { amount: string; currency: CurrencyCode } {
  const currency = currentCurrency.value;
  const rate = RATES[currency];
  const converted = (Number.parseFloat(usdAmount) * rate).toFixed(2);

  return { amount: converted, currency };
}

/**
 * Formats a USD-denominated decimal amount string as a localized string in the display
 * currency. Not itself a ripple-reactive read (like i18n.ts's `t()`) — callers wrap it in a
 * `computed()`/template binding that also reads `currentCurrency.value` so it re-renders when
 * the currency changes; see `core/pricing.ts` for the pattern.
 */
export function formatPrice(usdAmount: string): string {
  const { amount, currency } = toDisplayCurrency(usdAmount);

  return formatMoney(money(amount, currency), { maximumFractionDigits: 0 });
}
