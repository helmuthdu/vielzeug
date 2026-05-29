---
title: Tempo — Temporal date and time utilities
description: Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.
package: tempo
category: date-time
keywords: [temporal, date-time, timezone, formatting, arithmetic, dst, intl, calendar]
related: [toolkit]
exports: [parse, convert, add, subtract, diff, format, isBefore, isAfter, isWithin, now]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="tempo" />

<img src="/logo-tempo.svg" alt="Tempo logo" width="156" class="logo-highlight"/>

# Tempo

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/tempo` &nbsp;·&nbsp; **Category:** Date Time

**Key exports:** `parse`, `convert`, `add`, `subtract`, `diff`, `format`, `isBefore`, `isAfter`, `isWithin`, `now`

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
import { formatHuman, formatInstant, now, shift, toZoned } from '@vielzeug/tempo';

// Get current time in a timezone
const meeting = toZoned(now('UTC'), { tz: 'America/New_York' });

// Shift time (DST-safe)
const reminder = shift(meeting, { minutes: -15 });

// Format for humans
const text = formatHuman(reminder, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' });

// Format for APIs/logs (instant string)
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
- **Formatting split by intent** — `formatHuman()` for UI, `formatInstant()` for instant strings, `formatZoned()` for zoned strings
- **Range + comparison helpers** — `within()`, `clamp()`, `isBefore()`, `isAfter()`, `isSame()`
- **Boundary helpers** — `startOf()` and `endOf()` for day/week/month/year-style snapping
- **Relative and duration formatting** — `formatRelative()` and `formatDuration()`
- **Duration tools** — `difference()` plus `parseDuration()`
- **Intl integration** — formatting respects locale & calendar systems
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
