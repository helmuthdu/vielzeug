---
description: Zero-dependency typed event bus with subscribe/emit, wait(), async streams, AbortSignal support, bus piping, and test helpers.
package: herald
category: events
keywords: [event-bus, typed-events, pub-sub, reactive, decoupled, async-streams]
related: [ripple, wayfinder, familiar]
exports: [createBus, createBehaviorBus, pipeEvents, createTestBus]
---

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
import { BusDisposedError, createBus, pipeEvents } from '@vielzeug/herald';

type AppEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': void;
};

const bus = createBus<AppEvents>();

// Subscribe
bus.on('user:login', ({ userId }) => {
  console.log('Logged in:', userId);
});

// Emit
bus.emit('user:login', { email: 'alice@example.com', userId: '42' });
bus.emit('user:logout');

// Await the next event
const nextLogin = await bus.wait('user:login');

// Race multiple events — result is a discriminated union
const nextSessionEvent = await bus.waitAny(['user:login', 'user:logout'] as const);
if (nextSessionEvent.event === 'user:login') {
  console.log(nextSessionEvent.payload.userId);
}

// Stream all future emits as an async generator
for await (const payload of bus.events('user:login', { signal: AbortSignal.timeout(5_000) })) {
  console.log(payload.email);
}

// Forward selected events from one bus to another
const auditBus = createBus<AppEvents>();
const unpipe = pipeEvents(bus, auditBus, ['user:login', 'user:logout']);
// unpipe() — stop forwarding; also stops automatically when either bus disposes

// Disposal signal — fire external cleanup when the bus is torn down
otherBus.on('count', handler, { signal: bus.disposalSignal });

// Handle disposal in async code
try {
  await bus.wait('user:login', { signal: AbortSignal.timeout(1_000) });
} catch (err) {
  if (err instanceof BusDisposedError) {
    console.log('Bus was disposed');
  }
}
```

## Documentation

- [Overview](https://vielzeug.dev/herald/)
- [Usage Guide](https://vielzeug.dev/herald/usage)
- [API Reference](https://vielzeug.dev/herald/api)
- [Examples](https://vielzeug.dev/herald/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
