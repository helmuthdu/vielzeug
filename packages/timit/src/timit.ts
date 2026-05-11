import { Temporal } from '@js-temporal/polyfill';

export type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

export type TimeInput =
  | Temporal.Instant
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime
  | string;

type LocalTemporalInput = Temporal.PlainDate | Temporal.PlainDateTime;
type AbsoluteTemporalInput = Temporal.Instant | Temporal.ZonedDateTime;

export interface TimeOptions {
  tz?: string;
  when?: DateTimeDisambiguation;
}

export type TimeOptionsWithTz = TimeOptions & { tz: string };

export type TimeOptionsOptionalTz = TimeOptions | TimeOptionsWithTz;

export interface DifferenceOptions extends TimeOptionsWithTz {
  largestUnit?: Temporal.DateTimeUnit;
  roundingIncrement?: number;
  roundingMode?: Temporal.RoundingMode;
  smallestUnit?: Temporal.DateTimeUnit;
}

export type FormatPattern = 'short' | 'medium' | 'long' | 'date-only' | 'time-only';

export interface HumanFormatOptions {
  pattern?: FormatPattern;
  locale?: Intl.LocalesArgument;
  tz?: string;
  intl?: Intl.DateTimeFormatOptions;
}

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

export interface ISOFormatOptions extends TimeOptions {
  style?: 'instant' | 'zoned';
}

export interface DurationFormatOptions {
  locale?: Intl.LocalesArgument;
  style?: 'long' | 'short' | 'narrow' | 'digital';
}

type ParsedTimeInput =
  | { kind: 'instant'; value: Temporal.Instant }
  | { kind: 'local'; value: Temporal.PlainDateTime }
  | { kind: 'zoned'; value: Temporal.ZonedDateTime };

const ERROR_PREFIX = '[timit]';
const INVALID_TIME_STRING_MESSAGE =
  'Invalid time string. Expected ISO instant, zoned date/time, or plain local date/time.';
const INVALID_LOCAL_TIME_STRING_MESSAGE = 'Invalid local date/time string. Expected YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.';
const MISSING_LOCAL_TIME_ZONE_MESSAGE =
  'This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.';
const MISSING_ZONED_STYLE_TIME_ZONE_MESSAGE = 'formatISO with style="zoned" requires options.tz for non-zoned inputs.';
const UNSUPPORTED_TIME_INPUT_MESSAGE = 'Unsupported time input type.';

const FORMAT_PRESETS: Record<FormatPattern, Intl.DateTimeFormatOptions> = {
  'date-only': { dateStyle: 'short' },
  long: { dateStyle: 'full', timeStyle: 'long' },
  medium: { dateStyle: 'medium', timeStyle: 'short' },
  short: { dateStyle: 'short', timeStyle: 'short' },
  'time-only': { timeStyle: 'short' },
};

const DATE_TIME_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function fail(message: string): never {
  throw new TypeError(`${ERROR_PREFIX} ${message}`);
}

function resolveDisplayTimeZone(parsed: ParsedTimeInput, tz?: string): string | undefined {
  return tz ?? (parsed.kind === 'zoned' ? parsed.value.timeZoneId : undefined);
}

function inferTimeZone(parsed: ParsedTimeInput, options: TimeOptionsOptionalTz): string {
  const explicit = options.tz ?? (parsed.kind === 'zoned' ? parsed.value.timeZoneId : undefined);

  if (!explicit) fail(MISSING_LOCAL_TIME_ZONE_MESSAGE);

  return explicit;
}

function resolveInstant(input: TimeInput, options: TimeOptions = {}): Temporal.Instant {
  return toInstantFromParsed(parseInput(input), options);
}

function parseStringInput(input: string): ParsedTimeInput {
  try {
    return { kind: 'zoned', value: Temporal.ZonedDateTime.from(input) };
  } catch {
    /* try next */
  }

  try {
    return { kind: 'instant', value: Temporal.Instant.from(input) };
  } catch {
    /* try next */
  }

  try {
    return { kind: 'local', value: Temporal.PlainDateTime.from(input) };
  } catch {
    /* try next */
  }

  try {
    return { kind: 'local', value: Temporal.PlainDate.from(input).toPlainDateTime() };
  } catch {
    /* try next */
  }

  fail(INVALID_TIME_STRING_MESSAGE);
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

  if (typeof input === 'string') {
    return parseStringInput(input);
  }

  fail(UNSUPPORTED_TIME_INPUT_MESSAGE);
}

