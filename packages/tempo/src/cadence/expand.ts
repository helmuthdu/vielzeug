import { Temporal } from '@js-temporal/polyfill';

import { CadenceError, fail } from '../errors';
import type { CadenceByDay, CadenceSpec, CadenceWeekday } from './types';

/** Runaway guard: periods examined without yielding before the expansion is treated as exhausted. */
const EMPTY_PERIOD_GUARD = 5_000;

const SUB_DAILY_UNIT: Partial<Record<CadenceSpec['freq'], 'hours' | 'minutes' | 'seconds'>> = {
  hourly: 'hours',
  minutely: 'minutes',
  secondly: 'seconds',
};

type WallTime = { hour: number; minute: number; second: number };

function weekdayOf(date: Temporal.PlainDate): CadenceWeekday {
  // Polyfill dayOfWeek: 1 = Mon … 7 = Sun; fold to JavaScript's 0 = Sunday.
  return (date.dayOfWeek % 7) as CadenceWeekday;
}

function weekStart(date: Temporal.PlainDate, wkst: CadenceWeekday): Temporal.PlainDate {
  const delta = (date.dayOfWeek - (wkst === 0 ? 7 : wkst) + 7) % 7;
  return date.subtract({ days: delta });
}

function byIso(a: Temporal.PlainDate, b: Temporal.PlainDate): number {
  return a.toString() < b.toString() ? -1 : a.toString() > b.toString() ? 1 : 0;
}

function timesFor(spec: CadenceSpec, dt: Temporal.PlainDateTime): WallTime[] {
  if (spec.byhour === undefined && spec.byminute === undefined && spec.bysecond === undefined) {
    return [{ hour: dt.hour, minute: dt.minute, second: dt.second }];
  }
  const hours = [...(spec.byhour ?? [dt.hour])];
  const minutes = [...(spec.byminute ?? [dt.minute])];
  const seconds = [...(spec.bysecond ?? [dt.second])];
  const out: WallTime[] = [];
  for (const hour of hours) {
    for (const minute of minutes) {
      for (const second of seconds) out.push({ hour, minute, second });
    }
  }
  return out.sort((a, b) => a.hour - b.hour || a.minute - b.minute || a.second - b.second);
}

/** Day-of-month resolution with RFC 5545 skip semantics for out-of-range values. */
function resolveMonthDays(month: Temporal.PlainDate, bymonthday: readonly number[]): Temporal.PlainDate[] {
  const length = month.daysInMonth;
  const days: Temporal.PlainDate[] = [];
  for (const value of bymonthday) {
    const day = value > 0 ? value : length + 1 + value;
    if (day >= 1 && day <= length) days.push(month.with({ day }));
  }
  return days.sort((a, b) => a.day - b.day);
}

function nthWeekdayInMonth(
  month: Temporal.PlainDate,
  weekday: CadenceWeekday,
  n: number,
): Temporal.PlainDate | undefined {
  const matches: Temporal.PlainDate[] = [];
  for (let day = 1; day <= month.daysInMonth; day += 1) {
    const candidate = month.with({ day });
    if (weekdayOf(candidate) === weekday) matches.push(candidate);
  }
  const index = n > 0 ? n - 1 : matches.length + n;
  return index >= 0 && index < matches.length ? matches[index] : undefined;
}

/** All candidate days inside `month` for the spec's day-level BY parts (no BYSETPOS). */
function monthSet(month: Temporal.PlainDate, spec: CadenceSpec, dt: Temporal.PlainDateTime): Temporal.PlainDate[] {
  if (spec.bymonthday !== undefined) return resolveMonthDays(month, spec.bymonthday);
  if (spec.byday !== undefined) {
    const days: Temporal.PlainDate[] = [];
    for (const entry of spec.byday) {
      if (entry.n === undefined) {
        for (let day = 1; day <= month.daysInMonth; day += 1) {
          const candidate = month.with({ day });
          if (weekdayOf(candidate) === entry.weekday) days.push(candidate);
        }
      } else {
        const nth = nthWeekdayInMonth(month, entry.weekday, entry.n);
        if (nth !== undefined) days.push(nth);
      }
    }
    return [...new Set(days.map((d) => d.toString()))].map((iso) => Temporal.PlainDate.from(iso)).sort(byIso);
  }
  // RFC special case: an unlisted day-of-month clamps to the month end.
  return [month.with({ day: Math.min(dt.day, month.daysInMonth) })];
}

