---
title: Tempo — Temporal date and time utilities
description: Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.
package: tempo
category: time
keywords: [temporal, date-time, timezone, formatting, arithmetic, dst, intl, calendar]
related: [arsenal]
exports:
  [
    now,
    nowInstant,
    parse,
    parsePlainDate,
    parsePlainDateTime,
    parseInstant,
    parseZoned,
    isValid,
    toInstant,
    inTz,
    shift,
    difference,
    within,
    clamp,
    isBefore,
    isAfter,
    isSame,
    startOf,
    endOf,
    format,
    formatParts,
    formatRange,
    formatRangeParts,
    formatInstant,
    formatZoned,
    formatRelative,
    parseDuration,
    formatDuration,
    expires,
    timeDiff,
    humanize,
    dateRange,
    recurrence,
    TempoError,
    TempoInvalidInputError,
    TempoInvalidTzError,
    TempoMissingTzError,
    TempoUnsupportedInputError,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="tempo" />

## Why Tempo?

Manual date handling breaks at daylight-saving boundaries, timezone edges, and DST transitions.

```ts
// Before — fragile, loses timezone context
const reminder = new Date(meeting.getTime() - 15 * 60_000);

// After — DST-safe, handles transitions correctly
const reminder = shift(meeting, { minutes: -15 });
```

| Feature        | Tempo                                                                              | date-fns                                   | Day.js                                     | Native Date                            |
| -------------- | ---------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------ | -------------------------------------- |
| Bundle size    | <PackageInfo package="tempo" type="size" />                                        | ~10 kB                                     | ~3 kB                                      | 0 kB                                   |
| DST-safe math  | <ore-icon name="check" size="16"></ore-icon> (Temporal)                              | Manual                                     | Manual                                     | <ore-icon name="x" size="16"></ore-icon> |
| Timezone aware | <ore-icon name="check" size="16"></ore-icon> Full support                            | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | Partial                                |
| Immutable      | <ore-icon name="check" size="16"></ore-icon>                                         | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Format presets | <ore-icon name="check" size="16"></ore-icon> (`'short'`, `'medium'`, `'long'`, etc.) | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon> |
| Type inference | <ore-icon name="check" size="16"></ore-icon> Full TypeScript                         | Partial                                    | Partial                                    | <ore-icon name="x" size="16"></ore-icon> |

<div class="decision-callout">

**Use Tempo when** you need reliable timezone handling, DST-safe arithmetic, and clean Temporal-based APIs without heavy dependencies.

**Consider alternatives when** you need extensive locale data (date-fns).

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/tempo
```

```sh [npm]
npm install @vielzeug/tempo
```

```sh [yarn]
yarn add @vielzeug/tempo
```

:::

## Quick Start

```ts
import { format, formatInstant, inTz, parsePlainDateTime, shift, toInstant } from '@vielzeug/tempo';

// Parse a wall-clock string (no timezone attached)
const localMeeting = parsePlainDateTime('2026-03-21T10:30:00');

// Convert to an absolute instant using the user's timezone
const meetingInstant = toInstant(localMeeting, { tz: 'America/New_York' });

// Project to a zoned view and subtract 15 minutes (DST-safe)
const meetingNY = inTz(meetingInstant, 'America/New_York');
const reminder = shift(meetingNY, { minutes: -15 });

// Format for display
const text = format(reminder, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' });

// Format for APIs/logs (stable UTC instant string)
const stable = formatInstant(reminder);
```

> **No `Temporal.*` imports needed.** Tempo re-exports `Temporal` and provides `parseInstant`, `parseZoned`, `parsePlainDateTime`, `parsePlainDate`, `nowInstant`, and `now` as drop-in replacements for every common Temporal constructor. Use `parse(input, as?)` for flexible input detection.

## Features

<div class="features-grid">

- **Zero Temporal imports** — `parseInstant()`, `parseZoned()`, `parsePlainDateTime()`, `parsePlainDate()`, `nowInstant()`, `now()` replace every common `Temporal.*` constructor; import only from `@vielzeug/tempo`
- **DST-safe arithmetic** — `shift()` handles transitions correctly; always returns `ZonedDateTime` (call `.toInstant()` if needed)
- **Timezone conversion** — `inTz()` to project any input into a timezone, `toInstant()` to normalize to UTC; invalid timezone strings throw `TempoError`
- **Formatting split by intent** — `format()` for UI (with presets and `intl` escape hatch), `formatInstant()` for UTC strings, `formatZoned()` for zoned strings
- **Relative and range formatting** — `formatRelative()` for UX copy, `formatRange()` / `formatRangeParts()` for localized time spans, `formatParts()` for custom rendering
- **Range + comparison helpers** — `within()`, `clamp()`, `isBefore()`, `isAfter()`, `isSame()` with calendar-unit and week-start support
- **Boundary helpers** — `startOf()` and `endOf()` for day/week/month/year-style snapping
- **Duration tools** — `difference()`, `parseDuration()`, `formatDuration()`
- **Expiry classification** — `expires()` for flexible threshold-based TTL bucketing; `timeDiff()` for structured time differences; `humanize()` for human-readable output
- **Recurrence generation** — `recurrence()` for lazily generating repeating dates (daily/weekly/monthly/yearly); `dateRange()` for step-based date sequences; timezone inferred from `ZonedDateTime` inputs
- **Intl integration** — formatting respects locale and calendar systems
- **Polyfilled Temporal** — works in runtimes without native support via `@js-temporal/polyfill`
- <PackageInfo package="tempo" type="size" /> gzipped

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Spell](/spell/) — schema validation with a similar `v` namespace pattern; combine with Tempo's date validators for typed form fields that accept date strings
- [Rune](/rune/) — structured logger; use Tempo to format timestamps consistently in log entries and audit trails

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
