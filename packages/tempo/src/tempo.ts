import { Temporal } from '@js-temporal/polyfill';

export type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

export type TimeInput = Temporal.Instant | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;
export type RelativeTimeInput = Temporal.Instant | Temporal.ZonedDateTime;

export interface TimeOptions {
  tz?: string;
  when?: DateTimeDisambiguation;
}

export type TimeOptionsWithTz = TimeOptions & { tz: string };

export interface DifferenceOptions extends TimeOptions {
  largestUnit?: Temporal.DateTimeUnit;
  roundingIncrement?: number;
  roundingMode?: Temporal.RoundingMode;
  smallestUnit?: Temporal.DateTimeUnit;
}

export type FormatPattern = 'short' | 'medium' | 'long' | 'date-only' | 'time-only';

/**
 * Options for {@link format} and {@link formatRange}.
 *
 * `intl` and `pattern` are mutually exclusive: when `intl` is provided it takes
 * full precedence over `pattern`. Providing both is valid but `pattern` is ignored.
 */
export interface FormatOptions {
  intl?: Intl.DateTimeFormatOptions;
  locale?: Intl.LocalesArgument;
  pattern?: FormatPattern;
  tz?: string;
}

export interface RelativeFormatOptions {
  base?: RelativeTimeInput;
  locale?: Intl.LocalesArgument;
  numeric?: Intl.RelativeTimeFormatNumeric;
  style?: Intl.RelativeTimeFormatStyle;
}

export type BoundaryUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
export type WeekStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BoundaryOptions extends TimeOptions {
  weekStartsOn?: WeekStartDay;
}

export interface CompareOptions extends TimeOptions {
  unit?: BoundaryUnit;
  weekStartsOn?: WeekStartDay;
}

export type IsSameOptions = CompareOptions;

export interface DurationFormatOptions {
  locale?: Intl.LocalesArgument;
  style?: 'digital' | 'long' | 'narrow' | 'short';
}

// ─── Internal types ───────────────────────────────────────────────────────────

type ParsedTimeInput =
  | { kind: 'instant'; value: Temporal.Instant }
  | { kind: 'local'; value: Temporal.PlainDateTime }
  | { kind: 'zoned'; value: Temporal.ZonedDateTime };

// ─── Constants ────────────────────────────────────────────────────────────────

const ERROR_PREFIX = '[tempo]';
const INVALID_LOCAL_TIME_STRING_MESSAGE =
  'Invalid local date/time string. Expected an ISO 8601 date or date-time string (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss).';
const MISSING_TIMEZONE_MESSAGE = 'This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.';
const MISMATCHED_RANGE_ZONES_MESSAGE =
  'formatRange received ZonedDateTime inputs with different time zones. Pass options.tz explicitly.';
const MISMATCHED_COMPARISON_ZONES_MESSAGE =
  'Comparison received ZonedDateTime inputs with different time zones. Pass options.tz explicitly.';
const UNSUPPORTED_INPUT_MESSAGE = 'Unsupported time input type.';
const CACHE_MAX_SIZE = 100;
const RELATIVE_UNITS: ReadonlyArray<{
  scale: number;
  thresholdToPromote: number;
  unit: Intl.RelativeTimeFormatUnit;
}> = [
  { scale: 1, thresholdToPromote: 60, unit: 'second' },
  { scale: 60, thresholdToPromote: 60, unit: 'minute' },
  { scale: 3600, thresholdToPromote: 24, unit: 'hour' },
  { scale: 86400, thresholdToPromote: 7, unit: 'day' },
  // 2629800 / 604800 ~= 4.348 week-to-month promotion threshold used below.
  { scale: 604800, thresholdToPromote: 2629800 / 604800, unit: 'week' },
  { scale: 2629800, thresholdToPromote: 12, unit: 'month' },
  { scale: 31557600, thresholdToPromote: Number.POSITIVE_INFINITY, unit: 'year' },
];

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

// Units that require a timezone-aware context because Temporal.Instant does not support them
// as a largestUnit or smallestUnit in difference operations.
const CALENDAR_UNITS = new Set<Temporal.DateTimeUnit>(['day', 'week', 'month', 'year']);

