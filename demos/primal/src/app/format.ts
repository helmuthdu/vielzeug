import { formatRelative, formatTimer, nowInstant, parse, type Temporal } from '@vielzeug/tempo';
import { currentLocale } from './i18n';

/**
 * "Today", "3 days ago", "last month": for the Load Game list. Tempo resolves
 * calendar months and years properly (no fixed 30-day month) and formats in the
 * app's selected locale, so the phrasing is never a hardcoded English string.
 */
export function timeAgo(iso: string, base: Temporal.Instant = nowInstant()): string {
  return formatRelative(parse(iso, { as: 'instant' }), { base, locale: currentLocale.value });
}

/** "47:12" or "1:02:35": hunt timer and recorded fight durations. */
export function formatDuration(ms: number): string {
  return formatTimer({ milliseconds: ms });
}
