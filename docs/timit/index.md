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
import { timit } from '@vielzeug/timit';

// Get current time in a timezone
const meeting = timit.toZoned(timit.now(), { tz: 'America/New_York' });

// Add time (DST-safe)
const reminder = timit.add(meeting, { minutes: -15 });

// Format for humans
const text = timit.format(reminder, { pattern: 'short', locale: 'en-US' });

// Format for APIs/logs
const stable = timit.formatIso(reminder);
```

Use the `timit` namespace for explicit, collision-free usage.

## Why Timit?

Manual date handling breaks at daylight-saving boundaries, timezone edges, and DST transitions.

```ts
// Before — fragile, loses timezone context
const reminder = new Date(meeting.getTime() - 15 * 60_000);

// After — DST-safe, handles transitions correctly
const reminder = timit.add(meeting, { minutes: -15 });
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

- **Namespace import** — single `timit` object keeps all helpers collision-free
- **Explicit local parsing** — `timit.parse()` for wall-clock values; plain local values require `tz` in `timit.toInstant()`/`timit.toZoned()`
- **DST-safe arithmetic** — `timit.add()` handles transitions correctly
- **Timezone conversion** — `timit.toZoned()`, `timit.toInstant()` with full timezone support
- **Formatting split by intent** — `timit.format()` for UI, `timit.formatIso()` for APIs/logs
- **Range queries** — `timit.within()` for inclusive time checks with normalized bounds
- **Duration diffs** — `timit.difference()` with granular control over units
- **Intl integration** — formatting respects locale & calendar systems
- **Destructurable** — `const { add, format } = timit` for short names in a local scope
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
