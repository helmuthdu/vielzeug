import { Temporal } from '@js-temporal/polyfill';
import { getOrCreate } from '@vielzeug/arsenal';

import type {
  DurationFormatOptions,
  FormatOptions,
  FormatPattern,
  RelativeFormatOptions,
  RelativeTimeInput,
  TimeInput,
  TimeOptions,
} from './types';

import { displayRangeTz, displayTz, fail, inferTimeZone, resolveInstant, resolveZoned } from './internal';

// ─── Formatter types ──────────────────────────────────────────────────────────

type DurationFormatter = { format(value: Temporal.Duration): string };
type DurationFormatterConstructor = new (
  locales?: Intl.LocalesArgument,
  options?: { style?: 'digital' | 'long' | 'narrow' | 'short' },
) => DurationFormatter;

// ─── Formatter caches ─────────────────────────────────────────────────────────

const DATE_TIME_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
const RELATIVE_TIME_FORMATTER_CACHE = new Map<string, Intl.RelativeTimeFormat>();
const DURATION_FORMATTER_CACHE = new Map<string, DurationFormatter>();

// ─── Format presets ───────────────────────────────────────────────────────────

const FORMAT_PRESETS: Record<FormatPattern, Intl.DateTimeFormatOptions> = {
  'date-only': { dateStyle: 'short' },
  long: { dateStyle: 'full', timeStyle: 'long' },
  medium: { dateStyle: 'medium', timeStyle: 'short' },
  short: { dateStyle: 'short', timeStyle: 'short' },
  'time-only': { timeStyle: 'short' },
};

// ─── Formatter factory helpers ────────────────────────────────────────────────

function serializeIntlOptions(options: Intl.DateTimeFormatOptions): string {
  return JSON.stringify(
    Object.entries(options)
      .filter(([, value]) => value !== undefined)
      .sort(([l], [r]) => l.localeCompare(r))
      .map(([key, value]) => [key, String(value)]),
  );
}

function makeFormatter(options: FormatOptions, fallbackTz?: string): Intl.DateTimeFormat {
  const tz = options.tz ?? fallbackTz;
  const locale = options.locale;

  if ('intl' in options) {
    const cacheKey = `${String(locale ?? '')}|intl|${tz ?? ''}|${serializeIntlOptions(options.intl)}`;

    return getOrCreate(DATE_TIME_FORMATTER_CACHE, cacheKey, () => {
      const intlOptions = tz !== undefined ? { ...options.intl, timeZone: tz } : options.intl;

      return new Intl.DateTimeFormat(locale, intlOptions);
    });
  }

  const pattern = options.pattern ?? 'medium';
  const cacheKey = `${String(locale ?? '')}|${pattern}|${tz ?? ''}`;

  return getOrCreate(
    DATE_TIME_FORMATTER_CACHE,
    cacheKey,
    () => new Intl.DateTimeFormat(locale, { ...FORMAT_PRESETS[pattern], timeZone: tz }),
  );
}

function getRelativeFormatter(options: {
  locale?: Intl.LocalesArgument;
  numeric?: Intl.RelativeTimeFormatNumeric;
  style?: Intl.RelativeTimeFormatStyle;
}): Intl.RelativeTimeFormat {
  const cacheKey = `${String(options.locale ?? '')}|${options.numeric ?? 'auto'}|${options.style ?? 'long'}`;

  return getOrCreate(
    RELATIVE_TIME_FORMATTER_CACHE,
    cacheKey,
    () =>
      new Intl.RelativeTimeFormat(options.locale, {
        numeric: options.numeric ?? 'auto',
        style: options.style ?? 'long',
      }),
  );
}

function getDurationFormatter(options: {
  locale?: Intl.LocalesArgument;
  style?: 'digital' | 'long' | 'narrow' | 'short';
}): DurationFormatter | null {
  const IntlWithDurationFormat = Intl as typeof Intl & { DurationFormat?: DurationFormatterConstructor };

  if (!IntlWithDurationFormat.DurationFormat) return null;

  const cacheKey = `${String(options.locale ?? '')}|${options.style ?? ''}`;

  return getOrCreate(
    DURATION_FORMATTER_CACHE,
    cacheKey,
    () => new IntlWithDurationFormat.DurationFormat!(options.locale, { style: options.style }),
  );
}

// ─── Relative time helpers ────────────────────────────────────────────────────