function applySetPos(days: Temporal.PlainDate[], bysetpos: readonly number[]): Temporal.PlainDate[] {
  const selected: Temporal.PlainDate[] = [];
  for (const pos of bysetpos) {
    const index = pos > 0 ? pos - 1 : days.length + pos;
    if (index >= 0 && index < days.length) selected.push(days[index]);
  }
  return selected.sort(byIso);
}

/** Monthly period day set, BYSETPOS applied against the ordered month set. */
function monthDays(month: Temporal.PlainDate, spec: CadenceSpec, dt: Temporal.PlainDateTime): Temporal.PlainDate[] {
  const days = monthSet(month, spec, dt);
  return spec.bysetpos === undefined ? days : applySetPos(days, spec.bysetpos);
}

function yearDates(yearStart: Temporal.PlainDate, spec: CadenceSpec, dt: Temporal.PlainDateTime): Temporal.PlainDate[] {
  const yearLength = yearStart.daysInYear;
  let days: Temporal.PlainDate[];
  if (spec.byyearday !== undefined) {
    days = [];
    for (const value of spec.byyearday) {
      const ordinal = value > 0 ? value : yearLength + 1 + value;
      if (ordinal >= 1 && ordinal <= yearLength) days.push(yearStart.add({ days: ordinal - 1 }));
    }
  } else {
    const months =
      spec.bymonth ??
      (spec.byday !== undefined || spec.bymonthday !== undefined
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        : [dt.month]);
    days = [];
    for (const monthNumber of months) {
      const month = yearStart.with({ day: 1, month: monthNumber });
      for (const day of monthSet(month, spec, dt)) days.push(day);
    }
  }
  days = [...new Set(days.map((d) => d.toString()))].map((iso) => Temporal.PlainDate.from(iso)).sort(byIso);
  return spec.bysetpos === undefined ? days : applySetPos(days, spec.bysetpos);
}

function dateMatches(date: Temporal.PlainDate, spec: CadenceSpec): boolean {
  if (spec.bymonth !== undefined && !spec.bymonth.includes(date.month)) return false;
  if (spec.bymonthday !== undefined) {
    const length = date.daysInMonth;
    const resolved = spec.bymonthday.map((v) => (v > 0 ? v : length + 1 + v));
    if (!resolved.includes(date.day)) return false;
  }
  if (spec.byday !== undefined && !spec.byday.some((entry) => entry.weekday === weekdayOf(date))) return false;
  return true;
}

/**
 * Options shared by {@link expandCadence} and {@link resolveCadenceDates}. Anything
 * given here overrides the corresponding `COUNT`/`UNTIL` inside the spec.
 */
export type CadenceExpandOptions = {
  /** Maximum occurrences produced regardless of `count`/`until` (default `10_000`). */
  limit?: number;
  /** Override the spec's occurrence cap. */
  count?: number;
  /** Override the spec's inclusive end instant. */
  until?: Temporal.Instant | Temporal.ZonedDateTime;
};

function untilInstant(options: CadenceExpandOptions, spec: CadenceSpec): Temporal.Instant | undefined {
  const value = options.until ?? spec.until;
  if (value === undefined) return undefined;
  return value instanceof Temporal.ZonedDateTime ? value.toInstant() : value;
}

function toWallZoned(pdt: Temporal.PlainDateTime, timeZone: string): Temporal.ZonedDateTime | undefined {
  const zdt = pdt.toZonedDateTime(timeZone);
  // Wall times that do not exist (DST spring-forward) shift under "compatible"; the RFC skips them.
  return pdt.equals(zdt.toPlainDateTime()) ? zdt : undefined;
}

/**
 * Expand a validated {@link CadenceSpec} lazily from an inclusive start, yielding
 * `ZonedDateTime` values in ascending instant order. The start itself is always the
 * first occurrence (RFC 5545 DTSTART semantics), even when it does not match the
 * pattern; later occurrences are wall-time based, so "09:00 every day" stays 09:00
 * across DST — and wall times the shift makes nonexistent are skipped.
 *
 * Expansion stops at `COUNT`/`UNTIL` (option overrides win) or after `limit`
 * occurrences (default 10 000). Rules that can never match are treated as
 * exhausted instead of hanging.
 */
