import { assertAll } from '../function/assert';
import { isDate } from '../typed/isDate';

// #region IntervalTypes
type IntervalType = 'day' | 'week' | 'month' | 'monthStart' | 'monthEnd' | 'year' | 'yearStart' | 'yearEnd';
type IntervalOptions = {
  interval?: IntervalType;
  steps?: number;
  latest?: boolean;
};
// #endregion IntervalTypes

/**
 * Generates an array of dates between a start and end date, with a specified interval and step size.
 *
 * @example
 * ```ts
 * const options = { interval: 'day', steps: 1, latest: false };
 *
 * interval('2022-01-01', '2022-01-31', options); // Returns an array of dates for every day in January 2022
 * ```
 *
 * @param start - The start date (Date object or ISO string).
 * @param end - The end date (Date object or ISO string).
 * @param options - Options for an interval and steps.
 *
 * @returns An array of generated dates.
 */
export function interval(
  start: Date | string,
  end: Date | string,
  { interval = 'day', steps = 1, latest = false }: IntervalOptions = {},
): Date[] {
  const startDate = new Date(start);
  const endDate = new Date(end);

  assertAll([isDate(startDate), isDate(endDate)], 'Invalid date format. Use a valid Date object or ISO string.', {
    args: { end, start },
    type: TypeError,
  });

  const dateArray: Date[] = [];
  let currentDate = new Date(incrementDate(startDate, interval, 0));

  while (currentDate <= endDate) {
    dateArray.push(currentDate);
    currentDate = new Date(incrementDate(currentDate, interval, steps));
  }

  if (latest && dateArray.length > 0 && dateArray[dateArray.length - 1] < endDate) {
    dateArray.push(endDate);
  }

  return dateArray;
}

function incrementDate(date: Date, interval: IntervalType, steps: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  switch (interval) {
    case 'day':
      return new Date(Date.UTC(year, month, day + steps));
    case 'week':
      return new Date(Date.UTC(year, month, day + 7 * steps));
    case 'month':
      return new Date(Date.UTC(year, month + steps, day));
    case 'monthStart':
      return new Date(Date.UTC(year, month + steps, 1));
    case 'monthEnd':
      return new Date(Date.UTC(year, month + steps + 1, 0));
    case 'year':
      return new Date(Date.UTC(year + steps, month, day));
    case 'yearStart':
      return new Date(Date.UTC(year + steps, 0, 1));
    case 'yearEnd':
      return new Date(Date.UTC(year + steps, 11, 31));
  }
}
