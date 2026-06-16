// Re-export Temporal namespace so consumers never need to import @js-temporal/polyfill directly.
export { Temporal } from '@js-temporal/polyfill';

// ─── Core ─────────────────────────────────────────────────────────────────────
export {
  difference,
  isValid,
  now,
  nowInstant,
  parse,
  parseInstant,
  parsePlainDate,
  parsePlainDateTime,
  parseZoned,
  shift,
} from './core';

// ─── Conversion utilities ─────────────────────────────────────────────────────
export { inTz, toInstant } from './_convert';

// ─── Boundary ─────────────────────────────────────────────────────────────────
export { endOf, startOf } from './boundary';

// ─── Compare ──────────────────────────────────────────────────────────────────
export { clamp, isAfter, isBefore, isSame, within } from './compare';

// ─── Format ───────────────────────────────────────────────────────────────────
export {
  format,
  formatDuration,
  formatInstant,
  formatParts,
  formatRange,
  formatRangeParts,
  formatRelative,
  formatZoned,
  humanize,
  parseDuration,
} from './format';

// ─── Classify ─────────────────────────────────────────────────────────────────
export { expires, timeDiff } from './classify';

// ─── Range ────────────────────────────────────────────────────────────────────
export { dateRange, recurrence } from './range';

// ─── Public types ─────────────────────────────────────────────────────────────
export type {
  BoundaryOptions,
  BoundaryUnit,
  CalendarUnit,
  CompareOptions,
  DateTimeDisambiguation,
  DifferenceOptions,
  DisambiguationOptions,
  DurationFormatOptions,
  FormatOptions,
  FormatPattern,
  ParseAs,
  RecurrenceRule,
  RelativeFormatOptions,
  RelativeTimeInput,
  ShiftOptions,
  TempoUnit,
  TimeDiffResult,
  TimeDiffUnit,
  TimeInput,
  TimeOptions,
  WeekStartDay,
} from './types';
