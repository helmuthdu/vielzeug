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
import { Temporal } from '@js-temporal/polyfill';
import { formatDuration, formatHuman, formatInstant, formatZoned, parseLocal, shift, toInstant, toZoned } from '@vielzeug/timit';

const localMeeting = parseLocal('2026-03-21T10:30:00');
const meetingInstant = toInstant(localMeeting, { tz: 'America/New_York' });
const meetingNY = toZoned(meetingInstant, { tz: 'America/New_York' });
const reminder = shift(meetingNY, { minutes: -15 });

console.log(formatHuman(reminder, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' }));
console.log(formatInstant(reminder));
console.log(formatZoned(reminder));
console.log(formatDuration({ hours: 1, minutes: 30 }, { locale: 'en-US', style: 'short' }));
```

Since many function names (`now`, `shift`, `clamp`, `difference`, …) are common in application code, use a namespace import to avoid collisions while still getting full tree-shaking:

```ts
import * as timit from '@vielzeug/timit';

timit.now('UTC');
timit.difference(start, end, { largestUnit: 'day' });
timit.formatHuman(meeting, { pattern: 'short', locale: 'en-US' });
```

## API Quick Reference

### Conversion

- `parseLocal(input)` — Parse plain local date/time string to `Temporal.PlainDateTime`
- `toInstant(input, options?)` — Normalize to canonical timeline value (`Temporal.Instant`)
- `toZoned(input, options)` — View time in a specific timezone (`Temporal.ZonedDateTime`)

Input model:

- Core functions accept Temporal values (`Temporal.Instant`, `Temporal.PlainDate`, `Temporal.PlainDateTime`, `Temporal.ZonedDateTime`)
- Use `parseLocal()` when starting from local strings
- `tz` is required whenever a local value must be interpreted on the timeline

### Arithmetic

- `shift(input, duration, options)` — Add/subtract duration, DST-safe, returns `Temporal.ZonedDateTime`
- `difference(start, end, options?)` — Compute duration between two times; infers timezone from zoned inputs or accepts explicit `options.tz`

### Queries

- `now(tz)` — Current time in timezone
- `within(value, start, end, options?)` — Inclusive range check; auto-normalizes reversed bounds
- `clamp(value, start, end, options?)` — Clamp a value to range bounds; returns `Temporal.Instant`
- `isBefore(a, b, options?)` / `isAfter(a, b, options?)` / `isSame(a, b, options)` — Comparison helpers for timeline or calendar-unit checks

### Formatting

- `formatHuman(input, options?)` — Localized UI string; patterns: `'short' | 'medium' | 'long' | 'date-only' | 'time-only'`
- `formatInstant(input, options?)` — UTC ISO-8601 string (e.g. `2026-03-21T10:15:30Z`)
- `formatZoned(input, options?)` — Zoned ISO-8601 string; infers tz from `ZonedDateTime`, or requires `options.tz`
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
