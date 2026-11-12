---
title: 'Cadence: RFC 5545 Recurrence'
description: 'The @vielzeug/tempo/cadence entry: RRULE parsing, lazy DST-correct expansion, and RDATE/EXDATE merging.'
---

[[toc]]

Cadence is tempo's RFC 5545 recurrence engine, shipped as the `@vielzeug/tempo/cadence`
subpath import. It parses `RRULE` values into a validated spec, expands them lazily into
`ZonedDateTime` occurrences, and merges `RDATE`/`EXDATE` overrides — everything a calendar
needs to answer "which dates does this repeating event actually produce?".

## Basic Usage

```ts
import { expandCadence, parseCadence } from '@vielzeug/tempo/cadence';
import { Temporal } from '@js-temporal/polyfill';

const start = Temporal.ZonedDateTime.from('2026-03-15T09:00+01:00[Europe/Vienna]');
const spec = parseCadence('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=5');

for (const occurrence of expandCadence(start, spec)) {
  console.log(occurrence.toPlainDateTime().toString());
}
```

`parseCadence` accepts the raw `RRULE:` prefix or a bare value, sorts and deduplicates every
`BY*` array, and throws `CadenceError` for anything it cannot expand exactly: `BYWEEKNO`,
`COUNT` together with `UNTIL`, an `INTERVAL` below 1, ordinal `BYDAY` values outside
monthly/yearly rules, and similar spec violations. Failing loudly beats expanding a rule
differently than the calendar that wrote it.

Two RFC 5545 semantics that trip up hand-rolled engines, handled for you:

- **DTSTART always counts**: the start is the first occurrence even when it does not match
  the pattern, exactly as the spec defines.
- **Wall-clock expansion**: "09:00 daily" stays 09:00 across DST transitions; wall times the
  spring-forward gap makes nonexistent are skipped, matching calendar clients.

## Parsing and Serializing

```ts
import { parseCadence, toCadence } from '@vielzeug/tempo/cadence';

const spec = parseCadence('FREQ=MONTHLY;BYDAY=-1FR;COUNT=12'); // last Friday monthly
toCadence(spec); // 'FREQ=MONTHLY;COUNT=12;BYDAY=-1FR' — canonical order, round-trips
```

`CadenceSpec` is frozen, structured, and JSON-inspectable (`UNTIL` becomes a
`Temporal.Instant`); store it parsed or serialize it back with `toCadence`, which emits
properties in canonical `RRULE` order so two clients agree on one string.

## Expanding

```ts
import { expandCadence } from '@vielzeug/tempo/cadence';

const daily = parseCadence('FREQ=DAILY;BYHOUR=9,17');
const window = [...expandCadence(start, daily, { until, limit: 500 })];
```

`expandCadence` is a generator: infinite rules cost nothing until consumed. `count`, `until`,
and `limit` (default 10 000) cap output — `options.count`/`options.until` override the spec,
which is how a UI renders "next 12 occurrences" of a rule whose own `COUNT` is absent. Rules
that can never match (a `BYMONTHDAY=31` weekly rule, say) report exhausted instead of
spinning. Occurrences are deduplicated by instant and ascend monotonically.

Supported by design: every `FREQ` down to `SECONDLY`; `INTERVAL`; `COUNT`/`UNTIL`;
`BYMONTH`, `BYMONTHDAY` (negative counts from month end; nonexistent days like Feb 31 clamp
away), `BYDAY` with `n` ordinals for monthly/yearly rules, `BYSETPOS` for monthly/yearly,
`BYYEARDAY` for yearly, `BYHOUR`/`BYMINUTE`/`BYSECOND` multipliers, and `WKST`.

## Merging RDATE and EXDATE

Calendar events are a rule plus exceptions: a meeting that moved once (`RDATE`) and skipped
one week (`EXDATE`). `resolveCadenceDates` merges all three into one ascending stream:

```ts
import { parseCadence, resolveCadenceDates } from '@vielzeug/tempo/cadence';

const dates = resolveCadenceDates(start, parseCadence('FREQ=WEEKLY;BYDAY=TU;COUNT=10'), {
  rdate: [movedSession],
  exdate: [cancelledWeek],
});
```

Exceptions remove occurrences by exact instant, and `RDATE` values land at their own position
in the ordering — matching what RFC 5545 clients display.

## Errors

Every cadence failure is a `CadenceError` (a `TempoError` subclass), also exported from the
root `@vielzeug/tempo` entry so one `instanceof TempoError` guard covers both entries.

## Best Practices

- Parse once, expand many: `parseCadence` is the validation point; keep the `CadenceSpec` and stream occurrences lazily per view window.
- Pass `until`/`count` as expand options from the UI ("next 30 dates") instead of rewriting stored rules.
- Persist rules as RRULE strings and re-validate with `parseCadence` at read time; unsupported features fail at import, not at render.
- Treat DST-skipped occurrences as expected: render the expanded list, never recompute from the rule at display time.
