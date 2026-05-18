---
description: Zero-dependency typed event bus with subscribe/emit, wait(), async streams, AbortSignal support, and test helpers.
package: eventit
category: events
keywords: [event-bus, typed-events, pub-sub, reactive, decoupled, async-streams]
related: [stateit, routeit, workit]
exports: [createBus, createTestBus]
---

# @vielzeug/eventit

> Zero-dependency typed event bus with subscribe/emit, wait(), async streams, AbortSignal support, and test helpers.

[![npm version](https://img.shields.io/npm/v/@vielzeug/eventit)](https://www.npmjs.com/package/@vielzeug/eventit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/eventit` &nbsp;·&nbsp; **Category:** Events

**Key exports:** `createBus`, `createTestBus`

**When to use:** Zero-dependency typed event bus with subscribe/emit, wait(), async streams, AbortSignal support, and test helpers.

**Related:** [@vielzeug/stateit](https://vielzeug.dev/stateit/) · [@vielzeug/routeit](https://vielzeug.dev/routeit/) · [@vielzeug/workit](https://vielzeug.dev/workit/)

</details>

`@vielzeug/eventit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/eventit
npm install @vielzeug/eventit
yarn add @vielzeug/eventit
```

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

- [Overview](https://vielzeug.dev/eventit/)
- [Usage Guide](https://vielzeug.dev/eventit/usage)
- [API Reference](https://vielzeug.dev/eventit/api)
- [Examples](https://vielzeug.dev/eventit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
