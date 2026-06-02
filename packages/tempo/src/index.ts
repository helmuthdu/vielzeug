// Re-export Temporal namespace so consumers never need to import @js-temporal/polyfill directly.
export { Temporal } from '@js-temporal/polyfill';

// ─── Core ─────────────────────────────────────────────────────────────────────
export {
  difference,
  isValid,
  now,
  nowInstant,
  parseDate,
  parseInstant,
  parsePlainDate,
  parsePlainDateTime,
  parseZoned,
  shift,
} from './core';

// ─── Internal utilities (public API) ─────────────────────────────────────────
export { toInstant, toZoned } from './internal';

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
  parseDuration,
} from './format';

// ─── Classify ─────────────────────────────────────────────────────────────────
export { classify, expires, humanize, timeDiff } from './classify';

// ─── Range ────────────────────────────────────────────────────────────────────
export { dateRange, recurrence } from './range';

// ─── Public types ─────────────────────────────────────────────────────────────
export type {
  BoundaryOptions,
  BoundaryUnit,
  CompareOptions,
  DateTimeDisambiguation,
  DifferenceOptions,
  DurationFormatOptions,
  FormatOptions,
  FormatPattern,
  RecurrenceRule,
  RelativeFormatOptions,
  RelativeTimeInput,
  TimeDiffResult,
  TimeDiffUnit,
  TimeInput,
  TimeOptions,
  TimeOptionsWithTz,
  WeekStartDay,
} from './types';
