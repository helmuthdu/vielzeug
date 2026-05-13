---
title: Timit — Temporal date and time utilities
description: Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="timit" />

<img src="/logo-timit.svg" alt="Timit logo" width="156" class="logo-highlight"/>

# Timit

`@vielzeug/timit` is a Temporal-first date/time library for TypeScript. It provides explicit helpers for parsing local values, timezone conversion, DST-safe arithmetic, comparison, boundaries, and Intl-based formatting.

<!-- Search keywords: Temporal API, timezone conversion, DST transitions, date arithmetic, time formatting -->

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/timit
```

```sh [npm]
npm install @vielzeug/timit
```

```sh [yarn]
yarn add @vielzeug/timit
```

:::

## Quick Start

```ts
import { formatHuman, formatInstant, now, shift, toZoned } from '@vielzeug/timit';

// Get current time in a timezone
const meeting = toZoned(now('UTC'), { tz: 'America/New_York' });

// Shift time (DST-safe)
const reminder = shift(meeting, { minutes: -15 });

// Format for humans
const text = formatHuman(reminder, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' });

// Format for APIs/logs (instant string)
const stable = formatInstant(reminder);
```

## Why Timit?

Manual date handling breaks at daylight-saving boundaries, timezone edges, and DST transitions.

```ts
// Before — fragile, loses timezone context
const reminder = new Date(meeting.getTime() - 15 * 60_000);

// After — DST-safe, handles transitions correctly
const reminder = shift(meeting, { minutes: -15 });
```

| Feature        | Timit                                       | date-fns | Day.js  | Native Date |
| -------------- | ------------------------------------------- | -------- | ------- | ----------- |
| Bundle size    | <PackageInfo package="timit" type="size" /> | ~10 kB   | ~3 kB   | 0 kB        |
| DST-safe math  | ✅ (Temporal)                               | Manual   | Manual  | ❌          |
| Timezone aware | ✅ Full support                             | ✅       | ✅      | Partial     |
| Immutable      | ✅                                          | ✅       | ✅      | ❌          |
| Format presets | ✅ (`'short'`, `'medium'`, `'long'`, etc.)  | ❌       | ❌      | ❌          |
| Type inference | ✅ Full TypeScript                          | Partial  | Partial | ❌          |

**Use Timit when** you need reliable timezone handling, DST-safe arithmetic, and clean Temporal-based APIs without heavy dependencies.

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
- <PackageInfo package="timit" type="size" /> gzipped

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

- [Validit](/validit/) — Schema validation (similar `v` namespace pattern)
- [Logit](/logit/) — Structured logging

<!-- markdownlint-enable MD025 MD033 MD060 -->