// ─── Bounded cache ────────────────────────────────────────────────────────────

function getCached<K, V>(cache: Map<K, V>, key: K): V | undefined {
  if (!cache.has(key)) {
    return undefined;
  }

  const value = cache.get(key) as V;

  // Refresh insertion order on hit for LRU-like behavior.
  cache.delete(key);
  cache.set(key, value);

  return value;
}

function setCached<K, V>(cache: Map<K, V>, key: K, value: V): void {
  cache.set(key, value);

  if (cache.size <= CACHE_MAX_SIZE) {
    return;
  }

  const oldestKey = cache.keys().next().value as K;

  cache.delete(oldestKey);
}

type DurationFormatter = {
  format(value: Temporal.Duration): string;
};

type DurationFormatterConstructor = new (
  locales?: Intl.LocalesArgument,
  options?: { style?: 'digital' | 'long' | 'narrow' | 'short' },
) => DurationFormatter;

const DATE_TIME_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
const RELATIVE_TIME_FORMATTER_CACHE = new Map<string, Intl.RelativeTimeFormat>();
const DURATION_FORMATTER_CACHE = new Map<string, DurationFormatter>();

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

function inferSharedTimeZone(parsedValues: ParsedTimeInput[], options: TimeOptions): string {
  if (options.tz) {
    return options.tz;
  }

  let inferred: string | undefined;

  for (const parsed of parsedValues) {
    if (parsed.kind !== 'zoned') {
      continue;
    }

    const tz = parsed.value.timeZoneId;

    if (!inferred) {
      inferred = tz;
      continue;
    }

    if (inferred !== tz) {
      fail(MISMATCHED_COMPARISON_ZONES_MESSAGE);
    }
  }

  if (!inferred) {
    fail(MISSING_TIMEZONE_MESSAGE);
  }

  return inferred;
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

function alignToWeekStart(value: Temporal.ZonedDateTime, weekStartsOn: WeekStartDay): Temporal.ZonedDateTime {
  const daysToSubtract = (value.dayOfWeek - weekStartsOn + 7) % 7;

  return value.subtract({ days: daysToSubtract });
}

function startOfParsed(
  parsed: ParsedTimeInput,
  unit: BoundaryUnit,
  options: TimeOptionsWithTz & { weekStartsOn?: WeekStartDay },
): Temporal.ZonedDateTime {
  let result = clearBoundary(toZonedFromParsed(parsed, { tz: options.tz, when: options.when }), unit);

  if (unit === 'week') {
    result = alignToWeekStart(result, options.weekStartsOn ?? 1);
  }

  return result;
}

function clearBoundary(value: Temporal.ZonedDateTime, unit: BoundaryUnit): Temporal.ZonedDateTime {
  return value.with(BOUNDARY_CONFIG[unit].clear);
}

function addBoundaryUnit(value: Temporal.ZonedDateTime, unit: BoundaryUnit): Temporal.ZonedDateTime {
  return value.add(BOUNDARY_CONFIG[unit].add);
}

function floorToBoundaryInstant(
  parsed: ParsedTimeInput,
  unit: BoundaryUnit,
  options: TimeOptionsWithTz & { weekStartsOn?: WeekStartDay },
): Temporal.Instant {
  return startOfParsed(parsed, unit, options).toInstant();
}

function resolveUnitRange(
  value: TimeInput,
  start: TimeInput,
  end: TimeInput,
  options: CompareOptions & { unit: BoundaryUnit },
): { lower: Temporal.Instant; target: Temporal.Instant; upper: Temporal.Instant } {
  const parsedValue = parseInput(value);
  const parsedStart = parseInput(start);
  const parsedEnd = parseInput(end);
  const tz = inferSharedTimeZone([parsedValue, parsedStart, parsedEnd], options);
  const unitOptions = { tz, weekStartsOn: options.weekStartsOn, when: options.when };
  const target = floorToBoundaryInstant(parsedValue, options.unit, unitOptions);
  const [lower, upper] = normalizeRange(
    floorToBoundaryInstant(parsedStart, options.unit, unitOptions),
    floorToBoundaryInstant(parsedEnd, options.unit, unitOptions),
  );

  return { lower, target, upper };
}

function resolveUnitPair(
  a: TimeInput,
  b: TimeInput,
  options: CompareOptions & { unit: BoundaryUnit },
): { left: Temporal.Instant; right: Temporal.Instant } {
  const parsedA = parseInput(a);
  const parsedB = parseInput(b);
  const tz = inferSharedTimeZone([parsedA, parsedB], options);
  const unitOptions = { tz, weekStartsOn: options.weekStartsOn, when: options.when };

  return {
    left: floorToBoundaryInstant(parsedA, options.unit, unitOptions),
    right: floorToBoundaryInstant(parsedB, options.unit, unitOptions),
  };
}

function serializeIntlOptions(options: Intl.DateTimeFormatOptions): string {
  return JSON.stringify(
    Object.entries(options)
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, String(value)]),
  );
}

