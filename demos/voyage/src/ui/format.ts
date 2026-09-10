export const valueOf = (event: Event): string => (event.currentTarget as HTMLElement & { value: string }).value;
export const checkedOf = (event: Event): boolean => (event.currentTarget as HTMLElement & { checked: boolean }).checked;
export const money = (amount: number): string =>
  new Intl.NumberFormat('en-IE', { currency: 'EUR', maximumFractionDigits: 0, style: 'currency' }).format(amount);

export const isIsoDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export const formatDateRange = (departure: string, arrival: string): string => {
  const format = (value: string, includeMonth = true): string =>
    new Intl.DateTimeFormat('en-GB', includeMonth ? { day: 'numeric', month: 'short' } : { day: 'numeric' }).format(
      new Date(`${value}T00:00:00Z`),
    );
  const sameMonth = departure.slice(0, 7) === arrival.slice(0, 7);
  return `${format(departure, !sameMonth)}–${format(arrival)}`;
};
