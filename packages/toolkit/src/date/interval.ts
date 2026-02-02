import { assert } from '../function/assert';
import { isDate } from '../typed/isDate';

type IntervalType = 'D' | 'W' | 'M' | 'MS' | 'ME' | 'Y' | 'YS' | 'YE';
type IntervalOptions = {
  interval?: IntervalType;
  steps?: number;
  latest?: boolean;
};

/**
 * Generates an array of dates between a start and end date, with a specified interval and step size.
 *
 * @example
 * ```ts
 * const options = { interval: 'D', steps: 1, latest: false };
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
  { interval = 'D', steps = 1, latest = false }: IntervalOptions = {},
): Date[] {
  const startDate = new Date(start);
  const endDate = new Date(end);

  assert([isDate(startDate), isDate(endDate)], 'Invalid date format. Use a valid Date object or ISO string.', {
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
    case 'D':
      return new Date(Date.UTC(year, month, day + steps));
    case 'W':
      return new Date(Date.UTC(year, month, day + 7 * steps));
    case 'M':
      return new Date(Date.UTC(year, month + steps, day));
    case 'MS':
      return new Date(Date.UTC(year, month + steps, 1));
    case 'ME':
      return new Date(Date.UTC(year, month + steps + 1, 0));
    case 'Y':
      return new Date(Date.UTC(year + steps, month, day));
    case 'YS':
      return new Date(Date.UTC(year + steps, 0, 1));
    case 'YE':
      return new Date(Date.UTC(year + steps, 11, 31));
  }
}
