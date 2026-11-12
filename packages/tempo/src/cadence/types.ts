import type { Temporal } from '@js-temporal/polyfill';

/** How often the cadence period repeats. RFC 5545 `FREQ` values. */
export type CadenceFrequency = 'daily' | 'hourly' | 'minutely' | 'monthly' | 'secondly' | 'weekly' | 'yearly';

/** Weekday index matching JavaScript: `0` = Sunday … `6` = Saturday. */
export type CadenceWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * A `BYDAY` entry: optionally the `n`-th matching weekday within the period
 * (`1` = first, `-1` = last), otherwise every matching weekday in the period.
 */
export type CadenceByDay = {
  readonly n?: number;
  readonly weekday: CadenceWeekday;
};

/**
 * A validated recurrence rule — the parsed, structured form of an RFC 5545
 * `RRULE` value. Produced by {@link parseCadence}; accepted by
 * {@link expandCadence} and {@link toCadence}. All arrays are sorted ascending
 * and deduplicated by the parser.
 */
export type CadenceSpec = {
  /** Positions (1-based, negative from the end) within each yearly day set. */
  readonly byday?: readonly CadenceByDay[];
  /** Hour-of-day overrides; any `BY*` time field expands multiple times per day. */
  readonly byhour?: readonly number[];
  /** Day-of-month values; negative counts back from the month end (`-1` = last day). */
  readonly bymonthday?: readonly number[];
  /** Restrict expansion to these months (1–12). */
  readonly bymonth?: readonly number[];
  /** Positions (1-based, negative from the end) within each yearly expansion's day set; yearly rules only. */
  readonly bysetpos?: readonly number[];
  /** Day-of-year values; negative counts back from the year end. Yearly rules only. */
  readonly byyearday?: readonly number[];
  readonly byminute?: readonly number[];
  readonly bysecond?: readonly number[];
  /** Stop after this many occurrences (the first being the expansion start). */
  readonly count?: number;
  /** The repeat period; pairs with `interval`. */
  readonly freq: CadenceFrequency;
  /** Multiplier on `freq`; defaults to `1`. */
  readonly interval?: number;
  /** Stop at this instant (inclusive). Parsed to an instant, timezone-independent. */
  readonly until?: Temporal.Instant;
  /** Week start day for weekly rules; defaults to Monday. */
  readonly wkst?: CadenceWeekday;
};
