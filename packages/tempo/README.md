# @vielzeug/tempo

> Temporal-powered date utilities

## Installation

```sh
pnpm add @vielzeug/tempo
npm install @vielzeug/tempo
yarn add @vielzeug/tempo
```

## Quick Start

```ts
import { format, parse, shift } from '@vielzeug/tempo';

const local = parse('2026-03-21T10:30:00', { as: 'plainDateTime' });
const reminder = shift(local, { minutes: -15 }, { timeZone: 'America/New_York' });

console.log(format(reminder, { locale: 'en-US', pattern: 'short' }));
```

## Documentation

- [Overview](https://vielzeug.dev/tempo/)
- [Usage Guide](https://vielzeug.dev/tempo/usage)
- [API Reference](https://vielzeug.dev/tempo/api)
- [Examples](https://vielzeug.dev/tempo/examples)
- [Migration Guide](https://vielzeug.dev/tempo/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