function toInstantFromParsed(parsed: ParsedTimeInput, options: TimeOptions): Temporal.Instant {
  if (parsed.kind === 'instant') {
    return parsed.value;
  }

  if (parsed.kind === 'zoned') {
    return parsed.value.toInstant();
  }

  if (!options.tz) {
    fail(MISSING_LOCAL_TIME_ZONE_MESSAGE);
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

function makeFormatter(options: HumanFormatOptions = {}, displayTz?: string): Intl.DateTimeFormat {
  const tz = options.tz ?? displayTz;

  if (options.intl) {
    return new Intl.DateTimeFormat(options.locale, {
      ...FORMAT_PRESETS[options.pattern ?? 'medium'],
      ...options.intl,
      timeZone: tz,
    });
  }

  const cacheKey = `${String(options.locale ?? '')}|${options.pattern ?? 'medium'}|${tz ?? ''}`;
  const cached = DATE_TIME_FORMATTER_CACHE.get(cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(options.locale, {
    ...FORMAT_PRESETS[options.pattern ?? 'medium'],
    timeZone: tz,
  });

  DATE_TIME_FORMATTER_CACHE.set(cacheKey, formatter);

  return formatter;
}

function toUtcDate(value: Temporal.Instant): Date {
  return new Date(value.epochMilliseconds);
}

function toRelativeUnit(seconds: number): { unit: Intl.RelativeTimeFormatUnit; value: number } {
  const abs = Math.abs(seconds);

  if (abs < 60) {
    return { unit: 'second', value: Math.round(seconds) };
  }

  if (abs < 3600) {
    return { unit: 'minute', value: Math.round(seconds / 60) };
  }

  if (abs < 86400) {
    return { unit: 'hour', value: Math.round(seconds / 3600) };
  }

  if (abs < 604800) {
    return { unit: 'day', value: Math.round(seconds / 86400) };
  }

  if (abs < 2629800) {
    return { unit: 'week', value: Math.round(seconds / 604800) };
  }

  if (abs < 31557600) {
    return { unit: 'month', value: Math.round(seconds / 2629800) };
  }

  return { unit: 'year', value: Math.round(seconds / 31557600) };
}

type DurationFormatter = {
  format(value: Temporal.Duration | Temporal.DurationLike): string;
};

type DurationFormatterConstructor = new (
  locales?: Intl.LocalesArgument,
  options?: { style?: 'long' | 'short' | 'narrow' | 'digital' },
) => DurationFormatter;

function getDurationFormatter(options: DurationFormatOptions): DurationFormatter | undefined {
  const IntlWithDurationFormat = Intl as typeof Intl & { DurationFormat?: DurationFormatterConstructor };

  if (!IntlWithDurationFormat.DurationFormat) {
    return undefined;
  }

  return new IntlWithDurationFormat.DurationFormat(options.locale, {
    style: options.style,
  });
}

function clearSmallerParts(value: Temporal.ZonedDateTime, unit: BoundaryUnit): Temporal.ZonedDateTime {
  if (unit === 'minute') {
    return value.with({ microsecond: 0, millisecond: 0, nanosecond: 0, second: 0 });
  }

  if (unit === 'hour') {
    return value.with({ microsecond: 0, millisecond: 0, minute: 0, nanosecond: 0, second: 0 });
  }

  if (unit === 'day' || unit === 'week') {
    return value.with({ hour: 0, microsecond: 0, millisecond: 0, minute: 0, nanosecond: 0, second: 0 });
  }

  if (unit === 'month') {
    return value.with({ day: 1, hour: 0, microsecond: 0, millisecond: 0, minute: 0, nanosecond: 0, second: 0 });
  }

  return value.with({
    day: 1,
    hour: 0,
    microsecond: 0,
    millisecond: 0,
    minute: 0,
    month: 1,
    nanosecond: 0,
    second: 0,
  });
}

function addBoundaryUnit(value: Temporal.ZonedDateTime, unit: BoundaryUnit): Temporal.ZonedDateTime {
  if (unit === 'minute') {
    return value.add({ minutes: 1 });
  }

  if (unit === 'hour') {
    return value.add({ hours: 1 });
  }

  if (unit === 'day') {
    return value.add({ days: 1 });
  }

  if (unit === 'week') {
    return value.add({ weeks: 1 });
  }

  if (unit === 'month') {
    return value.add({ months: 1 });
  }

  return value.add({ years: 1 });
}

function normalizeRange(start: Temporal.Instant, end: Temporal.Instant): [Temporal.Instant, Temporal.Instant] {
  return Temporal.Instant.compare(start, end) <= 0 ? [start, end] : [end, start];
}

export function now(tz: string): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(tz);
}

export function parseLocal(input: string): Temporal.PlainDateTime {
  try {
    return Temporal.PlainDateTime.from(input);
  } catch {
    /* try date-only fallback */
  }

  try {
    return Temporal.PlainDate.from(input).toPlainDateTime();
  } catch {
    fail(INVALID_LOCAL_TIME_STRING_MESSAGE);
  }
}

export function toInstant(input: LocalTemporalInput, options: TimeOptionsWithTz): Temporal.Instant;
export function toInstant(input: AbsoluteTemporalInput | string, options?: TimeOptions): Temporal.Instant;
export function toInstant(input: TimeInput, options: TimeOptions = {}): Temporal.Instant {
  return toInstantFromParsed(parseInput(input), options);
}

export function toZoned(input: TimeInput, options: TimeOptionsWithTz): Temporal.ZonedDateTime {
  return toZonedFromParsed(parseInput(input), options);
}

export function shift(
  input: TimeInput,
  duration: Temporal.DurationLike,
  options: TimeOptionsOptionalTz = {},
): Temporal.ZonedDateTime {
  const parsed = parseInput(input);
  const tz = inferTimeZone(parsed, options);

  return toZonedFromParsed(parsed, { tz, when: options.when }).add(duration);
}

export function difference(start: TimeInput, end: TimeInput, options: DifferenceOptions): Temporal.Duration {
  const parsedStart = parseInput(start);
  const parsedEnd = parseInput(end);
  const { tz, when, ...sinceOptions } = options;
  const startDateTime = toZonedFromParsed(parsedStart, { tz, when });
  const endDateTime = toZonedFromParsed(parsedEnd, { tz, when });

  return endDateTime.since(startDateTime, sinceOptions);
}

export function within(value: TimeInput, start: TimeInput, end: TimeInput, options: TimeOptions = {}): boolean {
  const target = resolveInstant(value, options);
  const lowerBound = resolveInstant(start, options);
  const upperBound = resolveInstant(end, options);
  const [lower, upper] = normalizeRange(lowerBound, upperBound);

  return Temporal.Instant.compare(lower, target) <= 0 && Temporal.Instant.compare(target, upper) <= 0;
}

export function clamp(value: TimeInput, start: TimeInput, end: TimeInput, options: TimeOptions = {}): Temporal.Instant {
  const target = resolveInstant(value, options);
  const lowerBound = resolveInstant(start, options);
  const upperBound = resolveInstant(end, options);
  const [lower, upper] = normalizeRange(lowerBound, upperBound);

  if (Temporal.Instant.compare(target, lower) < 0) {
    return lower;
  }

  if (Temporal.Instant.compare(target, upper) > 0) {
    return upper;
  }

  return target;
}

export function isBefore(a: TimeInput, b: TimeInput, options: TimeOptions = {}): boolean {
  return Temporal.Instant.compare(resolveInstant(a, options), resolveInstant(b, options)) < 0;
}

export function isAfter(a: TimeInput, b: TimeInput, options: TimeOptions = {}): boolean {
  return Temporal.Instant.compare(resolveInstant(a, options), resolveInstant(b, options)) > 0;
}

export function isSameDay(a: TimeInput, b: TimeInput, options: TimeOptionsWithTz): boolean {
  const parsedA = parseInput(a);
  const parsedB = parseInput(b);
  const left = toZonedFromParsed(parsedA, options);
  const right = toZonedFromParsed(parsedB, options);

  return left.year === right.year && left.month === right.month && left.day === right.day;
}

export function startOf(input: TimeInput, unit: BoundaryUnit, options: BoundaryOptions = {}): Temporal.ZonedDateTime {
  const parsed = parseInput(input);
  const tz = inferTimeZone(parsed, options);
  let result = clearSmallerParts(toZonedFromParsed(parsed, { tz, when: options.when }), unit);

  if (unit === 'week') {
    const weekStartsOn = 'weekStartsOn' in options ? (options.weekStartsOn ?? 1) : 1;
    const daysToSubtract = (result.dayOfWeek - weekStartsOn + 7) % 7;

    result = result.subtract({ days: daysToSubtract });
  }

  return result;
}

export function endOf(input: TimeInput, unit: BoundaryUnit, options: BoundaryOptions = {}): Temporal.ZonedDateTime {
  const start = startOf(input, unit, options);

  return addBoundaryUnit(start, unit).subtract({ nanoseconds: 1 });
}

export function formatHuman(input: TimeInput, options: HumanFormatOptions = {}): string {
  const parsed = parseInput(input);
  const instant = toInstantFromParsed(parsed, { tz: options.tz });
  const displayTz = resolveDisplayTimeZone(parsed, options.tz);

  return makeFormatter(options, displayTz).format(toUtcDate(instant));
}

export function formatRange(start: TimeInput, end: TimeInput, options: HumanFormatOptions = {}): string {
  const parsedStart = parseInput(start);
  const parsedEnd = parseInput(end);
  const displayTz = resolveDisplayTimeZone(parsedStart, options.tz);
  const formatter = makeFormatter(options, displayTz);
  const startDate = toUtcDate(toInstantFromParsed(parsedStart, { tz: options.tz }));
  const endDate = toUtcDate(toInstantFromParsed(parsedEnd, { tz: options.tz }));

  return formatter.formatRange(startDate, endDate);
}

export function formatISO(input: TimeInput, options: ISOFormatOptions = {}): string {
  const parsed = parseInput(input);

  if (options.style === 'zoned') {
    if (parsed.kind === 'zoned' && !options.tz) {
      return parsed.value.toString();
    }

    if (!options.tz) {
      fail(MISSING_ZONED_STYLE_TIME_ZONE_MESSAGE);
    }

    return toZonedFromParsed(parsed, { tz: options.tz, when: options.when }).toString();
  }

  return toInstantFromParsed(parsed, options).toString();
}

export function formatRelative(input: TimeInput, options: RelativeFormatOptions = {}): string {
  const target = resolveInstant(input, { tz: options.tz, when: options.when });
  const base = options.base
    ? resolveInstant(options.base, { tz: options.tz, when: options.when })
    : Temporal.Now.instant();
  const differenceInSeconds = (target.epochMilliseconds - base.epochMilliseconds) / 1000;
  const { unit, value } = toRelativeUnit(differenceInSeconds);
  const formatter = new Intl.RelativeTimeFormat(options.locale, {
    numeric: options.numeric ?? 'auto',
    style: options.style ?? 'long',
  });

  return formatter.format(value, unit);
}

export function formatDuration(input: string | Temporal.DurationLike, options: DurationFormatOptions = {}): string {
  const duration = parseDuration(input);

  if (!options.locale && !options.style) {
    return duration.toString();
  }

  const formatter = getDurationFormatter(options);

  if (!formatter) {
    return duration.toString();
  }

  return formatter.format(duration);
}

export function parseDuration(input: string | Temporal.DurationLike): Temporal.Duration {
  try {
    return Temporal.Duration.from(input);
  } catch {
    fail('Invalid duration input. Expected ISO duration string or Temporal.DurationLike.');
  }
}
