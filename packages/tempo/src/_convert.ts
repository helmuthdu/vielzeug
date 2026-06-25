import { Temporal } from '@js-temporal/polyfill';

import type { DateTimeDisambiguation, TimeInput } from './types';

import { validateTz } from './_tz';
import { TempoMissingTzError, TempoUnsupportedInputError, fail } from './errors';

type WithPrefer = { prefer?: DateTimeDisambiguation };
type TimeOptionsWithTz = { tz: string };

// ─── Direct resolution ────────────────────────────────────────────────────────

/**
 * Converts any {@link TimeInput} to an absolute `Instant`.
 * Requires `options.tz` when input is a `PlainDate` or `PlainDateTime`.
 */
export function toInstant(input: TimeInput, options: WithPrefer & { tz?: string } = {}): Temporal.Instant {
  if (input instanceof Temporal.Instant) return input;

  if (input instanceof Temporal.ZonedDateTime) return input.toInstant();

  if (input instanceof Temporal.PlainDateTime) {
    if (!options.tz)
      fail('This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.', TempoMissingTzError);

    return input
      .toZonedDateTime(validateTz(options.tz), {
        disambiguation: options.prefer as 'compatible' | 'earlier' | 'later' | 'reject' | undefined,
      })
      .toInstant();
  }

  if (input instanceof Temporal.PlainDate) {
    if (!options.tz)
      fail('This operation requires a timezone. Pass options.tz or use a ZonedDateTime input.', TempoMissingTzError);

    return input.toZonedDateTime({ timeZone: validateTz(options.tz) }).toInstant();
  }

  fail(`Unsupported time input type: ${String(input)}`, TempoUnsupportedInputError);
}

/**
 * Projects any {@link TimeInput} into `options.tz` as a `ZonedDateTime`.
 *
 * When `input` is already a `ZonedDateTime`, it is **re-projected** into `options.tz`
 * via `withTimeZone()` — the wall-clock time changes but the absolute instant is preserved.
 *
 * @example
 * ```ts
 * // Re-projection: same instant, different wall-clock
 * toZoned(parseZoned('2026-03-21T11:00:00+01:00[Europe/Berlin]'), { tz: 'UTC' })
 * // 2026-03-21T10:00:00+00:00[UTC]  ← wall-clock changed from 11:00 → 10:00
 * ```
 */
export function toZoned(
  input: TimeInput,
  options: TimeOptionsWithTz | (WithPrefer & { tz: string }),
): Temporal.ZonedDateTime {
  const opts = options as TimeOptionsWithTz & WithPrefer;
  const tz = validateTz(opts.tz);

  if (input instanceof Temporal.ZonedDateTime) return input.withTimeZone(tz);

  if (input instanceof Temporal.PlainDateTime) {
    return input.toZonedDateTime(tz, {
      disambiguation: opts.prefer as 'compatible' | 'earlier' | 'later' | 'reject' | undefined,
    });
  }

  if (input instanceof Temporal.PlainDate) {
    return input.toZonedDateTime({ timeZone: tz });
  }

  if (input instanceof Temporal.Instant) return input.toZonedDateTimeISO(tz);

  fail(`Unsupported time input type: ${String(input)}`, TempoUnsupportedInputError);
}

/**
 * Projects any {@link TimeInput} into a specific timezone as a `ZonedDateTime`.
 * Unlike {@link toZoned}, this is the clean public API: explicit `tz` string parameter
 * rather than an options bag, signalling intent clearly.
 *
 * When `input` is already a `ZonedDateTime`, it is re-projected — same instant, new zone.
 *
 * @example
 * ```ts
 * inTz(parseInstant('2026-03-21T10:00:00Z'), 'Europe/Berlin')
 * // 2026-03-21T11:00:00+01:00[Europe/Berlin]
 * ```
 */
export function inTz(input: TimeInput, tz: string): Temporal.ZonedDateTime {
  return toZoned(input, { tz });
}
