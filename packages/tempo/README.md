# @vielzeug/tempo

Temporal utilities with explicit parsing and timezone rules.

`@vielzeug/tempo` ships ESM and CJS output. It depends on `@js-temporal/polyfill` and re-exports `Temporal` so all consumers use one implementation and version.

## Installation

```sh
pnpm add @vielzeug/tempo
```

## Quick Start

Parse a wall-clock input, resolve it to an instant, then format its zoned display value.

```ts
import { format, inTimeZone, parse, shift, toInstant } from '@vielzeug/tempo';

const local = parse('2026-03-21T10:30:00', { as: 'plainDateTime' });
const meeting = toInstant(local, { timeZone: 'America/New_York' });
const reminder = shift(meeting, { minutes: -15 }, { timeZone: 'America/New_York' });

console.log(format(inTimeZone(reminder, 'America/New_York'), { locale: 'en-US', pattern: 'short' }));
```

## API Rules

- `parse()` always requires `{ as }`; Tempo does not auto-detect strings.
- `timeZone` is required whenever plain values become instants or zoned values.
- `disambiguation` controls DST overlaps and gaps.
- `difference()`, `contains()`, `clamp()`, and `classifyExpiry()` take object inputs.
- `classifyExpiry()` accepts fixed elapsed-time thresholds only; months and years are rejected.
- `Temporal` remains exported for advanced Temporal operations and type identity.

## Documentation

- [Overview](https://vielzeug.dev/tempo/)
- [Usage Guide](https://vielzeug.dev/tempo/usage)
- [API Reference](https://vielzeug.dev/tempo/api)
- [Examples](https://vielzeug.dev/tempo/examples)
- [Migration Guide](https://vielzeug.dev/tempo/migration)

## License

MIT © Helmuth Saatkamp — part of Vielzeug.
