---
title: Tempo — Temporal date and time utilities
description: Explicit Temporal parsing, timezone-safe arithmetic, and localized date/time formatting for TypeScript.
package: tempo
category: time
keywords: [temporal, date-time, timezone, formatting, arithmetic, dst, intl]
related: [rune, vault]
exports: [Temporal, parse, now, nowInstant, isValid, toInstant, inTimeZone, shift, difference, isBefore, isAfter, isSame, contains, clamp, startOf, endOf, dateRange, recurrence, format, formatParts, formatRange, formatRangeParts, formatInstant, formatZoned, formatRelative, parseDuration, formatDuration, classifyExpiry, timeDiff, humanize, TempoError, TempoInvalidInputError, TempoInvalidTzError, TempoMissingTzError, TempoUnsupportedInputError]
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
import { parse, shift } from '@vielzeug/tempo';

const localMeeting = parse('2026-03-21T10:30:00', { as: 'plainDateTime' });
const reminder = shift(localMeeting, { minutes: -15 }, { timeZone: 'America/New_York' });
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
import { format, parse, shift } from '@vielzeug/tempo';

const localMeeting = parse('2026-03-21T10:30:00', { as: 'plainDateTime' });
const reminder = shift(localMeeting, { minutes: -15 }, { timeZone: 'America/New_York' });
const text = format(reminder, {
  locale: 'en-US',
  pattern: 'short',
});
```

## Features

<div class="features-grid">

- `parse()` — Requires an explicit ISO target: instant, zoned date-time, plain date-time, or plain date.
- `toInstant()` / `inTimeZone()` — Convert wall-clock and absolute values with explicit timezone semantics.
- `shift()` / `difference()` — Apply DST-safe arithmetic across instant, zoned, and wall-clock inputs.
- `contains()` / `clamp()` — Compare normalized ranges with optional calendar-unit precision.
- `startOf()` / `endOf()` — Resolve timezone-aware calendar boundaries, including configurable week starts.
- `dateRange()` / `recurrence()` — Generate validated, lazy zoned calendar sequences.
- `format()` / `formatRelative()` / `formatDuration()` — Render localized values through `Intl`, including calendar-aware relative months and years.
- `classifyExpiry()` — Classify fixed elapsed-time thresholds without month or year approximation.

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
