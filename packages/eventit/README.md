# @vielzeug/eventit

> Typed event bus for synchronous pub/sub, async waiting, and event streams.

[![npm version](https://img.shields.io/npm/v/@vielzeug/eventit)](https://www.npmjs.com/package/@vielzeug/eventit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/eventit` is a zero-dependency event bus for TypeScript. Define an event map once and get type-safe `emit`, `on`, `once`, `wait`, and `events` APIs with proper payload inference.

## Installation

```sh
pnpm add @vielzeug/eventit
# npm install @vielzeug/eventit
# yarn add @vielzeug/eventit
```

## Entry Points

| Entry | Purpose |
| --- | --- |
| `@vielzeug/eventit` | Main runtime (`createBus`, types, `BusDisposedError`) |
| `@vielzeug/eventit/core` | Core bundle entry |
| `@vielzeug/eventit/test` | Testing helper (`createTestBus`) |

## Quick Start

```ts
import { BusDisposedError, createBus } from '@vielzeug/eventit';

type AppEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': void;
};

const bus = createBus<AppEvents>();

bus.on('user:login', ({ userId }) => {
  console.log('Logged in:', userId);
});

bus.emit('user:login', { email: 'alice@example.com', userId: '42' });
bus.emit('user:logout');

const nextLogin = await bus.wait('user:login');

try {
  await bus.wait('user:login', AbortSignal.timeout(1_000));
} catch (err) {
  if (err instanceof BusDisposedError) {
    console.log('Bus was disposed');
  }
}
```

## Features

- Typed event maps with strict payload checks
- `void` events with no payload argument
- Persistent (`on`) and one-shot (`once`) subscriptions
- Promise-based waiting via `wait`
- Async streaming via `events`
- `AbortSignal` support for listeners and async waits
- Optional `onEmit` and `onError` hooks
- `listenerCount` for per-event and total counts
- `dispose` + `[Symbol.dispose]` for explicit or `using` cleanup

## Testing

```ts
import { createTestBus } from '@vielzeug/eventit/test';

type AppEvents = {
  'user:login': { userId: string };
  'user:logout': void;
};

const bus = createTestBus<AppEvents>();

bus.emit('user:login', { userId: '1' });
bus.emit('user:login', { userId: '2' });

console.log(bus.emitted('user:login'));
// [{ userId: '1' }, { userId: '2' }]

bus.reset();
bus.dispose();
```

## API At a Glance

- `createBus<T>(options?: BusOptions<T>): Bus<T>`
- `createTestBus<T>(options?: BusOptions<T>): TestBus<T>`
- `BusDisposedError`
- `type Bus<T>`, `BusOptions<T>`, `EventMap`, `EventKey<T>`, `Listener<T>`, `Unsubscribe`

## Documentation

- [Overview](https://vielzeug.dev/eventit/)
- [Usage Guide](https://vielzeug.dev/eventit/usage)
- [API Reference](https://vielzeug.dev/eventit/api)
- [Examples](https://vielzeug.dev/eventit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
