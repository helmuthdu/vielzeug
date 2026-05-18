---
description: Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.
package: timit
category: date-time
keywords: [temporal, date-time, timezone, formatting, arithmetic, dst, intl, calendar]
related: [toolkit]
exports: [parse, convert, add, subtract, diff, format, isBefore, isAfter, isWithin, now]
---

# @vielzeug/timit

> Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.

[![npm version](https://img.shields.io/npm/v/@vielzeug/timit)](https://www.npmjs.com/package/@vielzeug/timit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/timit` &nbsp;·&nbsp; **Category:** Date-time

**Key exports:** `parse`, `convert`, `add`, `subtract`, `diff`, `format`, `isBefore`, `isAfter`, `isWithin`, `now`

**When to use:** Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.

**Related:** [@vielzeug/toolkit](https://vielzeug.dev/toolkit/)

</details>

`@vielzeug/timit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/timit
npm install @vielzeug/timit
yarn add @vielzeug/timit
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

## Documentation

- [Overview](https://vielzeug.dev/timit/)
- [Usage Guide](https://vielzeug.dev/timit/usage)
- [API Reference](https://vielzeug.dev/timit/api)
- [Examples](https://vielzeug.dev/timit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
