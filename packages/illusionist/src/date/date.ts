import { shift, Temporal } from '@vielzeug/tempo';

import { int } from '../_helpers/int';
import type { IllusionistContext } from '../types';

type DateOptions = {
  years?: number;
  ref?: Temporal.ZonedDateTime;
};

function resolveRef(ref?: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
  return ref ?? Temporal.Now.zonedDateTimeISO('UTC');
}

/**
 * Generates a past date within the given number of years from `ref` (default: now).
 */
export function past(ctx: IllusionistContext, options?: DateOptions): Temporal.ZonedDateTime {
  const ref = resolveRef(options?.ref);
  const years = options?.years ?? 1;
  const maxSeconds = years * 365 * 24 * 60 * 60;
  const minSeconds = 1;

  return shift(ref, { seconds: -int(minSeconds, maxSeconds, ctx.source) });
}

/**
 * Generates a future date within the given number of years from `ref` (default: now).
 */
export function future(ctx: IllusionistContext, options?: DateOptions): Temporal.ZonedDateTime {
  const ref = resolveRef(options?.ref);
  const years = options?.years ?? 1;
  const maxSeconds = years * 365 * 24 * 60 * 60;

  return shift(ref, { seconds: int(1, maxSeconds, ctx.source) });
}

/**
 * Generates a recent date within the given number of days from `ref` (default: now).
 */
export function recent(
  ctx: IllusionistContext,
  options?: { days?: number; ref?: Temporal.ZonedDateTime },
): Temporal.ZonedDateTime {
  const ref = resolveRef(options?.ref);
  const days = options?.days ?? 1;
  const maxSeconds = days * 24 * 60 * 60;

  return shift(ref, { seconds: -int(1, maxSeconds, ctx.source) });
}

/**
 * Generates a date between `from` and `to`.
 */
export function between(
  ctx: IllusionistContext,
  from: Temporal.ZonedDateTime,
  to: Temporal.ZonedDateTime,
): Temporal.ZonedDateTime {
  const fromNs = from.toInstant().epochNanoseconds;
  const toNs = to.toInstant().epochNanoseconds;

  if (fromNs > toNs) {
    return from;
  }

  const spanNs = toNs - fromNs;
  const spanSeconds = Number(spanNs / 1_000_000_000n);
  const offsetSeconds = Math.floor(ctx.source.next() * spanSeconds);

  return from.add({ seconds: offsetSeconds });
}

/**
 * Generates a random birthday — a date with a random year (default 18-80 years ago) and random month/day.
 */
export function birthday(
  ctx: IllusionistContext,
  options?: { minAge?: number; maxAge?: number; ref?: Temporal.ZonedDateTime },
): Temporal.PlainDate {
  const ref = resolveRef(options?.ref);
  const minAge = options?.minAge ?? 18;
  const maxAge = options?.maxAge ?? 80;
  const age = int(minAge, maxAge, ctx.source);
  const month = int(1, 12, ctx.source);
  const day = int(1, 28, ctx.source);

  return ref.toPlainDate().subtract({ years: age }).with({ day, month });
}

/**
 * Returns a random weekday name.
 */
export function weekday(ctx: IllusionistContext, locale?: string): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const loc = locale ?? ctx.locale.code;
  const localized =
    loc === 'de' ? ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] : days;

  return localized[int(0, 6, ctx.source)]!;
}

/**
 * Returns a random month name.
 */
export function month(ctx: IllusionistContext, locale?: string): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const loc = locale ?? ctx.locale.code;
  const localized =
    loc === 'de'
      ? [
          'Januar',
          'Februar',
          'März',
          'April',
          'Mai',
          'Juni',
          'Juli',
          'August',
          'September',
          'Oktober',
          'November',
          'Dezember',
        ]
      : months;

  return localized[int(0, 11, ctx.source)]!;
}