function makeFormatter(options: FormatOptions, displayTz?: string): Intl.DateTimeFormat {
  const tz = options.tz ?? displayTz;

  if (options.intl) {
    const cacheKey = `${String(options.locale ?? '')}|intl|${tz ?? ''}|${serializeIntlOptions(options.intl)}`;
    const cached = getCached(DATE_TIME_FORMATTER_CACHE, cacheKey);

    if (cached) {
      return cached;
    }

    // Only override timeZone when tz is defined; spreading `timeZone: undefined`
    // would erase any timeZone the caller placed directly in options.intl.
    const intlOptions = tz !== undefined ? { ...options.intl, timeZone: tz } : options.intl;
    const formatter = new Intl.DateTimeFormat(options.locale, intlOptions);

    setCached(DATE_TIME_FORMATTER_CACHE, cacheKey, formatter);

    return formatter;
  }

  const pattern = options.pattern ?? 'medium';

  const cacheKey = `${String(options.locale ?? '')}|${pattern}|${tz ?? ''}`;
  const cached = getCached(DATE_TIME_FORMATTER_CACHE, cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(options.locale, { ...FORMAT_PRESETS[pattern], timeZone: tz });

  setCached(DATE_TIME_FORMATTER_CACHE, cacheKey, formatter);

  return formatter;
}

function getRelativeFormatter(options: RelativeFormatOptions): Intl.RelativeTimeFormat {
  const cacheKey = `${String(options.locale ?? '')}|${options.numeric ?? 'auto'}|${options.style ?? 'long'}`;
  const cached = getCached(RELATIVE_TIME_FORMATTER_CACHE, cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.RelativeTimeFormat(options.locale, {
    numeric: options.numeric ?? 'auto',
    style: options.style ?? 'long',
  });

  setCached(RELATIVE_TIME_FORMATTER_CACHE, cacheKey, formatter);

  return formatter;
}

function toRelativeUnit(seconds: number): { unit: Intl.RelativeTimeFormatUnit; value: number } {
  if (!Number.isFinite(seconds)) fail('formatRelative received a non-finite time difference.');

  const roundedSeconds = Math.round(seconds);

  for (const { scale, thresholdToPromote, unit } of RELATIVE_UNITS) {
    const value = Math.round(roundedSeconds / scale);

    if (Math.abs(value) < thresholdToPromote) {
      return { unit, value };
    }
  }

  return { unit: 'year', value: Math.round(roundedSeconds / 31557600) };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function clearCaches(): void {
  DATE_TIME_FORMATTER_CACHE.clear();
  RELATIVE_TIME_FORMATTER_CACHE.clear();
  DURATION_FORMATTER_CACHE.clear();
}

export function now(tz: string): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(tz);
}

export function parseLocal(input: string): Temporal.PlainDateTime {
  try {
    return Temporal.PlainDateTime.from(input);
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

export function difference(start: TimeInput, end: TimeInput, options: DifferenceOptions = {}): Temporal.Duration {
  const parsedStart = parseInput(start);
  const parsedEnd = parseInput(end);
  const { largestUnit, roundingIncrement, roundingMode, smallestUnit } = options;
  const roundingOptions = { largestUnit, roundingIncrement, roundingMode, smallestUnit };

  // Fast path: both inputs are absolute instants and no calendar unit is requested.
  // Calendar units (day, week, month, year) are timezone-dependent and still require options.tz.
  const needsCalendar =
    (largestUnit !== undefined && CALENDAR_UNITS.has(largestUnit)) ||
    (smallestUnit !== undefined && CALENDAR_UNITS.has(smallestUnit));

  if (!needsCalendar && parsedStart.kind === 'instant' && parsedEnd.kind === 'instant') {
    // Safe: CALENDAR_UNITS guards ensure neither largestUnit nor smallestUnit is a
    // calendar unit (day/week/month/year) at this point, so Temporal.Instant.since() accepts them.
    return parsedEnd.value.since(parsedStart.value, roundingOptions as Temporal.DifferenceOptions<Temporal.TimeUnit>);
  }

  const tz = inferSharedTimeZone([parsedStart, parsedEnd], options);

  return toZonedFromParsed(parsedEnd, { tz, when: options.when }).since(
    toZonedFromParsed(parsedStart, { tz, when: options.when }),
    roundingOptions,
  );
}

export function within(value: TimeInput, start: TimeInput, end: TimeInput, options: CompareOptions = {}): boolean {
  if (!options.unit) {
    const target = toInstant(value, options);
    const [lower, upper] = normalizeRange(toInstant(start, options), toInstant(end, options));

    return Temporal.Instant.compare(lower, target) <= 0 && Temporal.Instant.compare(target, upper) <= 0;
  }

  const { lower, target, upper } = resolveUnitRange(
    value,
    start,
    end,
    options as CompareOptions & { unit: BoundaryUnit },
  );

  return Temporal.Instant.compare(lower, target) <= 0 && Temporal.Instant.compare(target, upper) <= 0;
}

export function clamp(
  value: TimeInput,
  start: TimeInput,
  end: TimeInput,
  options: CompareOptions = {},
): Temporal.Instant {
  if (!options.unit) {
    const target = toInstant(value, options);
    const [lower, upper] = normalizeRange(toInstant(start, options), toInstant(end, options));

    if (Temporal.Instant.compare(target, lower) < 0) return lower;

    if (Temporal.Instant.compare(target, upper) > 0) return upper;

    return target;
  }

  const { lower, target, upper } = resolveUnitRange(
    value,
    start,
    end,
    options as CompareOptions & { unit: BoundaryUnit },
  );

  if (Temporal.Instant.compare(target, lower) < 0) return lower;

  if (Temporal.Instant.compare(target, upper) > 0) return upper;

  return target;
}

function compareByUnit(a: TimeInput, b: TimeInput, options: CompareOptions): number {
  if (!options.unit) {
    return Temporal.Instant.compare(toInstant(a, options), toInstant(b, options));
  }

  const { left, right } = resolveUnitPair(a, b, options as CompareOptions & { unit: BoundaryUnit });

  return Temporal.Instant.compare(left, right);
}

export function isBefore(a: TimeInput, b: TimeInput, options: CompareOptions = {}): boolean {
  return compareByUnit(a, b, options) < 0;
}

export function isAfter(a: TimeInput, b: TimeInput, options: CompareOptions = {}): boolean {
  return compareByUnit(a, b, options) > 0;
}

export function isSame(a: TimeInput, b: TimeInput, options: IsSameOptions = {}): boolean {
  return compareByUnit(a, b, options) === 0;
}

export function startOf(input: TimeInput, unit: BoundaryUnit, options: BoundaryOptions = {}): Temporal.ZonedDateTime {
  const parsed = parseInput(input);
  const tz = inferTimeZone(parsed, options);

  return startOfParsed(parsed, unit, { tz, weekStartsOn: options.weekStartsOn, when: options.when });
}

export function endOf(input: TimeInput, unit: BoundaryUnit, options: BoundaryOptions = {}): Temporal.ZonedDateTime {
  return addBoundaryUnit(startOf(input, unit, options), unit).subtract({ nanoseconds: 1 });
}

export function format(input: TimeInput, options: FormatOptions = {}): string {
  const parsed = parseInput(input);
  const displayTz = resolveDisplayTimeZone(parsed, options.tz);
  const instant = toInstantFromParsed(parsed, { tz: displayTz });

  return makeFormatter(options, displayTz).format(new Date(instant.epochMilliseconds));
}

export function formatRange(start: TimeInput, end: TimeInput, options: FormatOptions = {}): string {
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

export function formatRelative(input: RelativeTimeInput, options: RelativeFormatOptions = {}): string {
  const target = toInstant(input);
  const base = options.base ? toInstant(options.base) : Temporal.Now.instant();
  const differenceInSeconds = (target.epochMilliseconds - base.epochMilliseconds) / 1000;
  const { unit, value } = toRelativeUnit(differenceInSeconds);

  return getRelativeFormatter(options).format(value, unit);
}

export function parseDuration(input: string | Temporal.DurationLike): Temporal.Duration {
  try {
    return Temporal.Duration.from(input);
  } catch {
    fail('Invalid duration input. Expected ISO duration string or Temporal.DurationLike.');
  }
}

export function formatDuration(input: string | Temporal.DurationLike, options: DurationFormatOptions = {}): string {
  const duration = parseDuration(input);
  const cacheKey = `${String(options.locale ?? '')}|${options.style ?? ''}`;
  const cached = getCached(DURATION_FORMATTER_CACHE, cacheKey);

  if (cached) {
    return cached.format(duration);
  }

  const IntlWithDurationFormat = Intl as typeof Intl & { DurationFormat?: DurationFormatterConstructor };

  if (!IntlWithDurationFormat.DurationFormat) {
    return duration.toString();
  }

  const formatter = new IntlWithDurationFormat.DurationFormat(options.locale, { style: options.style });

  setCached(DURATION_FORMATTER_CACHE, cacheKey, formatter);

  return formatter.format(duration);
}

// ─── Expiry / date range / time diff ─────────────────────────────────────────

const YEAR_9999_INSTANT = Temporal.Instant.from('9999-01-01T00:00:00Z');
const MS_PER_DAY = 86_400_000;

/** Expiry classification for a future date. */
export type ExpiryStatus = 'EXPIRED' | 'LATER' | 'NEVER' | 'SOON';

/**
 * Classifies a date as `'EXPIRED'`, `'SOON'`, `'LATER'`, or `'NEVER'` relative to now.
 *
 * - `'NEVER'` – date is on or after year 9999.
 * - `'EXPIRED'` – date is in the past.
 * - `'SOON'` – date is within the next `days` days (default 7).
 * - `'LATER'` – date is further in the future.
 *
 * For `PlainDate` and `PlainDateTime` inputs without an explicit timezone the
 * UTC calendar is used. Pass `options.tz` to override.
 *
 * @example
 * ```ts
 * expires(Temporal.Now.instant()); // 'EXPIRED'
 * expires(Temporal.Instant.from('9999-12-31T00:00:00Z')); // 'NEVER'
 * expires(toZoned(parseLocal('2030-01-01'), { tz: 'UTC' })); // 'LATER'
 * ```
 */
export function expires(date: TimeInput, days = 7, options: TimeOptions = {}): ExpiryStatus {
  const instantMs = parsedToMs(parseInput(date), options);

  if (instantMs >= YEAR_9999_INSTANT.epochMilliseconds) return 'NEVER';

  const diff = instantMs - Temporal.Now.instant().epochMilliseconds;

  if (diff <= 0) return 'EXPIRED';

  if (diff <= days * MS_PER_DAY) return 'SOON';

  return 'LATER';
}

/** Unit used in a `TimeDiffResult`. */
export type TimeDiffUnit = 'day' | 'hour' | 'millisecond' | 'minute' | 'month' | 'second' | 'week' | 'year';

/** Structured output of {@link timeDiff}. */
export type TimeDiffResult = { unit: TimeDiffUnit; value: number };

const TIME_DIFF_THRESHOLDS: ReadonlyArray<{ ms: number; unit: TimeDiffUnit }> = [
  { ms: 365 * MS_PER_DAY, unit: 'year' },
  { ms: 30 * MS_PER_DAY, unit: 'month' },
  { ms: 7 * MS_PER_DAY, unit: 'week' },
  { ms: MS_PER_DAY, unit: 'day' },
  { ms: 3_600_000, unit: 'hour' },
  { ms: 60_000, unit: 'minute' },
  { ms: 1_000, unit: 'second' },
];

function parsedToMs(parsed: ParsedTimeInput, options: TimeOptions): number {
  if (parsed.kind === 'instant') return parsed.value.epochMilliseconds;

  if (parsed.kind === 'zoned') return parsed.value.toInstant().epochMilliseconds;

  const tz = options.tz ?? 'UTC';

  return parsed.value.toZonedDateTime(tz).toInstant().epochMilliseconds;
}

/**
 * Returns the absolute time difference between two dates as a structured
 * `{ unit, value }` in the largest meaningful unit.
 *
 * When `b` is omitted, the current instant is used.
 * For `PlainDate` / `PlainDateTime` inputs without a timezone, UTC is assumed.
 * Pass `options.tz` to override.
 *
 * **Note:** Month and year thresholds use fixed approximations (30 days/month,
 * 365 days/year). Results are suitable for human-readable display, not precise
 * calendar arithmetic.
 *
 * Sub-second differences are returned as `{ unit: 'millisecond', value: <ms> }`.
 *
 * @example
 * ```ts
 * timeDiff(Temporal.Instant.from('2027-01-01T00:00:00Z'), Temporal.Now.instant());
 * // { unit: 'month', value: 7 }
 * ```
 */
export function timeDiff(a: TimeInput, b?: TimeInput, options: TimeOptions = {}): TimeDiffResult {
  const msA = parsedToMs(parseInput(a), options);
  const msB = b ? parsedToMs(parseInput(b), options) : Temporal.Now.instant().epochMilliseconds;
  const diff = Math.abs(msA - msB);

  for (const { ms, unit } of TIME_DIFF_THRESHOLDS) {
    if (diff >= ms) return { unit, value: Math.floor(diff / ms) };
  }

  return { unit: 'millisecond', value: diff };
}

/**
 * Generates an array of `ZonedDateTime` values between `start` and `end`
 * (inclusive) advancing by `step` on each iteration.
 *
 * @example
 * ```ts
 * dateRange(
 *   Temporal.ZonedDateTime.from('2022-01-01T00:00:00[UTC]'),
 *   Temporal.ZonedDateTime.from('2022-01-05T00:00:00[UTC]'),
 *   { days: 1 },
 *   { tz: 'UTC' },
 * );
 * // [Jan 1, Jan 2, Jan 3, Jan 4, Jan 5]
 * ```
 *
 * @param start  - Range start (inclusive).
 * @param end    - Range end (inclusive).
 * @param step   - Duration to advance on each iteration.
 * @param options - Must include `tz` when inputs are not `ZonedDateTime`.
 */
export function dateRange(
  start: TimeInput,
  end: TimeInput,
  step: Temporal.DurationLike,
  options: TimeOptionsWithTz,
): Temporal.ZonedDateTime[] {
  const startZoned = toZonedFromParsed(parseInput(start), options);
  const endZoned = toZonedFromParsed(parseInput(end), options);

  // Guard: step must advance the date forward to prevent infinite loops.
  if (Temporal.ZonedDateTime.compare(startZoned.add(step), startZoned) <= 0) {
    throw new RangeError('dateRange: step must advance the date forward');
  }

  const result: Temporal.ZonedDateTime[] = [];
  let current = startZoned;

  while (Temporal.ZonedDateTime.compare(current, endZoned) <= 0) {
    result.push(current);
    current = current.add(step);
  }

  return result;
}
