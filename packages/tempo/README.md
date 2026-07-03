# @vielzeug/tempo

> Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.

[![npm version](https://img.shields.io/npm/v/@vielzeug/tempo)](https://www.npmjs.com/package/@vielzeug/tempo) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/tempo` &nbsp;·&nbsp; **Category:** Date-time

**Key exports:** `now`, `parseLocal`, `parseInstant`, `parseAny`, `toInstant`, `toZoned`, `shift`, `difference`, `format`, `formatRelative`, `isBefore`, `isAfter`, `isSame`, `startOf`, `endOf`, `expires`, `classify`, `timeDiff`, `recurrence`

**When to use:** Temporal-powered parsing, timezone conversion, arithmetic (DST-safe), and Intl formatting for modern TypeScript.

**Related:** [@vielzeug/arsenal](https://vielzeug.dev/arsenal/)

</details>

`@vielzeug/tempo` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/tempo
npm install @vielzeug/tempo
yarn add @vielzeug/tempo
```

## Quick Start

```ts
import { format, formatInstant, parseLocal, shift, toInstant, toZoned } from '@vielzeug/tempo';

// Parse a wall-clock string (no timezone attached)
const localMeeting = parseLocal('2026-03-21T10:30:00');

// Convert to an absolute instant using the user's timezone
const meetingInstant = toInstant(localMeeting, { tz: 'America/New_York' });

// Project to a zoned view and subtract 15 minutes (DST-safe)
const meetingNY = toZoned(meetingInstant, { tz: 'America/New_York' });
const reminder = shift(meetingNY, { minutes: -15 });

// Format for display
console.log(format(reminder, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' }));

// Format for APIs / logs (stable UTC instant string)
console.log(formatInstant(reminder));
```

Since many function names (`now`, `shift`, `clamp`, `difference`, …) are common in application code, use a namespace import to avoid collisions while still getting full tree-shaking:

```ts
import * as tempo from '@vielzeug/tempo';

tempo.now('UTC');
tempo.difference(start, end, { largestUnit: 'day', tz: 'UTC' });
tempo.format(meeting, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' });
```

## Documentation

- [Overview](https://vielzeug.dev/tempo/)
- [Usage Guide](https://vielzeug.dev/tempo/usage)
- [API Reference](https://vielzeug.dev/tempo/api)
- [Examples](https://vielzeug.dev/tempo/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
