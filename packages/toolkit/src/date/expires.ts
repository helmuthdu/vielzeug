export type Expires = 'EXPIRED' | 'SOON' | 'LATER' | 'NEVER' | 'UNKNOWN';

/**
 * Determines the expiry status of a given date.
 *
 * @param date - The date to check, as a string or Date object.
 * @param days - Number of days before expiry to be considered "SOON" (default: 7).
 * @returns
 *   - 'EXPIRED' if the date is in the past,
 *   - 'SOON' if the date is within the next `days`,
 *   - 'LATER' if the date is further in the future,
 *   - 'NEVER' if the year is >= 9999,
 *   - 'UNKNOWN' if the date is invalid.
 */
export function expires(date: string | Date, days = 7): Expires {
  const now = Date.now();
  const target = typeof date === 'string' ? new Date(date) : new Date(date);
  if (Number.isNaN(target.getTime())) return 'UNKNOWN';

  if (target.getFullYear() >= 9999) return 'NEVER';

  const expiringThresholdMs = days * 24 * 60 * 60 * 1000;
  const diff = target.getTime() - now;
  if (diff <= 0) return 'EXPIRED';
  if (diff <= expiringThresholdMs) return 'SOON';
  return 'LATER';
}
