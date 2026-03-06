# @vielzeug/eventit

> Typed event bus for decoupled, reactive inter-module communication

[![npm version](https://img.shields.io/npm/v/@vielzeug/eventit)](https://www.npmjs.com/package/@vielzeug/eventit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Eventit** is a type-safe pub/sub event bus: define your event map once, emit and subscribe with full TypeScript inference — no magic strings, no runtime surprises.

## Installation

```sh
pnpm add @vielzeug/eventit
# npm install @vielzeug/eventit
# yarn add @vielzeug/eventit
```

## Quick Start

```typescript
import { createEventBus } from '@vielzeug/eventit';

type AppEvents = {
  'user:login':   { userId: string; email: string };
  'user:logout':  { userId: string };
  'cart:updated': { items: CartItem[]; total: number };
  'theme:change': 'light' | 'dark';
};

const bus = createEventBus<AppEvents>();

// Subscribe
const unsub = bus.on('user:login', ({ userId }) => {
  loadUserProfile(userId);
});

// Emit
bus.emit('user:login', { userId: '42', email: 'alice@example.com' });

// Unsubscribe
unsub();
```

## Features

- ✅ **Typed event maps** — define all events and payloads once, TypeScript enforces them everywhere
- ✅ **Void events** — emit no-payload events cleanly: `bus.emit('refresh')`
- ✅ **`once`** — auto-unsubscribing one-shot listeners
- ✅ **Error isolation** — optional `onError` handler to catch listener errors without stopping the bus
- ✅ **Max listener warnings** — configurable ceiling with console warnings to catch memory leaks
- ✅ **Test utilities** — `createTestEventBus` records every emitted payload for assertion
- ✅ **Framework-agnostic** — zero dependencies, works anywhere TypeScript runs

## Usage

### Defining an Event Map

```typescript
type AppEvents = {
  // payload is inferred at every call site
  'user:login':  { userId: string };
  'data:loaded': { count: number; items: unknown[] };
  // void = no payload required
  'session:expired': void;
};

const bus = createEventBus<AppEvents>();
```

### Subscribe and Unsubscribe

```typescript
// on() — persistent subscription, returns unsubscribe
const unsub = bus.on('user:login', (payload) => {
  console.log(payload.userId); // fully typed
});
unsub(); // remove listener

// once() — fires once then auto-removes itself
bus.once('session:expired', () => redirectToLogin());

// off() — imperative removal
const handler = (p: { userId: string }) => console.log(p);
bus.on('user:login', handler);
bus.off('user:login', handler);

// off() without listener — removes all listeners for that event
bus.off('user:login');
```

### Emit

```typescript
bus.emit('user:login', { userId: '42' });        // typed payload required
bus.emit('session:expired');                       // void — no payload needed
```

### Error Handling

```typescript
// Without onError, listener errors are re-thrown (stops remaining listeners)
// With onError, errors are captured and all listeners still run
const bus = createEventBus<AppEvents>({
  onError: (err, event) => {
    logger.error(`[eventit] Error in "${event}" listener`, err);
  },
});
```

### Inspection

```typescript
bus.has('user:login');            // true if any listener is registered
bus.listenerCount('user:login');  // number of registered listeners
bus.clear('user:login');          // remove all listeners for one event
bus.clear();                      // remove all listeners for all events
```

### Testing

```typescript
import { createTestEventBus } from '@vielzeug/eventit';

const { bus, emitted, dispose } = createTestEventBus<AppEvents>();

bus.emit('user:login', { userId: '1' });
bus.emit('user:login', { userId: '2' });

expect(emitted.get('user:login')).toEqual([
  { userId: '1' },
  { userId: '2' },
]);

dispose(); // clear listeners and recorded payloads
```

## API

### `createEventBus<T>(options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `maxListeners` | `number` | `100` | Max listeners per event before a warning |
| `onError` | `(err, event) => void` | — | Custom error handler for listener errors |

Returns an `EventBus<T>`.

### `EventBus<T>` Methods

| Method | Description |
|---|---|
| `on(event, listener)` | Subscribe to an event — returns `Unsubscribe` |
| `once(event, listener)` | Subscribe once, auto-removes after first emit — returns `Unsubscribe` |
| `off(event, listener?)` | Remove a listener, or all listeners if omitted |
| `emit(event, payload?)` | Emit an event synchronously to all listeners |
| `clear(event?)` | Clear one event's listeners, or all if omitted |
| `has(event)` | `true` if the event has at least one listener |
| `listenerCount(event)` | Number of listeners for an event |

### `createTestEventBus<T>()`

Returns `{ bus, emitted, dispose }` where `emitted` is a `Map<EventKey, unknown[]>` recording every payload passed to `emit`.

## Documentation

Full docs at **[helmuthdu.github.io/vielzeug/eventit](https://helmuthdu.github.io/vielzeug/eventit)**

| | |
|---|---|
| [Usage Guide](https://helmuthdu.github.io/vielzeug/eventit/usage) | Event maps, subscriptions, error handling |
| [API Reference](https://helmuthdu.github.io/vielzeug/eventit/api) | Complete type signatures |
| [Examples](https://helmuthdu.github.io/vielzeug/eventit/examples) | Real-world event bus patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
