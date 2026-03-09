# @vielzeug/eventit

> Typed event bus for decoupled, reactive inter-module communication

[![npm version](https://img.shields.io/npm/v/@vielzeug/eventit)](https://www.npmjs.com/package/@vielzeug/eventit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Eventit** is a type-safe pub/sub event bus: define your event map once, then emit, subscribe, await, and stream events with full TypeScript inference — no magic strings, no runtime surprises.

## Installation

```sh
pnpm add @vielzeug/eventit
# npm install @vielzeug/eventit
# yarn add @vielzeug/eventit
```

## Quick Start

```typescript
import { createBus } from '@vielzeug/eventit';

type AppEvents = {
  'user:login':   { userId: string; email: string };
  'user:logout':  void;
  'cart:updated': { items: CartItem[]; total: number };
};

const bus = createBus<AppEvents>();

// Subscribe
const unsub = bus.on('user:login', ({ userId }) => {
  loadUserProfile(userId);
});

// Emit
bus.emit('user:login', { userId: '42', email: 'alice@example.com' });
bus.emit('user:logout'); // void event — no payload

// Await the next emit
const { userId } = await bus.wait('user:login');

// Stream all future emits
for await (const { items } of bus.events('cart:updated')) {
  renderCart(items);
}

// Auto-cleanup with `using`
{
  using bus = createBus<AppEvents>();
} // bus.dispose() called automatically at block exit
```

## Features

- ✅ **Typed event maps** — define all events and payloads once; TypeScript enforces them everywhere
- ✅ **Void events** — emit signal events cleanly: `bus.emit('refresh')`
- ✅ **`once`** — auto-unsubscribing one-shot listeners
- ✅ **`wait`** — async: `await bus.wait('user:login')` resolves on the next emit
- ✅ **`events`** — async generator for pull-based streaming of all future emits
- ✅ **AbortSignal** — pass any `AbortSignal` to `on`, `once`, `wait`, or `events` for lifecycle-driven cleanup
- ✅ **`[Symbol.dispose]`** — supports the `using` keyword for automatic teardown
- ✅ **Error isolation** — optional `onError` keeps a failing listener from crashing others
- ✅ **Emit hook** — optional `onEmit` intercepts every emission for logging or tracing
- ✅ **Test utilities** — `createTestBus` records every emitted payload for assertion
- ✅ **Zero dependencies** — works anywhere TypeScript runs

## Usage

### Defining an Event Map

```typescript
type AppEvents = {
  // events with payloads
  'user:login':  { userId: string };
  'data:loaded': { count: number; items: unknown[] };
  // signal events — no payload needed
  'session:expired': void;
};

const bus = createBus<AppEvents>();
```

### Subscribe

```typescript
// on() — persistent subscription, returns an unsubscribe function
const unsub = bus.on('user:login', (payload) => {
  console.log(payload.userId); // fully typed
});
unsub(); // remove subscription

// once() — fires once then auto-removes itself
bus.once('session:expired', () => redirectToLogin());

// AbortSignal — unsubscribes automatically when the controller aborts
const controller = new AbortController();
bus.on('user:login', handler, controller.signal);
controller.abort(); // listener removed, no manual unsub needed
```

### Emit

```typescript
bus.emit('user:login', { userId: '42' }); // typed payload required
bus.emit('session:expired');              // void — no payload
```

### Await

```typescript
// wait() resolves on the next emit, rejects if disposed or signal aborts
const { userId } = await bus.wait('user:login');

// With AbortSignal timeout
const signal = AbortSignal.timeout(5000);
const payload = await bus.wait('data:loaded', signal);
```

### Stream

```typescript
// events() is an async generator — yields every future emit
for await (const { userId } of bus.events('user:login')) {
  console.log('login:', userId);
}

// Stop streaming via AbortSignal
const controller = new AbortController();
for await (const payload of bus.events('data:loaded', controller.signal)) {
  if (isDone(payload)) controller.abort();
}
```

### Error Handling

```typescript
// Without onError, a throwing listener propagates to the emit caller.
// With onError, errors are captured and remaining listeners still run.
const bus = createBus<AppEvents>({
  onError: (err, event, payload) => {
    logger.error(`[eventit] Error in "${event}" listener`, err);
  },
});
```

### Emit Hook

```typescript
// onEmit fires before listeners on every emission — useful for tracing.
const bus = createBus<AppEvents>({
  onEmit: (event, payload) => {
    console.debug(`[bus] ${event}`, payload);
  },
});
```

### Dispose & Cleanup

```typescript
bus.dispose(); // permanently tear down — listeners cleared, pending waits rejected
bus.disposed;  // true after dispose() — idempotent, safe to call multiple times

// `using` keyword for automatic dispose at block exit
{
  using bus = createBus<AppEvents>();
  bus.on('user:login', handler);
} // bus.dispose() called here automatically
```

### Testing

```typescript
import { createTestBus } from '@vielzeug/eventit/test';

const bus = createTestBus<AppEvents>();

bus.emit('user:login', { userId: '1' });
bus.emit('user:login', { userId: '2' });

// emitted() returns a typed snapshot of all payloads for that event
expect(bus.emitted('user:login')).toEqual([
  { userId: '1' },
  { userId: '2' },
]);

bus.reset();   // clear recorded payloads, keep listeners
bus.dispose(); // clear listeners and recorded payloads
```

## API

### `createBus<T>(options?)`

| Option | Type | Description |
|---|---|---|
| `onError` | `(err, event, payload) => void` | Capture listener errors instead of re-throwing |
| `onEmit` | `(event, payload) => void` | Called before listeners on every emission |

Returns a `Bus<T>`.

### `Bus<T>` Members

| Member | Description |
|---|---|
| `disposed` | `readonly boolean` — `true` after `dispose()` |
| `on(event, listener, signal?)` | Persistent subscription — returns `Unsubscribe` |
| `once(event, listener, signal?)` | One-shot subscription, auto-removes after first emit |
| `wait(event, signal?)` | Returns `Promise<T[K]>` — resolves on next emit, rejects on dispose or abort |
| `events(event, signal?)` | Returns `AsyncGenerator<T[K]>` — yields every future emit |
| `emit(event, payload?)` | Emit synchronously to all listeners |
| `dispose()` | Permanently tear down — idempotent |
| `[Symbol.dispose]()` | Alias for `dispose()` — enables the `using` keyword |

### `createTestBus<T>(options?)`

Like `createBus` but records every emitted payload. Returns a `TestBus<T>` — a full `Bus<T>` plus:

| Member | Description |
|---|---|
| `emitted(event)` | Snapshot of all payloads emitted for that event, in order |
| `reset()` | Clear recorded history without disposing the bus |

## Documentation

Full docs at **[vielzeug.dev/eventit](https://vielzeug.dev/eventit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/eventit/usage) | Event maps, subscribing, async, streaming, testing |
| [API Reference](https://vielzeug.dev/eventit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/eventit/examples) | Real-world event bus patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
