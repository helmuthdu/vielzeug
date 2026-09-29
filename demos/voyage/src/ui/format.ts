import { EUR, format as formatMoney, money as toMoney } from '@vielzeug/coins';
import { eventFieldChecked, eventFieldValue } from '@vielzeug/refine';
import { formatRange, parse } from '@vielzeug/tempo';

/** Guarded field readers over refine's safe accessors, narrowed to this app's non-optional contract. */
export const valueOf = (event: Event): string => eventFieldValue(event) ?? '';
export const checkedOf = (event: Event): boolean => eventFieldChecked(event);
export const money = (amount: number): string =>
  formatMoney(toMoney(String(amount), EUR), { locale: 'en-IE', maximumFractionDigits: 0, minimumFractionDigits: 0 });

export const isIsoDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export const formatDateRange = (departure: string, arrival: string): string =>
  formatRange(parse(departure, { as: 'plainDate' }), parse(arrival, { as: 'plainDate' }), {
    intl: { day: 'numeric', month: 'short' },
    locale: 'en-GB',
    timeZone: 'UTC',
  });
