---
description: Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.
package: tempo
category: date-time
keywords: [temporal, date-time, timezone, formatting, arithmetic, dst, intl, calendar]
related: [toolkit]
exports: [parse, convert, add, subtract, diff, format, isBefore, isAfter, isWithin, now]
---

# /tempo

> Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.

[![npm version](https://img.shields.io/npm/v//tempo)](https://www.npmjs.com/package//tempo) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/tempo` &nbsp;·&nbsp; **Category:** Date-time

**Key exports:** `parse`, `convert`, `add`, `subtract`, `diff`, `format`, `isBefore`, `isAfter`, `isWithin`, `now`

**When to use:** Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.

**Related:** [@vielzeug/toolkit](https://vielzeug.dev/toolkit/)

</details>

`/tempo` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /tempo
npm install /tempo
yarn add /tempo
```

## Quick Start

```ts
import { Temporal } from '@js-temporal/polyfill';
import { formatDuration, formatHuman, formatInstant, formatZoned, parseLocal, shift, toInstant, toZoned } from '/tempo';

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
import * as tempo from '/tempo';

tempo.now('UTC');
tempo.difference(start, end, { largestUnit: 'day' });
tempo.formatHuman(meeting, { pattern: 'short', locale: 'en-US' });
```

## Documentation

- [Overview](https://vielzeug.dev/tempo/)
- [Usage Guide](https://vielzeug.dev/tempo/usage)
- [API Reference](https://vielzeug.dev/tempo/api)
- [Examples](https://vielzeug.dev/tempo/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
