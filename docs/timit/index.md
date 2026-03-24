---
title: Timit — Temporal date and time utilities
description: Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.
---

<PackageBadges package="timit" />

<img src="/logo-timit.svg" alt="Timit logo" width="156" class="logo-highlight"/>

# Timit

`@vielzeug/timit` is a Temporal-first date/time library for TypeScript. It provides ergonomic helpers for parsing, timezone conversion, arithmetic through DST transitions, and Intl-based formatting—without the fragility of native `Date`.

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
import { d } from '@vielzeug/timit';

// Get current time in a timezone
const meeting = d.asZoned(d.now(), { tz: 'America/New_York' });

// Add time (DST-safe)
const reminder = d.add(meeting, { minutes: -15 });

// Format for humans
const text = d.format(reminder, { pattern: 'short', locale: 'en-US' });
```

## Why Timit?

Manual date handling breaks at daylight-saving boundaries, timezone edges, and DST transitions.

```ts
// Before — fragile, loses timezone context
const reminder = new Date(meeting.getTime() - 15 * 60_000);

// After — DST-safe, handles transitions correctly
const reminder = d.add(meeting, { minutes: -15 });
```

| Feature        | Timit                                       | date-fns | Day.js  | Native Date |
| -------------- | ------------------------------------------- | -------- | ------- | ----------- |
| Bundle size    | <PackageInfo package="timit" type="size" /> | ~10 kB   | ~3 kB   | 0 kB        |
| DST-safe math  | ✅ (Temporal)                               | Manual   | Manual  | ❌          |
| Timezone aware | ✅ Full support                             | ✅       | ✅      | Partial     |
| Immutable      | ✅                                          | ✅       | ✅      | ❌          |
| Format presets | ✅ (`'short'`, `'long'`, etc.)              | ❌       | ❌      | ❌          |
| Type inference | ✅ Full TypeScript                          | Partial  | Partial | ❌          |

**Use Timit when** you need reliable timezone handling, DST-safe arithmetic, and clean Temporal-based APIs without heavy dependencies.

**Consider alternatives when** you need extensive locale data (date-fns).

## Features

- **`d` namespace** — grouped functions for IDE autocomplete (like Validit's `v`)
- **DST-safe arithmetic** — `d.add()`, `d.subtract()` handle transitions correctly
- **Timezone conversion** — `d.asZoned()`, `d.asInstant()` with full timezone support
- **Preset formatting** — `'short'`, `'long'`, `'iso'`, `'date-only'`, `'time-only'`
- **Range queries** — `d.within()` for inclusive time range checks
- **Duration diffs** — `d.diff()` with granular control over units
- **Intl integration** — formatting respects locale & calendar systems
- **Tree-shaking friendly** — import `d` or individual functions
- **Polyfilled Temporal** — works in runtimes without native support via `@js-temporal/polyfill`
- <PackageInfo package="timit" type="size" /> gzipped

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## See Also

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Validit](/validit/) — Schema validation (similar `v` namespace pattern)
- [Logit](/logit/) — Structured logging
