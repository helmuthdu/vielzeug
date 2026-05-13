import { Temporal } from '@js-temporal/polyfill';

export type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

export type TimeInput = Temporal.Instant | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;

export interface TimeOptions {
  tz?: string;
  when?: DateTimeDisambiguation;
}

export type TimeOptionsWithTz = TimeOptions & { tz: string };

export interface DifferenceOptions extends TimeOptionsWithTz {
  largestUnit?: Temporal.DateTimeUnit;
  roundingIncrement?: number;
  roundingMode?: Temporal.RoundingMode;
  smallestUnit?: Temporal.DateTimeUnit;
}

export type FormatPattern = 'short' | 'medium' | 'long' | 'date-only' | 'time-only';

interface HumanFormatBaseOptions {
  locale?: Intl.LocalesArgument;
  tz?: string;
}

export type HumanFormatOptions =
  | (HumanFormatBaseOptions & { intl?: never; pattern?: FormatPattern })
  | (HumanFormatBaseOptions & { intl: Intl.DateTimeFormatOptions; pattern?: never });

export interface RelativeFormatOptions extends TimeOptions {
  base?: TimeInput;
  locale?: Intl.LocalesArgument;
  numeric?: Intl.RelativeTimeFormatNumeric;
  style?: Intl.RelativeTimeFormatStyle;
}

export type BoundaryUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

export interface BoundaryOptions extends TimeOptions {
  weekStartsOn?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export interface DurationFormatOptions {
  locale?: Intl.LocalesArgument;
  style?: 'long' | 'short' | 'narrow' | 'digital';
}

// ─── Internal types ───────────────────────────────────────────────────────────

type ParsedTimeInput =
  | { kind: 'instant'; value: Temporal.Instant }
  | { kind: 'local'; value: Temporal.PlainDateTime }
  | { kind: 'zoned'; value: Temporal.ZonedDateTime };

type DurationFormatter = {
  format(value: Temporal.Duration | Temporal.DurationLike): string;
};

type DurationFormatterConstructor = new (
  locales?: Intl.LocalesArgument,
  options?: { style?: 'long' | 'short' | 'narrow' | 'digital' },
) => DurationFormatter;

// ─── Constants ────────────────────────────────────────────────────────────────

const ERROR_PREFIX = '[timit]';
const INVALID_LOCAL_TIME_STRING_MESSAGE = 'Invalid local date/time string. Expected YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.';
const MISSING_TIMEZONE_MESSAGE = 'This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.';
const MISMATCHED_RANGE_ZONES_MESSAGE =
  'formatRange received ZonedDateTime inputs with different time zones. Pass options.tz explicitly.';
const MISMATCHED_SAME_DAY_ZONES_MESSAGE =
  'isSameDay received ZonedDateTime inputs with different time zones. Pass options.tz explicitly.';
const UNSUPPORTED_INPUT_MESSAGE = 'Unsupported time input type.';
const CACHE_MAX_SIZE = 100;

const FORMAT_PRESETS: Record<FormatPattern, Intl.DateTimeFormatOptions> = {
  'date-only': { dateStyle: 'short' },
  long: { dateStyle: 'full', timeStyle: 'long' },
  medium: { dateStyle: 'medium', timeStyle: 'short' },
  short: { dateStyle: 'short', timeStyle: 'short' },
  'time-only': { timeStyle: 'short' },
};

const BOUNDARY_CONFIG: Record<BoundaryUnit, { add: Temporal.DurationLike; clear: Temporal.ZonedDateTimeLike }> = {
  day: {
    add: { days: 1 },
    clear: { hour: 0, microsecond: 0, millisecond: 0, minute: 0, nanosecond: 0, second: 0 },
  },
  hour: {
    add: { hours: 1 },
    clear: { microsecond: 0, millisecond: 0, minute: 0, nanosecond: 0, second: 0 },
  },
  minute: {
    add: { minutes: 1 },
    clear: { microsecond: 0, millisecond: 0, nanosecond: 0, second: 0 },
  },
  month: {
    add: { months: 1 },
    clear: { day: 1, hour: 0, microsecond: 0, millisecond: 0, minute: 0, nanosecond: 0, second: 0 },
  },
  week: {
    add: { weeks: 1 },
    clear: { hour: 0, microsecond: 0, millisecond: 0, minute: 0, nanosecond: 0, second: 0 },
  },
  year: {
    add: { years: 1 },
    clear: { day: 1, hour: 0, microsecond: 0, millisecond: 0, minute: 0, month: 1, nanosecond: 0, second: 0 },
  },
};

// ─── Bounded cache ────────────────────────────────────────────────────────────

class BoundedCache<K, V> {
  private readonly cache = new Map<K, V>();

  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      this.cache.delete(this.cache.keys().next().value as K);
    }

