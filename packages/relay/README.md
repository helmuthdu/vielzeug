---
description: Zero-dependency typed event bus with subscribe/emit, wait(), async streams, AbortSignal support, and test helpers.
package: relay
category: events
keywords: [event-bus, typed-events, pub-sub, reactive, decoupled, async-streams]
related: [ripple, route, worker]
exports: [createBus, createTestBus]
---

# /relay

> Zero-dependency typed event bus with subscribe/emit, wait(), async streams, AbortSignal support, and test helpers.

[![npm version](https://img.shields.io/npm/v//relay)](https://www.npmjs.com/package//relay) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/relay` &nbsp;·&nbsp; **Category:** Events

**Key exports:** `createBus`, `createTestBus`

**When to use:** Zero-dependency typed event bus with subscribe/emit, wait(), async streams, AbortSignal support, and test helpers.

**Related:** [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/route](https://vielzeug.dev/route/) · [@vielzeug/worker](https://vielzeug.dev/worker/)

</details>

`/relay` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /relay
npm install /relay
yarn add /relay
```

## Quick Start

```ts
import { BusDisposedError, createBus } from '/relay';

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
const nextSessionEvent = await bus.waitAny(['user:login', 'user:logout'] as const);

if (nextSessionEvent.event === 'user:login') {
  console.log(nextSessionEvent.payload.userId);
}

try {
  await bus.wait('user:login', AbortSignal.timeout(1_000));
} catch (err) {
  if (err instanceof BusDisposedError) {
    console.log('Bus was disposed');
  }
}
```

## Documentation

- [Overview](https://vielzeug.dev/relay/)
- [Usage Guide](https://vielzeug.dev/relay/usage)
- [API Reference](https://vielzeug.dev/relay/api)
- [Examples](https://vielzeug.dev/relay/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
