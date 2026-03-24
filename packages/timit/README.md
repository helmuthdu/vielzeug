# @vielzeug/timit

> Temporal-powered date and time utilities for modern TypeScript apps.

[![npm version](https://img.shields.io/npm/v/@vielzeug/timit)](https://www.npmjs.com/package/@vielzeug/timit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/timit` provides ergonomic, type-safe helpers for the Temporal API: parsing, timezone conversion, date-time arithmetic (with DST safety), range checks, and formatting.

## Installation

```sh
pnpm add @vielzeug/timit
# npm install @vielzeug/timit
# yarn add @vielzeug/timit
```

## Quick Start

```ts
import { d } from '@vielzeug/timit';

const meeting = '2026-03-21T10:30:00Z';
const meetingNY = d.asZoned(meeting, { tz: 'America/New_York' });
const reminder = d.add(meetingNY, { minutes: -15 });

console.log(d.format(reminder, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' }));
```

Or use individual imports:

```ts
import { add, format, asZoned } from '@vielzeug/timit';
// same code, just without the "d." prefix
```

## API Quick Reference

### Conversion
- `asInstant(input, options?)` — Normalize to canonical timeline value
- `asZoned(input, options?)` — View time in a specific timezone

### Arithmetic
- `add(input, duration, options?)` — Add duration (DST-safe)
- `subtract(input, duration, options?)` — Subtract duration (DST-safe)
- `diff(start, end, options?)` — Compute duration between two times

### Queries
- `now(tz?)` — Current time in timezone
- `within(value, start, end, options?)` — Check if time is in range

### Formatting
- `format(input, options?)` — Format as string with `'short' | 'long' | 'iso' | 'date-only' | 'time-only'`
- `formatRange(start, end, options?)` — Format time span with browser `Intl.formatRange` fallback

### Exports
- `Temporal` (from `@js-temporal/polyfill`) for advanced use

## Why timit?

✅ **Temporal-safe**: No fragile Date arithmetic or timezone math  
✅ **DST-aware**: Handles daylight-saving transitions correctly  
✅ **Intl-integrated**: Locale formatting without boilerplate  
✅ **Concise API**: Short, intuitive function names  
✅ **Polyfilled**: Works in runtimes without native Temporal  


## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.



