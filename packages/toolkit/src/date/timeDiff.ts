export type TimeUnit = 'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'HOUR' | 'MINUTE' | 'SECOND' | 'INVALID_DATE';
export type TimeDirection = 'FUTURE' | 'PAST';
export type TimeResult = { unit: TimeUnit; value: number };

let defaultUnits: TimeUnit[] = ['YEAR', 'MONTH', 'WEEK', 'DAY', 'HOUR', 'MINUTE', 'SECOND'];

/**
 * Calculates the remaining time until a target date.
 *
 * @example
 * ```ts
 * timeDiff(new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)); // { value: 5, unit: 'DAY' }
 * timeDiff(new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), 'past'); // { value: 3, unit: 'DAY' }
 * timeDiff(new Date(Date.now() + 1000 * 60 * 60 * 24 * 31)); // { value: 1, unit: 'MONTH' }
 * timeDiff(new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)); // { value: 1, unit: 'YEAR' }
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
  allowedUnits: TimeUnit[] = defaultUnits,
): TimeResult {
  const aDate = typeof a === 'string' ? Date.parse(a) : a.getTime();
  const bDate = typeof b === 'string' ? Date.parse(b) : b.getTime();
  if (Number.isNaN(aDate) || Number.isNaN(bDate)) {
    return { unit: 'INVALID_DATE', value: 0 };
  }

  const units = (
    [
      { ms: 365 * 24 * 60 * 60 * 1000, unit: 'YEAR' },
      { ms: 30 * 24 * 60 * 60 * 1000, unit: 'MONTH' },
      { ms: 7 * 24 * 60 * 60 * 1000, unit: 'WEEK' },
      { ms: 24 * 60 * 60 * 1000, unit: 'DAY' },
      { ms: 60 * 60 * 1000, unit: 'HOUR' },
      { ms: 60 * 1000, unit: 'MINUTE' },
      { ms: 1000, unit: 'SECOND' },
    ] satisfies { ms: number; unit: TimeUnit }[]
  ).filter((u) => allowedUnits.includes(u.unit));

  const diff = aDate > bDate ? aDate - bDate : bDate - aDate;
  const smallestUnit = units[units.length - 1]?.unit ?? 'SECOND';
  if (diff <= 0) {
    return { unit: smallestUnit, value: 0 };
  }

  for (const { ms, unit } of units) {
    if (diff >= ms) {
      return { unit, value: Math.floor(diff / ms) };
    }
  }
  return { unit: smallestUnit, value: 0 };
}

timeDiff.defaultUnits = (units: TimeUnit[]) => {
  defaultUnits = units;
};