    this.cache.set(key, value);
  }
}

const DATE_TIME_FORMATTER_CACHE = new BoundedCache<string, Intl.DateTimeFormat>(CACHE_MAX_SIZE);
const RELATIVE_TIME_FORMATTER_CACHE = new BoundedCache<string, Intl.RelativeTimeFormat>(CACHE_MAX_SIZE);
const DURATION_FORMATTER_CACHE = new BoundedCache<string, DurationFormatter>(CACHE_MAX_SIZE);

// ─── Internal helpers ─────────────────────────────────────────────────────────

function fail(message: string): never {
  throw new TypeError(`${ERROR_PREFIX} ${message}`);
}

function parseInput(input: TimeInput): ParsedTimeInput {
  if (input instanceof Temporal.Instant) {
    return { kind: 'instant', value: input };
  }

  if (input instanceof Temporal.ZonedDateTime) {
    return { kind: 'zoned', value: input };
  }

  if (input instanceof Temporal.PlainDateTime) {
    return { kind: 'local', value: input };
  }

  if (input instanceof Temporal.PlainDate) {
    return { kind: 'local', value: input.toPlainDateTime() };
  }

  fail(UNSUPPORTED_INPUT_MESSAGE);
}

function inferTimeZone(parsed: ParsedTimeInput, options: TimeOptions): string {
  const tz = options.tz ?? (parsed.kind === 'zoned' ? parsed.value.timeZoneId : undefined);

  if (!tz) {
    fail(MISSING_TIMEZONE_MESSAGE);
  }

  return tz;
}

function toInstantFromParsed(parsed: ParsedTimeInput, options: TimeOptions): Temporal.Instant {
  if (parsed.kind === 'instant') {
    return parsed.value;
  }

  if (parsed.kind === 'zoned') {
    return parsed.value.toInstant();
  }

  if (!options.tz) {
    fail(MISSING_TIMEZONE_MESSAGE);
  }

  return parsed.value.toZonedDateTime(options.tz, { disambiguation: options.when }).toInstant();
}

function toZonedFromParsed(parsed: ParsedTimeInput, options: TimeOptionsWithTz): Temporal.ZonedDateTime {
  if (parsed.kind === 'zoned') {
    return parsed.value.withTimeZone(options.tz);
  }

  if (parsed.kind === 'local') {
    return parsed.value.toZonedDateTime(options.tz, { disambiguation: options.when });
  }

  return parsed.value.toZonedDateTimeISO(options.tz);
}

function resolveInstant(input: TimeInput, options: TimeOptions = {}): Temporal.Instant {
  return toInstantFromParsed(parseInput(input), options);
}

function resolveDisplayTimeZone(parsed: ParsedTimeInput, tz?: string): string | undefined {
  return tz ?? (parsed.kind === 'zoned' ? parsed.value.timeZoneId : undefined);
}

function resolveRangeDisplayTimeZone(start: ParsedTimeInput, end: ParsedTimeInput, tz?: string): string | undefined {
  if (tz) {
    return tz;
  }

  const startTz = start.kind === 'zoned' ? start.value.timeZoneId : undefined;
  const endTz = end.kind === 'zoned' ? end.value.timeZoneId : undefined;

  if (startTz && endTz && startTz !== endTz) {
    fail(MISMATCHED_RANGE_ZONES_MESSAGE);
  }

  return startTz ?? endTz;
}

function normalizeRange(start: Temporal.Instant, end: Temporal.Instant): [Temporal.Instant, Temporal.Instant] {
  return Temporal.Instant.compare(start, end) <= 0 ? [start, end] : [end, start];
}

function clearBoundary(value: Temporal.ZonedDateTime, unit: BoundaryUnit): Temporal.ZonedDateTime {
  return value.with(BOUNDARY_CONFIG[unit].clear);
}

function addBoundaryUnit(value: Temporal.ZonedDateTime, unit: BoundaryUnit): Temporal.ZonedDateTime {
  return value.add(BOUNDARY_CONFIG[unit].add);
}

