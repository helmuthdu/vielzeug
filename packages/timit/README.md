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
import { formatHuman, formatISO, shift, toZoned } from '@vielzeug/timit';

const meeting = '2026-03-21T10:30:00Z';
const meetingNY = toZoned(meeting, { tz: 'America/New_York' });
const reminder = shift(meetingNY, { minutes: -15 });

console.log(formatHuman(reminder, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' }));
console.log(formatISO(reminder));
```

Namespace style:

```ts
import { d } from '@vielzeug/timit';

const meeting = d.toZoned('2026-03-21T10:30:00Z', { tz: 'America/New_York' });
const reminder = d.shift(meeting, { minutes: -15 });

console.log(d.formatHuman(reminder, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' }));
console.log(d.formatISO(reminder));
```

Prefer named imports when bundle size matters.

## API Quick Reference

### Conversion
- `toInstant(input, options?)` — Normalize to canonical timeline value
- `toZoned(input, options?)` — View time in a specific timezone

Notes:
- `tz` is required for plain local inputs like `2026-03-21` or `2026-03-21T10:15`.
- Zone-annotated local strings like `2026-03-21T10:15:30[America/New_York]` use the embedded timezone.
- Offset-bearing strings like `2026-03-21T10:15:30+02:00` are treated as absolute instants.

### Arithmetic
- `shift(input, duration, options?)` — Add/subtract duration (DST-safe)
- `diff(start, end, options?)` — Compute duration between two times

### Queries
- `now(tz?)` — Current time in timezone
- `within(value, start, end, options?)` — Check if time is in range (auto-normalizes bounds)

### Formatting
- `formatHuman(input, options?)` — Format localized string with `'short' | 'long' | 'date-only' | 'time-only'`
- `formatISO(input, options?)` — Format canonical ISO-8601 string
- `formatRange(start, end, options?)` — Format time span with browser `Intl.formatRange` fallback

### Exports
- `Temporal` (from `@js-temporal/polyfill`) for advanced use
- `d` namespace for convenience (`d.toInstant(...)`, `d.shift(...)`, etc.)

Notes:
- Prefer named exports when bundle size matters so bundlers can tree-shake unused helpers.

## Why timit?

✅ **Temporal-safe**: No fragile Date arithmetic or timezone math
✅ **DST-aware**: Handles daylight-saving transitions correctly
✅ **Intl-integrated**: Locale formatting without boilerplate
✅ **Concise API**: Short, intuitive function names
✅ **Polyfilled**: Works in runtimes without native Temporal


## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