export function* expandCadence(
  start: Temporal.ZonedDateTime,
  spec: CadenceSpec,
  options: CadenceExpandOptions = {},
): Generator<Temporal.ZonedDateTime, void, undefined> {
  const count = options.count ?? spec.count ?? Number.POSITIVE_INFINITY;
  const until = untilInstant(options, spec);
  const limit = options.limit ?? 10_000;
  const seen = new Set<string>();
  const dt = start.toPlainDateTime();
  const tz = start.timeZoneId;
  const startInstant = start.toInstant();
  let yielded = 0;

  const produce = (pdt: Temporal.PlainDateTime): Temporal.ZonedDateTime | 'stop' | undefined => {
    if (pdt.equals(dt)) return undefined; // start already yielded
    const zdt = toWallZoned(pdt, tz);
    if (zdt === undefined) return undefined;
    const instant = zdt.toInstant();
    if (Temporal.Instant.compare(instant, startInstant) < 0) return undefined;
    if (until !== undefined && Temporal.Instant.compare(instant, until) > 0) return 'stop';
    const key = instant.toString();
    if (seen.has(key)) return undefined;
    seen.add(key);
    return zdt;
  };

  yield start;
  seen.add(startInstant.toString());
  yielded += 1;
  if (yielded >= count || yielded >= limit) return;

  const unit = SUB_DAILY_UNIT[spec.freq];
  const interval = spec.interval ?? 1;

  if (unit !== undefined) {
    // Fine-grained: period ticks (hours/minutes/seconds); finer BY* sets expand
    // multiple candidates inside each tick, coarser BY* parts filter it.
    const emptyGuard = unit === 'seconds' ? 90_000 : EMPTY_PERIOD_GUARD;
    let cursor = dt;
    let empty = 0;
    while (true) {
      const dayOk = dateMatches(cursor.toPlainDate(), spec);
      // At the tick's own frequency and coarser, BY* parts filter; finer BY* parts expand below.
      const hourOk = spec.byhour === undefined || spec.byhour.includes(cursor.hour);
      const minuteOk = spec.freq === 'hourly' || spec.byminute === undefined || spec.byminute.includes(cursor.minute);
      const secondOk = spec.freq !== 'secondly' || spec.bysecond === undefined || spec.bysecond.includes(cursor.second);
      if (dayOk && hourOk && minuteOk && secondOk) {
        const minutes = spec.freq === 'hourly' ? (spec.byminute ?? [cursor.minute]) : [cursor.minute];
        const seconds = spec.freq === 'secondly' ? [cursor.second] : (spec.bysecond ?? [cursor.second]);
        const candidates: Temporal.PlainDateTime[] = [];
        for (const minute of minutes) {
          for (const second of seconds) candidates.push(cursor.with({ minute, second }));
        }
        candidates.sort((a, b) => Temporal.PlainDateTime.compare(a, b));
        let producedInPeriod = false;
        for (const candidate of candidates) {
          const out = produce(candidate);
          if (out === 'stop') return;
          if (out === undefined) continue;
          producedInPeriod = true;
          yield out;
          if ((yielded += 1) >= count || yielded >= limit) return;
        }
        if (producedInPeriod) empty = 0;
      }
      if (!dayOk) {
        // A date that cannot match at all: skip to the next date instead of ticking through it.
        cursor = cursor
          .toPlainDate()
          .add({ days: 1 })
          .toPlainDateTime({ hour: dt.hour, minute: dt.minute, nanosecond: dt.nanosecond, second: dt.second });
      } else {
        cursor = cursor.add({ [unit]: interval });
      }
      if ((empty += 1) > emptyGuard) return;
    }
  }

  const times = timesFor(spec, dt);
  const isDaily = spec.freq === 'daily';
  assertSupported(spec);
  // Daily rules need per-day filtering; weekly/monthly/yearly enumerate matching days.
  let period = 0;
  let empty = 0;
  const weekAnchor = weekStart(dt.toPlainDate(), spec.wkst ?? 1);
  while (true) {
    let days: Temporal.PlainDate[] = [];
    if (isDaily) {
      const date = dt.toPlainDate().add({ days: period * interval });
      if (dateMatches(date, spec)) days = [date];
    } else if (spec.freq === 'weekly') {
      const base = weekAnchor.add({ weeks: period * interval });
      const wanted: readonly CadenceByDay[] = spec.byday ?? [{ weekday: weekdayOf(dt.toPlainDate()) }];
      for (let offset = 0; offset < 7; offset += 1) {
        const date = base.add({ days: offset });
        if (
          wanted.some((entry) => entry.weekday === weekdayOf(date)) &&
          dateMatches(date, { ...spec, byday: undefined })
        ) {
          days.push(date);
        }
      }
    } else if (spec.freq === 'monthly') {
      const month = dt
        .toPlainDate()
        .with({ day: 1 })
        .add({ months: period * interval });
      days = monthDays(month, spec, dt).filter(
        (date) => spec.bymonth === undefined || spec.bymonth.includes(date.month),
      );
    } else {
      const yearStart = dt
        .toPlainDate()
        .with({ day: 1, month: 1 })
        .add({ years: period * interval });
      days = yearDates(yearStart, spec, dt);
    }
    for (const day of days) {
      for (const time of times) {
        const out = produce(day.toPlainDateTime(time));
        if (out === 'stop') return;
        if (out === undefined) continue;
        empty = 0;
        yield out;
        if ((yielded += 1) >= count || yielded >= limit) return;
      }
    }
    if (days.length === 0 && (empty += 1) > EMPTY_PERIOD_GUARD) return;
    if (days.length > 0) empty = 0;
    period += 1;
  }
}