function makeFormatter(options: HumanFormatOptions, displayTz?: string): Intl.DateTimeFormat {
  const tz = options.tz ?? displayTz;
  const pattern = options.pattern ?? 'medium';

  if ('intl' in options && options.intl) {
    // intl is the complete spec — no preset merging
    return new Intl.DateTimeFormat(options.locale, { ...options.intl, timeZone: tz });
  }

  const cacheKey = `${String(options.locale ?? '')}|${pattern}|${tz ?? ''}`;
  const cached = DATE_TIME_FORMATTER_CACHE.get(cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(options.locale, { ...FORMAT_PRESETS[pattern], timeZone: tz });

  DATE_TIME_FORMATTER_CACHE.set(cacheKey, formatter);

  return formatter;
}

function getRelativeFormatter(options: RelativeFormatOptions): Intl.RelativeTimeFormat {
  const cacheKey = `${String(options.locale ?? '')}|${options.numeric ?? 'auto'}|${options.style ?? 'long'}`;
  const cached = RELATIVE_TIME_FORMATTER_CACHE.get(cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.RelativeTimeFormat(options.locale, {
    numeric: options.numeric ?? 'auto',
    style: options.style ?? 'long',
  });

  RELATIVE_TIME_FORMATTER_CACHE.set(cacheKey, formatter);

  return formatter;
}

function getDurationFormatter(options: DurationFormatOptions): DurationFormatter | undefined {
  const cacheKey = `${String(options.locale ?? '')}|${options.style ?? ''}`;
  const cached = DURATION_FORMATTER_CACHE.get(cacheKey);

  if (cached) {
    return cached;
  }

  const IntlWithDurationFormat = Intl as typeof Intl & { DurationFormat?: DurationFormatterConstructor };

  if (!IntlWithDurationFormat.DurationFormat) {
    return undefined;
  }

  const formatter = new IntlWithDurationFormat.DurationFormat(options.locale, { style: options.style });

  DURATION_FORMATTER_CACHE.set(cacheKey, formatter);

  return formatter;
}

function toRelativeUnit(seconds: number): { unit: Intl.RelativeTimeFormatUnit; value: number } {
  const abs = Math.abs(seconds);

  if (abs < 60) return { unit: 'second', value: Math.round(seconds) };

  if (abs < 3600) return { unit: 'minute', value: Math.round(seconds / 60) };

  if (abs < 86400) return { unit: 'hour', value: Math.round(seconds / 3600) };

  if (abs < 604800) return { unit: 'day', value: Math.round(seconds / 86400) };

  if (abs < 2629800) return { unit: 'week', value: Math.round(seconds / 604800) };

  if (abs < 31557600) return { unit: 'month', value: Math.round(seconds / 2629800) };

  return { unit: 'year', value: Math.round(seconds / 31557600) };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function now(tz: string): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(tz);
}

export function parseLocal(input: string): Temporal.PlainDateTime {
  try {
    return Temporal.PlainDateTime.from(input);
  } catch {
    /* fall through to date-only */
  }

  try {
    return Temporal.PlainDate.from(input).toPlainDateTime();
  } catch {
    fail(INVALID_LOCAL_TIME_STRING_MESSAGE);
  }
}

export function toInstant(input: TimeInput, options: TimeOptions = {}): Temporal.Instant {
  return toInstantFromParsed(parseInput(input), options);
}

export function toZoned(input: TimeInput, options: TimeOptionsWithTz): Temporal.ZonedDateTime {
  return toZonedFromParsed(parseInput(input), options);
}

export function shift(
  input: TimeInput,
  duration: Temporal.DurationLike,
  options: TimeOptions = {},
): Temporal.ZonedDateTime {
  const parsed = parseInput(input);
  const tz = inferTimeZone(parsed, options);

  return toZonedFromParsed(parsed, { tz, when: options.when }).add(duration);
}

export function difference(start: TimeInput, end: TimeInput, options: DifferenceOptions): Temporal.Duration {
  const { tz, when, ...sinceOptions } = options;

  return toZonedFromParsed(parseInput(end), { tz, when }).since(
    toZonedFromParsed(parseInput(start), { tz, when }),
    sinceOptions,
  );
}

export function within(value: TimeInput, start: TimeInput, end: TimeInput, options: TimeOptions = {}): boolean {
  const target = resolveInstant(value, options);
  const [lower, upper] = normalizeRange(resolveInstant(start, options), resolveInstant(end, options));

  return Temporal.Instant.compare(lower, target) <= 0 && Temporal.Instant.compare(target, upper) <= 0;
}

export function clamp(value: TimeInput, start: TimeInput, end: TimeInput, options: TimeOptions = {}): Temporal.Instant {
  const target = resolveInstant(value, options);
  const [lower, upper] = normalizeRange(resolveInstant(start, options), resolveInstant(end, options));

  if (Temporal.Instant.compare(target, lower) < 0) return lower;

  if (Temporal.Instant.compare(target, upper) > 0) return upper;

  return target;
}

export function isBefore(a: TimeInput, b: TimeInput, options: TimeOptions = {}): boolean {
  return Temporal.Instant.compare(resolveInstant(a, options), resolveInstant(b, options)) < 0;
}

export function isAfter(a: TimeInput, b: TimeInput, options: TimeOptions = {}): boolean {
  return Temporal.Instant.compare(resolveInstant(a, options), resolveInstant(b, options)) > 0;
}

export function isSameDay(a: TimeInput, b: TimeInput, options: TimeOptions = {}): boolean {
  const parsedA = parseInput(a);
  const parsedB = parseInput(b);

  if (!options.tz) {
    const tzA = parsedA.kind === 'zoned' ? parsedA.value.timeZoneId : undefined;
    const tzB = parsedB.kind === 'zoned' ? parsedB.value.timeZoneId : undefined;

    if (tzA && tzB && tzA !== tzB) {
      fail(MISMATCHED_SAME_DAY_ZONES_MESSAGE);
    }
  }

  const tz = inferTimeZone(parsedA, options);
  const left = toZonedFromParsed(parsedA, { tz, when: options.when });
  const right = toZonedFromParsed(parsedB, { tz, when: options.when });

  return left.year === right.year && left.month === right.month && left.day === right.day;
}

export function startOf(input: TimeInput, unit: BoundaryUnit, options: BoundaryOptions = {}): Temporal.ZonedDateTime {
  const parsed = parseInput(input);
  const tz = inferTimeZone(parsed, options);
  let result = clearBoundary(toZonedFromParsed(parsed, { tz, when: options.when }), unit);

  if (unit === 'week') {
    const weekStartsOn = options.weekStartsOn ?? 1;
    const daysToSubtract = (result.dayOfWeek - weekStartsOn + 7) % 7;

    result = result.subtract({ days: daysToSubtract });
  }

  return result;
}

export function endOf(input: TimeInput, unit: BoundaryUnit, options: BoundaryOptions = {}): Temporal.ZonedDateTime {
  return addBoundaryUnit(startOf(input, unit, options), unit).subtract({ nanoseconds: 1 });
}

export function formatHuman(input: TimeInput, options: HumanFormatOptions = {}): string {
  const parsed = parseInput(input);
  const displayTz = resolveDisplayTimeZone(parsed, options.tz);
  const instant = toInstantFromParsed(parsed, { tz: displayTz });

  return makeFormatter(options, displayTz).format(new Date(instant.epochMilliseconds));
}

export function formatRange(start: TimeInput, end: TimeInput, options: HumanFormatOptions = {}): string {
  const parsedStart = parseInput(start);
  const parsedEnd = parseInput(end);
  const displayTz = resolveRangeDisplayTimeZone(parsedStart, parsedEnd, options.tz);
  const formatter = makeFormatter(options, displayTz);

  return formatter.formatRange(
    new Date(toInstantFromParsed(parsedStart, { tz: displayTz }).epochMilliseconds),
    new Date(toInstantFromParsed(parsedEnd, { tz: displayTz }).epochMilliseconds),
  );
}

export function formatInstant(input: TimeInput, options: TimeOptions = {}): string {
  return toInstantFromParsed(parseInput(input), options).toString();
}

export function formatZoned(input: TimeInput, options: TimeOptions = {}): string {
  const parsed = parseInput(input);
  const tz = inferTimeZone(parsed, options);

  return toZonedFromParsed(parsed, { tz, when: options.when }).toString();
}

export function formatRelative(input: TimeInput, options: RelativeFormatOptions = {}): string {
  const target = resolveInstant(input, { tz: options.tz, when: options.when });
  const base = options.base
    ? resolveInstant(options.base, { tz: options.tz, when: options.when })
    : Temporal.Now.instant();
  const differenceInSeconds = (target.epochMilliseconds - base.epochMilliseconds) / 1000;
  const { unit, value } = toRelativeUnit(differenceInSeconds);

  return getRelativeFormatter(options).format(value, unit);
}

export function formatDuration(input: string | Temporal.DurationLike, options: DurationFormatOptions = {}): string {
  const duration = parseDuration(input);

  return getDurationFormatter(options)?.format(duration) ?? duration.toString();
}

export function parseDuration(input: string | Temporal.DurationLike): Temporal.Duration {
  try {
    return Temporal.Duration.from(input);
  } catch {
    fail('Invalid duration input. Expected ISO duration string or Temporal.DurationLike.');
  }
}