const RELATIVE_UNITS: ReadonlyArray<{ scale: number; thresholdToPromote: number; unit: Intl.RelativeTimeFormatUnit }> =
  [
    { scale: 1, thresholdToPromote: 60, unit: 'second' },
    { scale: 60, thresholdToPromote: 60, unit: 'minute' },
    { scale: 3600, thresholdToPromote: 24, unit: 'hour' },
    { scale: 86400, thresholdToPromote: 7, unit: 'day' },
    { scale: 604800, thresholdToPromote: 2629800 / 604800, unit: 'week' },
    { scale: 2629800, thresholdToPromote: 12, unit: 'month' },
    { scale: 31557600, thresholdToPromote: Number.POSITIVE_INFINITY, unit: 'year' },
  ];

function toRelativeUnit(seconds: number): { unit: Intl.RelativeTimeFormatUnit; value: number } {
  if (!Number.isFinite(seconds)) fail('formatRelative received a non-finite time difference.');

  const roundedSeconds = Math.round(seconds);

  for (const { scale, thresholdToPromote, unit } of RELATIVE_UNITS) {
    const value = Math.round(roundedSeconds / scale);

    if (Math.abs(value) < thresholdToPromote) return { unit, value };
  }

  return { unit: 'year', value: Math.round(roundedSeconds / 31557600) };
}

// ─── Duration fallback renderer ───────────────────────────────────────────────

const DURATION_FIELDS: ReadonlyArray<{ plural: string; singular: string; unit: keyof Temporal.Duration }> = [
  { plural: 'years', singular: 'year', unit: 'years' },
  { plural: 'months', singular: 'month', unit: 'months' },
  { plural: 'weeks', singular: 'week', unit: 'weeks' },
  { plural: 'days', singular: 'day', unit: 'days' },
  { plural: 'hours', singular: 'hour', unit: 'hours' },
  { plural: 'minutes', singular: 'minute', unit: 'minutes' },
  { plural: 'seconds', singular: 'second', unit: 'seconds' },
  { plural: 'milliseconds', singular: 'millisecond', unit: 'milliseconds' },
];

