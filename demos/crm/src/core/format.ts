import { EUR, format as formatMoney, money } from '@vielzeug/coins';
import { formatRelative, Temporal } from '@vielzeug/tempo';
import { locale } from './i18n';

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
  return formatRelative(Temporal.Instant.from(value), {
    locale: locale.value === 'de' ? 'de' : 'en',
    numeric: 'auto',
  });
}
