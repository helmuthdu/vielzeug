// #region TimeDiffTypes
export type TimeUnit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second';
export type TimeResult = { unit: TimeUnit; value: number };
// #endregion TimeDiffTypes

const ALL_UNITS: TimeUnit[] = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'];

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MS_PER_MONTH = 30 * MS_PER_DAY;
const MS_PER_YEAR = 365 * MS_PER_DAY;

const TIME_UNITS = [
  { ms: MS_PER_YEAR, unit: 'year' as const },
  { ms: MS_PER_MONTH, unit: 'month' as const },
  { ms: MS_PER_WEEK, unit: 'week' as const },
  { ms: MS_PER_DAY, unit: 'day' as const },
  { ms: MS_PER_HOUR, unit: 'hour' as const },
  { ms: MS_PER_MINUTE, unit: 'minute' as const },
  { ms: MS_PER_SECOND, unit: 'second' as const },
];

/**
 * Calculates the remaining time until a target date.
 *
 * @example
 * ```ts
 * timeDiff(new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)); // { value: 5, unit: 'day' }
 * timeDiff(new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), 'past'); // { value: 3, unit: 'day' }
 * timeDiff(new Date(Date.now() + 1000 * 60 * 60 * 24 * 31)); // { value: 1, unit: 'month' }
 * timeDiff(new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)); // { value: 1, unit: 'year' }
 * ```
 *
 * @param a - The target date (Date object or ISO string).
 * @param b - The target date (Date object or ISO string).
 * @param allowedUnits - (optional) array of units to filter the result. If provided, only these units will be considered.
 *
 * @returns An object containing the remaining time and its unit ('DAY', 'HOUR', or 'MINUTE').
 */
export function timeDiff(
  a: Date | string,
  b: Date | string = new Date(),
  allowedUnits: TimeUnit[] = ALL_UNITS,
): TimeResult | undefined {
  const aDate = typeof a === 'string' ? Date.parse(a) : a.getTime();
  const bDate = typeof b === 'string' ? Date.parse(b) : b.getTime();

  if (Number.isNaN(aDate) || Number.isNaN(bDate)) {
    return undefined;
  }

  const units = TIME_UNITS.filter((u) => allowedUnits.includes(u.unit));
  const diff = Math.abs(aDate - bDate);
  const smallestUnit = units[units.length - 1]?.unit ?? 'second';

  if (diff <= 0) {
    return { unit: smallestUnit, value: 0 };
  }

  // Find the largest unit that fits
  const bestUnit = units.find((u) => diff >= u.ms);

  if (bestUnit) {
    return { unit: bestUnit.unit, value: Math.floor(diff / bestUnit.ms) };
  }

  return { unit: smallestUnit, value: 0 };
}
