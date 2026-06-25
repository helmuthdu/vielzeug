import { Temporal } from '@js-temporal/polyfill';

import type {
  DurationFormatOptions,
  FormatOptions,
  FormatPattern,
  RelativeFormatOptions,
  RelativeTimeInput,
  TimeDiffResult,
  TimeInput,
  TimeOptions,
} from './types';

import { toInstant, toZoned } from './_convert';
import { inferTimeZone } from './_tz';
import { fail } from './errors';

// ─── Formatter types ──────────────────────────────────────────────────────────

type DurationFormatter = { format(value: Temporal.Duration): string };
type DurationFormatterConstructor = new (
  locales?: Intl.LocalesArgument,
  options?: { style?: 'digital' | 'long' | 'narrow' | 'short' },
) => DurationFormatter;

// ─── Formatter caches ─────────────────────────────────────────────────────────

const FORMATTER_CACHE_MAX = 128;

function cappedGetOrCreate<V>(cache: Map<string, V>, key: string, factory: () => V): V {
  const cached = cache.get(key);

  if (cached !== undefined) return cached;

  if (cache.size >= FORMATTER_CACHE_MAX) {
    const oldest = cache.keys().next().value;

    if (oldest !== undefined) cache.delete(oldest);
  }

  const value = factory();

  cache.set(key, value);

  return value;
}

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

  if (options.intl !== undefined) {
    const cacheKey = `${String(locale ?? '')}|intl|${tz ?? ''}|${serializeIntlOptions(options.intl)}`;

    return cappedGetOrCreate(DATE_TIME_FORMATTER_CACHE, cacheKey, () => {
      const intlOptions = tz !== undefined ? { ...options.intl, timeZone: tz } : options.intl;

      return new Intl.DateTimeFormat(locale, intlOptions);
    });
  }

  const pattern = options.pattern ?? 'medium';
  const cacheKey = `${String(locale ?? '')}|${pattern}|${tz ?? ''}`;

  return cappedGetOrCreate(
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

  return cappedGetOrCreate(
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

  return cappedGetOrCreate(
    DURATION_FORMATTER_CACHE,
    cacheKey,
    () => new IntlWithDurationFormat.DurationFormat!(options.locale, { style: options.style }),
  );
}

// ─── Time scale constants ─────────────────────────────────────────────────────

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_WEEK = 604_800;
const SECONDS_PER_MONTH = 2_629_800; // ≈ 30.4375 days × 86400
const SECONDS_PER_YEAR = 31_557_600; // 365.25 days × 86400

// ─── Relative time helpers ────────────────────────────────────────────────────

const RELATIVE_UNITS: ReadonlyArray<{ scale: number; thresholdToPromote: number; unit: Intl.RelativeTimeFormatUnit }> =
  [
    { scale: 1, thresholdToPromote: SECONDS_PER_MINUTE, unit: 'second' },
    { scale: SECONDS_PER_MINUTE, thresholdToPromote: SECONDS_PER_HOUR / SECONDS_PER_MINUTE, unit: 'minute' },
    { scale: SECONDS_PER_HOUR, thresholdToPromote: SECONDS_PER_DAY / SECONDS_PER_HOUR, unit: 'hour' },
    { scale: SECONDS_PER_DAY, thresholdToPromote: SECONDS_PER_WEEK / SECONDS_PER_DAY, unit: 'day' },
    { scale: SECONDS_PER_WEEK, thresholdToPromote: SECONDS_PER_MONTH / SECONDS_PER_WEEK, unit: 'week' },
    { scale: SECONDS_PER_MONTH, thresholdToPromote: 12, unit: 'month' },
    { scale: SECONDS_PER_YEAR, thresholdToPromote: Number.POSITIVE_INFINITY, unit: 'year' },
  ];

function toRelativeUnit(seconds: number): { unit: Intl.RelativeTimeFormatUnit; value: number } {
  if (!Number.isFinite(seconds)) fail('formatRelative received a non-finite time difference.');

  const roundedSeconds = Math.round(seconds);

  for (const { scale, thresholdToPromote, unit } of RELATIVE_UNITS) {
    const value = Math.round(roundedSeconds / scale);

    if (Math.abs(value) < thresholdToPromote) return { unit, value };
  }

  return { unit: 'year', value: Math.round(roundedSeconds / SECONDS_PER_YEAR) };
}

// ─── Duration fallback renderer ───────────────────────────────────────────────

// All English duration unit names follow the same pluralization rule: singular = plural.slice(0, -1)
const DURATION_UNITS = [
  'years',
  'months',
  'weeks',
  'days',
  'hours',
  'minutes',
  'seconds',
  'milliseconds',
  'microseconds',
  'nanoseconds',
] as const satisfies ReadonlyArray<keyof Temporal.Duration>;

// English-only fallback; runs only when Intl.DurationFormat is unavailable in the runtime.
function buildDurationFallback(duration: Temporal.Duration): string {
  const parts: string[] = [];

  for (const unit of DURATION_UNITS) {
    const value = Math.abs(duration[unit] as number);

    if (value !== 0) parts.push(`${value} ${value === 1 ? unit.slice(0, -1) : unit}`);
  }

  return parts.length === 0 ? '0 seconds' : parts.join(', ');
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Resolves a shared display timezone for two-input range functions.
 * Throws when both inputs are `ZonedDateTime` with different zones and no `options.tz` override.
 */
function resolveRangeTz(start: TimeInput, end: TimeInput, options: FormatOptions, caller: string): string | undefined {
  if (options.tz) return options.tz;

  const startTz = start instanceof Temporal.ZonedDateTime ? start.timeZoneId : undefined;
  const endTz = end instanceof Temporal.ZonedDateTime ? end.timeZoneId : undefined;

  if (startTz && endTz && startTz !== endTz) {
    fail(`${caller} received ZonedDateTime inputs with different time zones. Pass options.tz explicitly.`);
  }

  return startTz ?? endTz;
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
  const tz = options.tz ?? (input instanceof Temporal.ZonedDateTime ? input.timeZoneId : undefined);

  return makeFormatter(options, tz).format(new Date(toInstant(input, { tz }).epochMilliseconds));
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
  const tz = resolveRangeTz(start, end, options, 'formatRange');
  const formatter = makeFormatter(options, tz);

  return formatter.formatRange(
    new Date(toInstant(start, { tz }).epochMilliseconds),
    new Date(toInstant(end, { tz }).epochMilliseconds),
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
export function formatRangeParts(
  start: TimeInput,
  end: TimeInput,
  options: FormatOptions = {},
): ReturnType<Intl.DateTimeFormat['formatRangeToParts']> {
  const tz = resolveRangeTz(start, end, options, 'formatRangeParts');
  const formatter = makeFormatter(options, tz);

  return formatter.formatRangeToParts(
    new Date(toInstant(start, { tz }).epochMilliseconds),
    new Date(toInstant(end, { tz }).epochMilliseconds),
  );
}

/**
 * Serializes `input` to a UTC ISO 8601 instant string (`2026-03-21T10:15:30Z`).
 * Requires `options.tz` when input is a `PlainDate` or `PlainDateTime`.
 *
 * @example
 * ```ts
 * formatInstant(parseZoned('2026-03-21T11:15:30+01:00[Europe/Berlin]'))
 * // '2026-03-21T10:15:30Z'
 * ```
 */
export function formatInstant(input: TimeInput, options: TimeOptions = {}): string {
  return toInstant(input, options).toString();
}

/**
 * Serializes `input` to a zoned ISO 8601 string (`2026-03-21T11:15:30+01:00[Europe/Berlin]`).
 *
 * @param options.tz - Required when `input` is a `PlainDate` or `PlainDateTime`.
 *   Inferred automatically from a `ZonedDateTime` or `Instant` input.
 *
 * @throws {TempoError} When `input` is a `PlainDate` or `PlainDateTime` and `options.tz` is omitted.
 *
 * @example
 * ```ts
 * formatZoned(parseInstant('2026-03-21T10:15:30Z'), { tz: 'Europe/Berlin' })
 * // '2026-03-21T11:15:30+01:00[Europe/Berlin]'
 *
 * formatZoned(parseZoned('2026-03-21T11:15:30+01:00[Europe/Berlin]'))
 * // '2026-03-21T11:15:30+01:00[Europe/Berlin]'  (tz inferred)
 * ```
 */
export function formatZoned(input: TimeInput, options: TimeOptions = {}): string {
  const tz = inferTimeZone(input, options);

  return toZoned(input, { tz }).toString();
}

/**
 * Formats `input` relative to `options.base` (defaults to now) using `Intl.RelativeTimeFormat`.
 *
 * @example
 * ```ts
 * formatRelative(parseInstant('2026-03-21T12:00:00Z'), {
 *   base: parseInstant('2026-03-21T10:00:00Z'),
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
  const tz = options.tz ?? (input instanceof Temporal.ZonedDateTime ? input.timeZoneId : undefined);

  return makeFormatter(options, tz).formatToParts(new Date(toInstant(input, { tz }).epochMilliseconds));
}

/**
 * Converts a `TimeDiffResult` to a human-readable string.
 * Uses the singular unit name when value is 1, plural (unit + 's') otherwise.
 *
 * Pass `options.locale` to localize the numeric part via `Intl.NumberFormat`.
 * Unit names remain English — for fully localized output use {@link formatRelative}
 * or {@link formatDuration} instead.
 *
 * @example
 * ```ts
 * humanize({ unit: 'day', value: 1 })  // '1 day'
 * humanize({ unit: 'day', value: 3 })  // '3 days'
 * humanize({ unit: 'day', value: 3 }, { locale: 'ar' }) // '٣ days'
 * humanize({ unit: 'millisecond', value: 0 }) // '0 milliseconds'
 * ```
 */
export function humanize(diff: TimeDiffResult, options: { locale?: Intl.LocalesArgument } = {}): string {
  const { unit, value } = diff;
  const formatted = options.locale ? new Intl.NumberFormat(options.locale).format(value) : String(value);

  return `${formatted} ${value === 1 ? unit : `${unit}s`}`;
}
