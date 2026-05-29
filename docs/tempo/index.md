---
title: Tempo — Temporal date and time utilities
description: Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.
package: tempo
category: time
keywords: [temporal, date-time, timezone, formatting, arithmetic, dst, intl, calendar]
related: [toolkit]
exports: [now, parseLocal, toInstant, toZoned, shift, difference, within, clamp, isBefore, isAfter, isSame, startOf, endOf, format, formatRange, formatInstant, formatZoned, formatRelative, parseDuration, formatDuration, expires, timeDiff, dateRange, clearCaches]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="tempo" />

<img src="/logo-tempo.svg" alt="Tempo logo" width="156" class="logo-highlight"/>

# Tempo

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/tempo` &nbsp;·&nbsp; **Category:** Date Time

**Key exports:** `now`, `parseLocal`, `toInstant`, `toZoned`, `shift`, `difference`, `format`, `formatRelative`, `isBefore`, `isAfter`, `isSame`, `startOf`, `endOf`

**When to use:** Temporal-powered date parsing, DST-safe arithmetic, timezone conversion, and Intl formatting.

**Related:** [Toolkit](/toolkit/)

</details>

`@vielzeug/tempo` is a Temporal-first date/time library for TypeScript. It provides explicit helpers for parsing local values, timezone conversion, DST-safe arithmetic, comparison, boundaries, and Intl-based formatting.


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
import { format, formatInstant, parseLocal, shift, toInstant, toZoned } from '@vielzeug/tempo';

// Parse a wall-clock string (no timezone attached)
const localMeeting = parseLocal('2026-03-21T10:30:00');

// Convert to an instant using the user's timezone
const meetingInstant = toInstant(localMeeting, { tz: 'America/New_York' });

// Project to a zoned view and subtract 15 minutes (DST-safe)
const meetingNY = toZoned(meetingInstant, { tz: 'America/New_York' });
const reminder = shift(meetingNY, { minutes: -15 });

// Format for display
const text = format(reminder, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' });

// Format for APIs/logs (stable UTC instant string)
const stable = formatInstant(reminder);
```

## Why Tempo?

Manual date handling breaks at daylight-saving boundaries, timezone edges, and DST transitions.

```ts
// Before — fragile, loses timezone context
const reminder = new Date(meeting.getTime() - 15 * 60_000);

// After — DST-safe, handles transitions correctly
const reminder = shift(meeting, { minutes: -15 });
```

| Feature        | Tempo                                       | date-fns | Day.js  | Native Date |
| -------------- | ------------------------------------------- | -------- | ------- | ----------- |
| Bundle size    | <PackageInfo package="tempo" type="size" /> | ~10 kB   | ~3 kB   | 0 kB        |
| DST-safe math  | ✅ (Temporal)                               | Manual   | Manual  | ❌          |
| Timezone aware | ✅ Full support                             | ✅       | ✅      | Partial     |
| Immutable      | ✅                                          | ✅       | ✅      | ❌          |
| Format presets | ✅ (`'short'`, `'medium'`, `'long'`, etc.)  | ❌       | ❌      | ❌          |
| Type inference | ✅ Full TypeScript                          | Partial  | Partial | ❌          |

**Use Tempo when** you need reliable timezone handling, DST-safe arithmetic, and clean Temporal-based APIs without heavy dependencies.

**Consider alternatives when** you need extensive locale data (date-fns).

## Features

- **Explicit local parsing** — `parseLocal()` for wall-clock values; local inputs require `tz` when converting
- **DST-safe arithmetic** — `shift()` handles transitions correctly
- **Timezone conversion** — `toZoned()`, `toInstant()` with full timezone support
- **Formatting split by intent** — `format()` for UI (with presets and `intl` escape hatch), `formatInstant()` for UTC strings, `formatZoned()` for zoned strings
- **Relative and range formatting** — `formatRelative()` for UX copy, `formatRange()` for localized time spans
- **Range + comparison helpers** — `within()`, `clamp()`, `isBefore()`, `isAfter()`, `isSame()` with calendar-unit and week-start support
- **Boundary helpers** — `startOf()` and `endOf()` for day/week/month/year-style snapping
- **Duration tools** — `difference()`, `parseDuration()`, `formatDuration()`
- **Expiry and diff utilities** — `expires()` for TTL classification, `timeDiff()` for human-readable time differences, `dateRange()` for generating date sequences
- **Intl integration** — formatting respects locale and calendar systems
- **Cache management** — `clearCaches()` to release internal `Intl` formatter caches
- **Polyfilled Temporal** — works in runtimes without native support via `@js-temporal/polyfill`
- <PackageInfo package="tempo" type="size" /> gzipped

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Sieve](/sieve/) — Schema validation (similar `v` namespace pattern)
- [Rune](/rune/) — Structured logging

<!-- markdownlint-enable MD025 MD033 MD060 -->
