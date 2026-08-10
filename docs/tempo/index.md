---
title: Tempo — Temporal date and time utilities
description: Explicit Temporal parsing, timezone-safe arithmetic, and localized date/time formatting for TypeScript.
package: tempo
category: time
keywords: [temporal, date-time, timezone, formatting, arithmetic, dst, intl]
related: [rune, vault]
exports: [Temporal, parse, now, nowInstant, isValid, toInstant, inTimeZone, shift, difference, contains, clamp, isBefore, isAfter, isSame, startOf, endOf, format, formatParts, formatRange, formatRangeParts, formatInstant, formatZoned, formatRelative, parseDuration, formatDuration, classifyExpiry, timeDiff, humanize, dateRange, recurrence, TempoError, TempoInvalidInputError, TempoInvalidTzError, TempoMissingTzError, TempoUnsupportedInputError]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="tempo" />

## Why Tempo?

Date/time bugs come from treating an instant and a wall-clock value as interchangeable. Tempo requires an explicit parse target and requires `timeZone` whenever a wall-clock value becomes an instant.

```ts
// Before
const reminder = new Date(meeting.getTime() - 15 * 60_000);

// After
import { parse, shift, toInstant } from '@vielzeug/tempo';

const localMeeting = parse('2026-03-21T10:30:00', { as: 'plainDateTime' });
const meeting = toInstant(localMeeting, { timeZone: 'America/New_York' });
const reminder = shift(meeting, { minutes: -15 }, { timeZone: 'America/New_York' });
```

| Feature | Tempo | date-fns | Native Date |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="tempo" type="size" /> | ~10 kB | 0 kB |
| Zero dependencies | <ore-icon name="x" size="16"></ore-icon> `@js-temporal/polyfill` | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Explicit wall-time conversion | <ore-icon name="check" size="16"></ore-icon> | Manual | <ore-icon name="x" size="16"></ore-icon> |
| DST-safe arithmetic | <ore-icon name="check" size="16"></ore-icon> | Manual | Manual |
| Localized formatting | <ore-icon name="check" size="16"></ore-icon> `Intl` | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

<div class="decision-callout">

**Use Tempo when** you need Temporal values, explicit timezone rules, and DST-safe operations.

**Consider native `Date` when** your data is only elapsed milliseconds and you do not need calendar or timezone behavior.

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

Parse a wall-clock input explicitly, attach its timezone, then format it for a user.

```ts
import { format, inTimeZone, parse, shift, toInstant } from '@vielzeug/tempo';

const localMeeting = parse('2026-03-21T10:30:00', { as: 'plainDateTime' });
const meeting = toInstant(localMeeting, { timeZone: 'America/New_York' });
const reminder = shift(meeting, { minutes: -15 }, { timeZone: 'America/New_York' });
const text = format(inTimeZone(reminder, 'America/New_York'), {
  locale: 'en-US',
  pattern: 'short',
});
```

## Features

<div class="features-grid">

- `parse()` — Requires an explicit ISO target: instant, zoned date-time, plain date-time, or plain date.
- `toInstant()` / `inTimeZone()` — Convert wall-clock and absolute values with explicit timezone semantics.
- `shift()` / `difference()` — Perform DST-safe arithmetic and duration calculation.
- `contains()` / `clamp()` — Use named range fields instead of ambiguous positional inputs.
- `classifyExpiry()` — Classify fixed elapsed-time thresholds in milliseconds or larger units without month or year approximation.
- `format()` / `formatRelative()` / `formatDuration()` — Render UI, relative, and duration values through `Intl`.
- `dateRange()` / `recurrence()` — Lazily generate zoned calendar sequences.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Rune](/rune/) — format stable Temporal timestamps before writing structured log records.
- [Vault](/vault/) — derive explicit expiry moments before storing records with TTL policies.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
