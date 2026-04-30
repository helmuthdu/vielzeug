# @vielzeug/timit

> Temporal-powered date and time utilities for modern TypeScript apps.

[![npm version](https://img.shields.io/npm/v/@vielzeug/timit)](https://www.npmjs.com/package/@vielzeug/timit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/timit` provides explicit, type-safe helpers for the Temporal API: local parsing, timezone conversion, DST-safe arithmetic, range checks, and human/canonical formatting.

## Installation

```sh
pnpm add @vielzeug/timit
# npm install @vielzeug/timit
# yarn add @vielzeug/timit
```

## Quick Start

```ts
import { timit } from '@vielzeug/timit';

const meeting = '2026-03-21T10:30:00Z';
const meetingNY = timit.toZoned(meeting, { tz: 'America/New_York' });
const reminder = timit.add(meetingNY, { minutes: -15 });

console.log(timit.format(reminder, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' }));
console.log(timit.formatIso(reminder));
```

Destructure for short names in local scope: `const { add, format } = timit`.

## API Quick Reference

### Conversion

- `parse(input)` — Parse plain local date/time string to `Temporal.PlainDateTime`
- `toInstant(input, options?)` — Normalize to canonical timeline value (`Temporal.Instant`)
- `toZoned(input, options?)` — View time in a specific timezone (`Temporal.ZonedDateTime`)

Input parsing rules:
- `tz` is required for plain local inputs (`2026-03-21`, `2026-03-21T10:15`)
- Zone-annotated strings (`2026-03-21T10:15:30[America/New_York]`) use the embedded timezone
- Offset-bearing strings (`2026-03-21T10:15:30+02:00`) are treated as absolute instants

### Arithmetic

- `add(input, duration, options?)` — Add/subtract duration, DST-safe, returns `Temporal.ZonedDateTime`
- `difference(start, end, options?)` — Compute duration between two times, returns `Temporal.Duration`

### Queries

- `now(tz?)` — Current time in timezone (or system timezone)
- `within(value, start, end, options?)` — Inclusive range check; auto-normalizes reversed bounds

### Formatting

- `format(input, options?)` — Localized UI string; patterns: `'short' | 'medium' | 'long' | 'date-only' | 'time-only'`
- `formatIso(input, options?)` — Canonical ISO-8601 string for APIs/logs
- `formatRange(start, end, options?)` — Localized time span via `Intl.DateTimeFormat.formatRange`

## Why timit?

✅ **Temporal-safe**: No fragile Date arithmetic or timezone math
✅ **DST-aware**: Handles daylight-saving transitions correctly
✅ **Intl-integrated**: Locale formatting without boilerplate
✅ **Concise API**: Short, intuitive function names
✅ **Polyfilled**: Works in runtimes without native Temporal

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