/** Options for {@link resolveCadenceDates}: extra occurrences and removals. */
export type CadenceDatesOptions = CadenceExpandOptions & {
  /** Extra occurrences merged in (RFC 5545 `RDATE`). */
  rdate?: readonly Temporal.ZonedDateTime[];
  /** Occurrences removed from the result (RFC 5545 `EXDATE`); checked against exact instants. */
  exdate?: readonly Temporal.ZonedDateTime[];
};

/**
 * Merge a cadence expansion with `RDATE`/`EXDATE` style overrides into one
 * ascending, deduplicated generator — the date resolution a calendar UI needs.
 * Exception dates remove occurrences by exact instant before emission.
 */
export function* resolveCadenceDates(
  start: Temporal.ZonedDateTime,
  spec: CadenceSpec,
  options: CadenceDatesOptions = {},
): Generator<Temporal.ZonedDateTime, void, undefined> {
  const exceptions = new Set((options.exdate ?? []).map((zdt) => zdt.toInstant().toString()));
  const extras = [...(options.rdate ?? [])].sort((a, b) => Temporal.Instant.compare(a.toInstant(), b.toInstant()));
  const emitted = new Set<string>();
  const limit = options.limit ?? 10_000;
  let emittedCount = 0;
  const cadence = expandCadence(start, spec, options);
  let next = cadence.next();
  for (;;) {
    if (next.done === true) break;
    const instant = next.value.toInstant().toString();
    while (extras.length > 0 && Temporal.Instant.compare(extras[0].toInstant(), instant) <= 0) {
      const extra = extras.shift();
      if (extra === undefined) break;
      const extraInstant = extra.toInstant().toString();
      if (!exceptions.has(extraInstant) && !emitted.has(extraInstant)) {
        emitted.add(extraInstant);
        yield extra;
        if ((emittedCount += 1) >= limit) return;
      }
    }
    if (!exceptions.has(instant) && !emitted.has(instant)) {
      emitted.add(instant);
      yield next.value;
      if ((emittedCount += 1) >= limit) return;
    }
    next = cadence.next();
  }
  for (const extra of extras) {
    const extraInstant = extra.toInstant().toString();
    if (exceptions.has(extraInstant) || emitted.has(extraInstant)) continue;
    emitted.add(extraInstant);
    yield extra;
    if ((emittedCount += 1) >= limit) return;
  }
}

/** Reject rule/usage combinations the expansion does not model, instead of approximating them. */
export function assertSupported(spec: CadenceSpec): void {
  if (
    spec.byday?.some((entry) => entry.n !== undefined) &&
    ['daily', 'hourly', 'minutely', 'secondly', 'weekly'].includes(spec.freq)
  ) {
    fail(`BYDAY ordinals are not supported for ${spec.freq} rules`, CadenceError);
  }
}
