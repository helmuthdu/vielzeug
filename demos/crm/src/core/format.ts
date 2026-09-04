import { EUR, format as formatMoney, money } from '@vielzeug/coins';
import { Temporal } from '@vielzeug/tempo';
import { locale } from './store';

export function formatAmount(value: string): string {
  return formatMoney(money(value, EUR), {
    locale: locale.value === 'de' ? 'de-DE' : 'en-IE',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

export function formatDate(value: string, style: 'medium' | 'short' = 'medium'): string {
  return new Intl.DateTimeFormat(locale.value === 'de' ? 'de-DE' : 'en-GB', { dateStyle: style }).format(
    new Date(value),
  );
}

export function dateFilterValue(value: string): number {
  return Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
}

export function formatRelativeDate(value: string): string {
  const days = Math.round((Number(Temporal.Instant.from(value).epochMilliseconds) - Date.now()) / 86_400_000);
  return new Intl.RelativeTimeFormat(locale.value === 'de' ? 'de' : 'en', { numeric: 'auto' }).format(days, 'day');
}
