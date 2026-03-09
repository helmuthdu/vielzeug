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
import { eventBus } from '@vielzeug/eventit';

type AppEvents = {
  'user:login':   { userId: string; email: string };
  'user:logout':  void;
  'cart:updated': { items: CartItem[]; total: number };
  'theme:change': 'light' | 'dark';
};

const bus = eventBus<AppEvents>();

// Subscribe
const unsub = bus.on('user:login', ({ userId }) => {
  loadUserProfile(userId);
});

// Emit
bus.emit('user:login', { userId: '42', email: 'alice@example.com' });
bus.emit('user:logout');  // void event — no payload

// Unsubscribe
unsub();
```

## Features

- ✅ **Typed event maps** — define all events and payloads once, TypeScript enforces them everywhere
- ✅ **Void events** — emit signal events cleanly: `bus.emit('refresh')`
- ✅ **`once`** — auto-unsubscribing one-shot listeners
- ✅ **Error isolation** — optional `onError` keeps one failing listener from crashing others
- ✅ **Emit hook** — optional `onEmit` intercepts every emission for logging or debugging
- ✅ **Dispose** — permanently tear down a bus; `emit` and `on` become no-ops
- ✅ **Test utilities** — `testEventBus` records every emitted payload for assertion
- ✅ **Framework-agnostic** — zero dependencies, works anywhere TypeScript runs

## Usage

### Defining an Event Map

```typescript
type AppEvents = {
  // events with payloads
  'user:login':  { userId: string };
  'data:loaded': { count: number; items: unknown[] };
  // signal events — no payload
  'session:expired': void;
};

const bus = eventBus<AppEvents>();
```

### Subscribe and Unsubscribe

```typescript
// on() — persistent subscription, returns unsubscribe
const unsub = bus.on('user:login', (payload) => {
  console.log(payload.userId); // fully typed
});
unsub(); // remove this listener

// once() — fires once then auto-removes itself
bus.once('session:expired', () => redirectToLogin());
```

### Emit

```typescript
bus.emit('user:login', { userId: '42' });  // typed payload required
bus.emit('session:expired');               // void — no payload needed
```

### Error Handling

```typescript
// Without onError, a throwing listener propagates the error to the emit caller.
// With onError, errors are captured and remaining listeners still run.
const bus = eventBus<AppEvents>({
  onError: (err, event) => {
    logger.error(`[eventit] Error in "${event}" listener`, err);
  },
});
```

### Emit Hook

```typescript
// onEmit fires on every emission, before listeners run.
const bus = eventBus<AppEvents>({
  onEmit: (event, payload) => {
    console.debug(`[bus] ${event}`, payload);
  },
});
```

### Cleanup

```typescript
bus.clear('user:login');  // remove all listeners for one event
bus.clear();              // remove all listeners for all events
bus.dispose();            // permanently tear down — emit/on become no-ops
```

### Testing

```typescript
import { testEventBus } from '@vielzeug/eventit';

const { bus, emitted, reset, dispose } = testEventBus<AppEvents>();

bus.emit('user:login', { userId: '1' });
bus.emit('user:login', { userId: '2' });

expect(emitted.get('user:login')).toEqual([
  { userId: '1' },
  { userId: '2' },
]);

reset();   // clear recorded payloads, keep listeners
dispose(); // clear listeners and recorded payloads
```

## API

### `eventBus<T>(options?)`

| Option | Type | Description |
|---|---|---|
| `onError` | `(err, event) => void` | Custom error handler. Absent: errors are re-thrown. |
| `onEmit` | `(event, payload) => void` | Called before listeners on every emission. |

Returns an `EventBus<T>`.

### `EventBus<T>` Methods

| Method | Description |
|---|---|
| `on(event, listener)` | Subscribe — returns `Unsubscribe` |
| `once(event, listener)` | Subscribe once, auto-removes after first emit — returns `Unsubscribe` |
| `emit(event, payload?)` | Emit synchronously to all listeners |
| `clear(event?)` | Remove listeners for one event, or all events if omitted |
| `dispose()` | Permanently tear down — all listeners removed, `emit`/`on` become no-ops |

### `testEventBus<T>(options?)`

Returns `{ bus, emitted, reset, dispose }` where `emitted` is a `Map<EventKey, unknown[]>` recording every payload passed to `emit`. `reset()` clears records without disposing. Accepts the same options as `eventBus` except `onEmit` (used internally for recording).

## Documentation

Full docs at **[helmuthdu.github.io/vielzeug/eventit](https://helmuthdu.github.io/vielzeug/eventit)**

| | |
|---|---|
| [Usage Guide](https://helmuthdu.github.io/vielzeug/eventit/usage) | Event maps, subscriptions, error handling |
| [API Reference](https://helmuthdu.github.io/vielzeug/eventit/api) | Complete type signatures |
| [Examples](https://helmuthdu.github.io/vielzeug/eventit/examples) | Real-world event bus patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
