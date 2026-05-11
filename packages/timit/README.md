# @vielzeug/timit

> Temporal-powered date and time utilities for modern TypeScript apps.

[![npm version](https://img.shields.io/npm/v/@vielzeug/timit)](https://www.npmjs.com/package/@vielzeug/timit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/timit` provides explicit, type-safe helpers for the Temporal API: local parsing, timezone conversion, DST-safe arithmetic, boundaries, range checks, comparison, and human/canonical formatting.

## Installation

```sh
pnpm add @vielzeug/timit
# npm install @vielzeug/timit
# yarn add @vielzeug/timit
```

## Quick Start

```ts
import { formatDuration, formatHuman, formatISO, parseLocal, shift, toInstant, toZoned } from '@vielzeug/timit';

const localMeeting = parseLocal('2026-03-21T10:30:00');
const meetingInstant = toInstant(localMeeting, { tz: 'America/New_York' });
const meetingNY = toZoned(meetingInstant, { tz: 'America/New_York' });
const reminder = shift(meetingNY, { minutes: -15 });

console.log(formatHuman(reminder, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' }));
console.log(formatISO(reminder));
console.log(formatDuration({ hours: 1, minutes: 30 }, { locale: 'en-US', style: 'short' }));
```

## API Quick Reference

### Conversion

- `parseLocal(input)` — Parse plain local date/time string to `Temporal.PlainDateTime`
- `toInstant(input, options?)` — Normalize to canonical timeline value (`Temporal.Instant`)
- `toZoned(input, options)` — View time in a specific timezone (`Temporal.ZonedDateTime`)

Input parsing rules:

- `tz` is required for plain local inputs (`2026-03-21`, `2026-03-21T10:15`)
- Zone-annotated strings (`2026-03-21T10:15:30[America/New_York]`) use the embedded timezone
- Offset-bearing strings (`2026-03-21T10:15:30+02:00`) are treated as absolute instants

### Arithmetic

- `shift(input, duration, options)` — Add/subtract duration, DST-safe, returns `Temporal.ZonedDateTime`
- `difference(start, end, options)` — Compute duration between two times in an explicit timezone, returns `Temporal.Duration`

### Queries

- `now(tz)` — Current time in timezone
- `within(value, start, end, options?)` — Inclusive range check; auto-normalizes reversed bounds
- `clamp(value, start, end, options?)` — Clamp a value to range bounds
- `isBefore(a, b, options?)` / `isAfter(a, b, options?)` / `isSameDay(a, b, { tz })` — Comparison helpers

### Formatting

- `formatHuman(input, options?)` — Localized UI string; patterns: `'short' | 'medium' | 'long' | 'date-only' | 'time-only'`
- `formatISO(input, options?)` — Canonical ISO-8601 string for APIs/logs
- `formatRange(start, end, options?)` — Localized time span via `Intl.DateTimeFormat.formatRange`
- `formatRelative(input, options?)` — Relative text via `Intl.RelativeTimeFormat`
- `parseDuration(input)` / `formatDuration(input, options?)` — Duration utilities

## Why timit?

✅ **Temporal-safe**: No fragile Date arithmetic or timezone math
✅ **DST-aware**: Handles daylight-saving transitions correctly
✅ **Intl-integrated**: Locale formatting without boilerplate
✅ **Concise API**: Short, intuitive function names
✅ **Polyfilled**: Works in runtimes without native Temporal

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
