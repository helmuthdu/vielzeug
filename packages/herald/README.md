# @vielzeug/herald

> Zero-dependency typed event bus with subscribe/emit, wait(), async streams, AbortSignal support, bus piping, and test helpers.

[![npm version](https://img.shields.io/npm/v/@vielzeug/herald)](https://www.npmjs.com/package/@vielzeug/herald) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/herald` &nbsp;·&nbsp; **Category:** Events

**Key exports:** `createBus`, `pipeEvents`, `createTestBus`

**When to use:** Decoupled inter-module communication via a typed event bus. Supports subscribe/emit, one-time await, async iteration, event piping, and AbortSignal lifecycle management.

**Related:** [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/wayfinder](https://vielzeug.dev/wayfinder/) · [@vielzeug/familiar](https://vielzeug.dev/familiar/)

</details>

`@vielzeug/herald` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/herald
npm install @vielzeug/herald
yarn add @vielzeug/herald
```

## Quick Start

```ts
import { createBus, pipeEvents } from '@vielzeug/herald';

interface AppEvents {
  'user:login': { email: string; userId: string };
  'user:logout': void;
}

const bus = createBus<AppEvents>();
const auditBus = createBus<AppEvents>();
const stop = bus.on('user:login', ({ userId }) => console.log('Logged in:', userId));
const stopPipe = pipeEvents(bus, auditBus, ['user:login', 'user:logout']);

bus.emit('user:login', { email: 'alice@example.com', userId: '42' });
bus.emit('user:logout');

stopPipe();
stop();
bus.dispose();
auditBus.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/herald/)
- [Usage Guide](https://vielzeug.dev/herald/usage)
- [API Reference](https://vielzeug.dev/herald/api)
- [Examples](https://vielzeug.dev/herald/examples)
- [Migration Guide](https://vielzeug.dev/herald/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