function buildDurationFallback(duration: Temporal.Duration): string {
  const parts: string[] = [];

  for (const { plural, singular, unit } of DURATION_FIELDS) {
    const value = duration[unit] as number;

    if (value !== 0) parts.push(`${Math.abs(value)} ${Math.abs(value) === 1 ? singular : plural}`);
  }

  if (parts.length === 0) return '0 seconds';

  return parts.join(', ');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Formats `input` using `Intl.DateTimeFormat`. Defaults to `pattern: 'medium'`.
 *
 * Pass `intl` for full `Intl.DateTimeFormatOptions` control (mutually exclusive with `pattern`).
 * The timezone is inferred from a `ZonedDateTime` input or from `options.tz`.
 *
 * @example
 * ```ts
 * format(parseInstant('2026-03-21T10:15:30Z'), { locale: 'en-GB', pattern: 'short', tz: 'UTC' })
 * // '21/03/2026, 10:15'
 * ```
 */
export function format(input: TimeInput, options: FormatOptions = {}): string {
  const tz = displayTz(input, options.tz);

  return makeFormatter(options, tz).format(new Date(resolveInstant(input, { tz }).epochMilliseconds));
}

/**
 * Formats a time span between `start` and `end` using `Intl.DateTimeFormat.formatRange`.
 *
 * @example
 * ```ts
 * formatRange(start, end, { locale: 'en-GB', pattern: 'short', tz: 'UTC' })
 * // '21/03/2026, 10:00 – 12:00'
 * ```
 */
export function formatRange(start: TimeInput, end: TimeInput, options: FormatOptions = {}): string {
  const tz = displayRangeTz(start, end, options.tz);
  const formatter = makeFormatter(options, tz);

  return formatter.formatRange(
    new Date(resolveInstant(start, { tz }).epochMilliseconds),
    new Date(resolveInstant(end, { tz }).epochMilliseconds),
  );
}

/**
 * Returns the raw `Intl.DateTimeRangeFormatPart[]` array for a time span, enabling
 * fine-grained rendering of range start, end, and shared parts separately.
 *
 * @example
 * ```ts
 * formatRangeParts(start, end, { locale: 'en-US', pattern: 'short', tz: 'UTC' })
 * // [{ type: 'month', value: '3', source: 'startRange' }, ...]
 * ```
 */
export function formatRangeParts(start: TimeInput, end: TimeInput, options: FormatOptions = {}) {
  const tz = displayRangeTz(start, end, options.tz);
  const formatter = makeFormatter(options, tz);

  return formatter.formatRangeToParts(
    new Date(resolveInstant(start, { tz }).epochMilliseconds),
    new Date(resolveInstant(end, { tz }).epochMilliseconds),
  );
}

/**
 * Serializes `input` to a UTC ISO 8601 instant string (`2026-03-21T10:15:30Z`).
 * Requires `options.tz` when input is a `PlainDate` or `PlainDateTime`.
 *
 * @example
 * ```ts
 * formatInstant(Temporal.ZonedDateTime.from('2026-03-21T11:15:30+01:00[Europe/Berlin]'))
 * // '2026-03-21T10:15:30Z'
 * ```
 */
export function formatInstant(input: TimeInput, options: TimeOptions = {}): string {
  return resolveInstant(input, options).toString();
}

/**
 * Serializes `input` to a zoned ISO 8601 string (`2026-03-21T11:15:30+01:00[Europe/Berlin]`).
 * Requires `options.tz` when input is a `PlainDate` or `PlainDateTime`.
 *
 * @example
 * ```ts
 * formatZoned(parseInstant('2026-03-21T10:15:30Z'), { tz: 'Europe/Berlin' })
 * // '2026-03-21T11:15:30+01:00[Europe/Berlin]'
 * ```
 */
export function formatZoned(input: TimeInput, options: TimeOptions = {}): string {
  const tz = inferTimeZone(input, options);

  return resolveZoned(input, { prefer: options.prefer, tz }).toString();
}

/**
 * Formats `input` relative to `options.base` (defaults to now) using `Intl.RelativeTimeFormat`.
 *
 * @example
 * ```ts
 * formatRelative(Temporal.Instant.from('2026-03-21T12:00:00Z'), {
 *   base: Temporal.Instant.from('2026-03-21T10:00:00Z'),
 *   locale: 'en-US',
 *   numeric: 'always',
 * })
 * // 'in 2 hours'
 * ```
 */
export function formatRelative(input: RelativeTimeInput, options: RelativeFormatOptions = {}): string {
  const target = input instanceof Temporal.Instant ? input : input.toInstant();
  const base = options.base
    ? options.base instanceof Temporal.Instant
      ? options.base
      : options.base.toInstant()
    : Temporal.Now.instant();
  const differenceInSeconds = (target.epochMilliseconds - base.epochMilliseconds) / 1000;
  const { unit, value } = toRelativeUnit(differenceInSeconds);

  return getRelativeFormatter(options).format(value, unit);
}

/**
 * Parses an ISO duration string or `Temporal.DurationLike` into a `Temporal.Duration`.
 *
 * @example
 * ```ts
 * parseDuration('PT2H30M').toString() // 'PT2H30M'
 * parseDuration({ hours: 2, minutes: 30 }).toString() // 'PT2H30M'
 * ```
 */
export function parseDuration(input: string | Temporal.DurationLike): Temporal.Duration {
  try {
    return Temporal.Duration.from(input);
  } catch {
    fail(`Invalid duration input: "${String(input)}". Expected an ISO 8601 duration string or Temporal.DurationLike.`);
  }
}

/**
 * Formats a duration using `Intl.DurationFormat` when available, falling back to
 * a human-readable plain-English string.
 *
 * @example
 * ```ts
 * formatDuration('PT2H30M', { locale: 'en-US', style: 'long' })
 * // '2 hours, 30 minutes'
 * ```
 */
export function formatDuration(input: string | Temporal.DurationLike, options: DurationFormatOptions = {}): string {
  const duration = parseDuration(input);
  const formatter = getDurationFormatter(options);

  if (formatter) return formatter.format(duration);

  return buildDurationFallback(duration);
}

/**
 * Returns the raw `Intl.DateTimeFormatPart[]` array for `input`, enabling
 * custom rendering where individual parts (year, month, day, etc.) need
 * to be styled or composed differently.
 *
 * @example
 * ```ts
 * formatParts(parseInstant('2026-03-21T10:15:30Z'), { pattern: 'medium', tz: 'UTC' })
 * // [{ type: 'month', value: 'Mar' }, { type: 'literal', value: ' ' }, ...]
 * ```
 */
export function formatParts(input: TimeInput, options: FormatOptions = {}): Intl.DateTimeFormatPart[] {
  const tz = displayTz(input, options.tz);

  return makeFormatter(options, tz).formatToParts(new Date(resolveInstant(input, { tz }).epochMilliseconds));
}
