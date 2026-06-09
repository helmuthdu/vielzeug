---
title: Herald — Usage Guide
description: Event maps, subscriptions, wait(), async event streams, hooks, cleanup, and testing for @vielzeug/herald.
---

[[toc]]

::: tip New to Herald?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

## Basic Usage

An event map is a plain TypeScript type where each key is an event name and each value is the payload type. Use `void` for signal events that carry no data.

```ts
type AppEvents = {
  // events with payloads
  'user:login': { userId: string; email: string };
  'user:logout': void; // signal — no payload
  'cart:updated': { items: CartItem[]; total: number };
  'theme:change': 'light' | 'dark';
  'data:loaded': { count: number; items: unknown[] };
};

const bus = createBus<AppEvents>();
```

## Subscribing

### `on()` — Persistent subscription

`on()` registers a listener for every future emit of an event. It returns an `Unsubscribe` function.

```ts
const unsub = bus.on('user:login', ({ userId, email }) => {
  console.log('logged in:', userId, email); // fully typed
});

// Remove the listener
unsub();
```

::: tip Multiple registrations
Registering the **same listener function** twice creates two independent subscriptions — the listener fires twice per emit and each registration has its own independent unsubscribe handle. There is no deduplication.
:::

### `once()` — One-shot listener

`once()` registers a listener that fires exactly once, then removes itself automatically.

```ts
bus.once('user:logout', () => {
  redirectToLogin();
});
```

### `removeAllListeners()` — Bulk unsubscribe

Remove listeners for one event, or all listeners across the bus.

```ts
bus.removeAllListeners('user:login');
bus.removeAllListeners(); // all events
```

### `eventNames()` — Introspect active subscriptions

Get a snapshot of event keys that currently have listeners.

```ts
bus.on('user:login', handler);
bus.on('user:logout', handler);

console.log(bus.eventNames()); // ['user:login', 'user:logout']
```

### AbortSignal and `SubscribeOptions`

Pass a `SubscribeOptions` object as the third argument to `on()`. Use `signal` to auto-unsubscribe when an `AbortSignal` fires, and `once` to auto-remove after the first invocation.

```ts
const controller = new AbortController();

// Auto-remove when signal aborts
bus.on('user:login', handler, { signal: controller.signal });

// Later — removes the listener automatically
controller.abort();

// One-shot subscription inline (equivalent to bus.once())
bus.on('user:login', handler, { once: true });

// Both combined — fires at most once, and only before signal aborts
bus.on('cart:updated', handler, { once: true, signal: controller.signal });
```

## Emitting Events

`emit()` calls all registered listeners synchronously and returns the number of listeners that were invoked.

```ts
const count = bus.emit('user:login', { userId: '42', email: 'alice@example.com' });
bus.emit('user:logout'); // void event — no second argument
console.log(count); // number of listeners fired
```

`emit()` returns `0` when the bus is disposed, when middleware blocks dispatch, or when `validatePayload` rejects the payload with `onError` configured.

If a listener throws and no `onError` is configured, the error propagates to the `emit()` caller. With `onError`, the error is captured and remaining listeners still run.

### Middleware

Pass `middleware` to `createBus()` to intercept every `emit()` before listeners run. Middleware functions receive `(event, payload, next)` — call `next()` to continue, or omit it to block dispatch:

```ts
const bus = createBus<AppEvents>({
  middleware: [
    (event, payload, next) => {
      console.debug('[dispatch]', event, payload);
      next();
    },
    // Rate limit: block dispatch if quota is exceeded
    (event, _payload, next) => {
      if (rateLimiter.allow(event)) next();
    },
  ],
});
```

Multiple middleware run in array order. If any omits `next()`, subsequent middleware and all listeners are skipped and `emit()` returns `0`.

### `validatePayload`

Use `validatePayload` for schema-level guards that run **before** middleware. Throw to reject the emit:

```ts
const bus = createBus<AppEvents>({
  validatePayload: (event, payload) => {
    if (event === 'count' && typeof payload !== 'number') {
      throw new TypeError('count must be a number');
    }
  },
  onError: ({ err, event }) => logger.warn('rejected', event, err),
});

bus.emit('count', 'oops'); // → onError called, listeners skipped, returns 0
bus.emit('count', 42); // → listeners run, returns listener count
```

Without `onError`, a `validatePayload` throw propagates directly to the `emit()` caller.

## Awaiting Events

`wait()` returns a `Promise` that resolves with the payload of the next emit. This is useful for one-off async coordination patterns.

```ts
// Waits for the next 'user:login' emit and resolves
const { userId } = await bus.wait('user:login');
```

`wait()` rejects if:

- The bus is disposed before the event fires
- A provided `AbortSignal` aborts

```ts
// Reject if login hasn't happened within 5 seconds
const { userId } = await bus.wait('user:login', { signal: AbortSignal.timeout(5_000) });
```

### `waitAny()`

`waitAny()` resolves with the first event that fires from a list and returns both the winning event key and payload.

```ts
const result = await bus.waitAny(['user:login', 'user:logout']);

if (result.event === 'user:login') {
  console.log(result.payload.userId);
}
```

Like `wait()`, it rejects when the bus is disposed or when the provided signal aborts:

```ts
const result = await bus.waitAny(['user:login', 'user:logout'], { signal: AbortSignal.timeout(10_000) });
```

## Async Iteration

`events()` returns an `AsyncGenerator` that yields every future emit of an event. It terminates when the bus is disposed or the provided signal aborts.

`events()` subscribes **eagerly** — the listener is registered when `events()` is called, so events emitted before the first `await` are buffered and will be yielded on the next iteration.

```ts
for await (const { items, total } of bus.events('cart:updated')) {
  renderCart(items, total);
}
```

Use the `options` object to stop iterating early or cap the internal buffer:

```ts
const controller = new AbortController();

for await (const payload of bus.events('data:loaded', { signal: controller.signal, maxBuffer: 100 })) {
  process(payload);
  if (isDone(payload)) controller.abort(); // exits the loop cleanly
}
// loop ends here — no exception thrown on abort or dispose
```

The generator is `AsyncDisposable` — use `await using` for guaranteed cleanup even on early `break`:

```ts
await using stream = bus.events('user:login');
for await (const { userId } of stream) {
  if (userId === targetId) break; // stream subscription is torn down automatically
}
```

### `events()` operators: `.filter()`, `.map()`, `.take()`

`events()` returns an `EventStream<T>` with chainable operators for in-place transforms:

```ts
// Only yield positive counts
for await (const n of bus.events('count').filter((n) => n > 0)) {
  console.log(n);
}

// Transform each value
for await (const label of bus.events('count').map((n) => `count: ${n}`)) {
  console.log(label);
}

// Yield at most n values, then stop automatically
for await (const n of bus.events('count').take(5)) {
  console.log(n);
}

// Chain freely
for await (const s of bus
  .events('count')
  .filter((n) => n % 2 === 0)
  .map((n) => n * 2)
  .take(3)) {
  console.log(s);
}
```

`.take(n)` throws a `RangeError` synchronously if `n` is not a positive integer.

::: warning Sibling streams
Calling `.filter()`, `.map()`, or `.take()` on the **same base stream** object twice creates two sibling streams sharing one subscription. Disposing one sibling closes both. For independent lifecycles, call `bus.events()` separately for each consumer.
:::

## Error Handling

By default, a listener that throws propagates the error to the `emit()` caller, and subsequent listeners for that emit do not run.

Configure `onError` to capture errors instead. All remaining listeners still run.

```ts
const bus = createBus<AppEvents>({
  onError: ({ err, event, payload, timestamp }) => {
    // Structured context — event, payload, and timestamp at the time emit() was called
    logger.error(`[herald] Error in "${event}" listener`, err, { payload, timestamp });
  },
});
```

`onError` receives an `EmissionErrorContext<T>` object:

- `err` — the thrown value
- `event` — the event key that was being emitted
- `payload` — the payload passed to the failing listener (typed as `unknown`)
- `timestamp` — `Date.now()` captured at the moment `emit()` was called

## Dispose & Cleanup

`dispose()` permanently tears down the bus: all listeners are removed and all pending `wait()` promises are rejected with `BusDisposedError`.

```ts
bus.dispose();
bus.disposed; // true

// Calling dispose() again is safe — idempotent
bus.dispose(); // no-op
```

Use `instanceof BusDisposedError` to distinguish bus teardown from other rejections:

```ts
import { BusDisposedError } from '@vielzeug/herald';

try {
  const payload = await bus.wait('user:login');
} catch (err) {
  if (err instanceof BusDisposedError) {
    // bus was torn down before the event fired
  } else {
    throw err; // signal abort reason or unexpected error
  }
}
```

### `disposalSignal`

Every bus exposes a `disposalSignal: AbortSignal` property. The signal fires when `dispose()` is called, giving you a handle to tie external lifecycles to the bus lifetime without polling `bus.disposed`.

```ts
const bus = createBus<AppEvents>();

// Pass disposalSignal to another bus subscription — auto-unsubscribes on teardown
otherBus.on('count', syncState, { signal: bus.disposalSignal });

// Use with any AbortSignal-aware API
fetch('/api/stream', { signal: bus.disposalSignal });

// Combine with other signals
const combined = AbortSignal.any([bus.disposalSignal, AbortSignal.timeout(10_000)]);
bus.events('data:loaded', { signal: combined });
```

The signal is already aborted when `bus.disposed` is `true`.

## Wildcard Listeners

`onAny()` subscribes to **all events** on the bus. The listener receives the event name and payload on every emit, after event-specific listeners have run. Useful for cross-cutting concerns like logging, analytics, or dev-mode tracing.

```ts
const unsub = bus.onAny((event, payload) => {
  console.debug(`[bus] ${event}`, payload);
});

unsub(); // remove the wildcard listener when done
```

Like `on()`, `onAny()` accepts an optional `SubscribeOptions` object:

```ts
const controller = new AbortController();
bus.onAny(logger, { signal: controller.signal });
controller.abort(); // removes the wildcard listener

// Once-only wildcard
bus.onAny(logFirstEvent, { once: true });
```

`onAny` listeners are removed by `removeAllListeners()` (no argument), but not by `removeAllListeners('event')`.

::: tip `onAny` for bus-wide observability
`onAny` is a runtime listener — it can be added and removed dynamically, and accepts `{ signal, once }` options just like `on()`. Prefer it over global tracing hooks for cross-cutting concerns.
:::

## Event Piping

Use `pipeEvents()` to forward events from one bus to another. It supports same-name forwarding and event renaming.

```ts
import { createBus, pipeEvents } from '@vielzeug/herald';

type AppEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': void;
  'cart:updated': { items: CartItem[]; total: number };
};

const appBus = createBus<AppEvents>();
const auditBus = createBus<AppEvents>();

// Forward only auth events to the audit bus
const unpipe = pipeEvents(appBus, auditBus, ['user:login', 'user:logout']);
```

`pipeEvents` returns an `Unsubscribe` function to stop forwarding manually:

```ts
unpipe(); // stop forwarding
```

Forwarding stops automatically when the **target** bus is disposed — no manual cleanup needed. Source disposal is handled by the source bus's own `on()` lifecycle.

You can scope piping to a signal:

```ts
const controller = new AbortController();
pipeEvents(appBus, auditBus, ['user:login'], controller.signal);

// Stop forwarding after 30 seconds
setTimeout(() => controller.abort(), 30_000);
```

### Event renaming

Pass a `{ from, to }` object to forward an event under a different name on the target bus. This enables cross-domain event translation without manually wiring `on()` + `emit()`.

```ts
type AuthEvents = { 'auth:login': { userId: string }; 'auth:logout': void };
type AppEvents = { 'user:authenticated': { userId: string }; 'user:signed-out': void };

const authBus = createBus<AuthEvents>();
const appBus = createBus<AppEvents>();

pipeEvents(authBus, appBus, [
  { from: 'auth:login', to: 'user:authenticated' },
  { from: 'auth:logout', to: 'user:signed-out' },
]);
```

Mix string keys and `{ from, to }` objects freely in the same array:

```ts
pipeEvents(sourceBus, targetBus, [
  'config:updated', // same name
  { from: 'auth:login', to: 'user:authenticated' }, // renamed
]);
```

## Behavior Bus

`createBehaviorBus()` creates a bus that remembers and replays the last emitted value to new subscribers. This is useful for state-like events where late subscribers should receive the current value immediately — similar to a BehaviorSubject in RxJS.

```ts
import { createBehaviorBus } from '@vielzeug/herald';

type UIState = { theme: 'light' | 'dark'; zoom: number };

// Provide initial values — these are replayed to first subscribers
const bus = createBehaviorBus<UIState>({ theme: 'light', zoom: 1 });

bus.on('theme', applyTheme); // called with 'light' immediately
bus.on('zoom', setZoom); // called with 1 immediately

bus.emit('theme', 'dark');

bus.on('theme', applyTheme); // called with 'dark' immediately — gets current value
```

### `current()`

Read the current value for any event without subscribing:

```ts
bus.current('theme'); // 'dark'
bus.current('zoom'); // 1
```

### Replay rules

| Method         | Replays current value? |
| -------------- | ---------------------- |
| `on()`         | <sg-icon name="circle-check" size="16"></sg-icon> Yes                 |
| `once()`       | <sg-icon name="circle-check" size="16"></sg-icon> Yes (then done)     |
| `on({ once })` | <sg-icon name="circle-check" size="16"></sg-icon> Yes (then done)     |
| `events()`     | <sg-icon name="circle-x" size="16"></sg-icon> No                  |
| `wait()`       | <sg-icon name="circle-x" size="16"></sg-icon> No                  |

## Debug Mode

Import `debugBus` from the dedicated sub-path to create a bus with debug logging pre-enabled. The sub-path is tree-shaken from production bundles when not imported.

```ts
import { debugBus } from '@vielzeug/herald/devtools';

const bus = debugBus<AppEvents>();

bus.on('user:login', handler);
// → [herald:on] on("user:login")

bus.emit('user:login', { email: 'alice@example.com', userId: '42' });
// → [herald:emit] emit("user:login") — 1 listener(s)

bus.dispose();
// → [herald:lifecycle] dispose()
```

Alternatively, wire logging manually by passing `logger.debug` directly to `createBus()`:

```ts
const bus = createBus<AppEvents>({ logger: { debug: console.debug } }); // equivalent
```

Debug logging has no effect on behavior and should not be enabled in production.

### Custom logger

Provide a `logger` object to route or silence debug and warn output:

```ts
const bus = createBus<AppEvents>({
  logger: {
    debug: (msg) => myLogger.trace(msg), // enable + redirect debug output
    warn: (msg) => myLogger.warn(msg), // redirect warn output
  },
});

// Omit logger.debug to disable debug logging, omit logger.warn to silence warnings
const warnOnlyBus = createBus<AppEvents>({ logger: { warn: console.warn } });

// Pass {} to suppress all bus logging entirely
const silentBus = createBus<AppEvents>({ logger: {} });
```

### Naming a bus with `name`

Pass `name` to identify a bus in log messages and error output. Useful when multiple buses run concurrently and you need to distinguish their activity:

```ts
const authBus = createBus<AuthEvents>({ name: 'auth', logger: { debug: console.debug } });
const cartBus = createBus<CartEvents>({ name: 'cart', logger: { debug: console.debug } });

authBus.emit('user:login', { userId: '1' });
// → [herald:emit] emit("user:login") — 1 listener(s) (auth)

cartBus.dispose();
// → [herald:lifecycle] dispose() (cart)
```

When a named bus is disposed, `BusDisposedError` includes the name in its message:

```ts
// Bus "auth" is disposed
```

`name` has no effect on behavior and does not need to be unique.

### Detecting listener leaks with `maxListeners`

Pass `maxListeners` to `createBus()` to receive a `console.warn` whenever a single event's listener count exceeds the threshold. This helps catch accidental listener accumulation during development.

```ts
const bus = createBus<AppEvents>({ maxListeners: 10 });

// Registering an 11th listener for 'cart:updated' prints:
// [herald:warn] "cart:updated" has 11 listeners, exceeding maxListeners (10). Possible memory leak.
```

The warning fires for both event-specific listeners (`on`, `once`) and wildcard listeners (`onAny`). There is no effect on bus behavior — all listeners are still registered and invoked normally.

### Counting listeners

`listenerCount()` lets you inspect active subscriptions without needing to track them manually:

```ts
bus.on('user:login', handler1);
bus.on('user:login', handler2);
bus.on('user:logout', handler3);
bus.onAny(wildcardHandler);

bus.listenerCount('user:login'); // 3 — 2 specific + 1 wildcard
bus.listenerCount(); // 4 — 3 specific + 1 wildcard (wildcards counted once)
```

This is useful for debugging, assertions in tests, or conditional emit optimizations.

You can combine this with `eventNames()` when you need a quick snapshot of which channels are active.

### `using` keyword

`Bus` implements `[Symbol.dispose]`, so it works with the `using` keyword (TypeScript 5.2+, `"lib": ["esnext"]`):

```ts
{
  using bus = createBus<AppEvents>();
  bus.on('user:login', handler);
  bus.emit('user:login', { userId: '1', email: 'a@b.com' });
} // bus.dispose() is called automatically here
```

This is especially useful in test cases, request handlers, or any scope where you want guaranteed cleanup.

## Testing

Import `createTestBus` from `@vielzeug/herald/test`. It wraps `createBus` and records every emitted payload by event key.

```ts
import { createTestBus } from '@vielzeug/herald/test';

const bus = createTestBus<AppEvents>();

bus.emit('user:login', { userId: '1', email: 'a@example.com' });
bus.emit('user:login', { userId: '2', email: 'b@example.com' });

// emitted() returns a typed snapshot — not a live reference
expect(bus.emitted('user:login')).toEqual([
  { userId: '1', email: 'a@example.com' },
  { userId: '2', email: 'b@example.com' },
]);

bus.reset(); // clear recorded payloads, keep listeners active
bus.dispose(); // clear listeners and recorded payloads
```

Use `emittedCount(event)` when you only need the count, not the full payload list:

```ts
bus.emittedCount('user:login'); // number of times the event was emitted
```

`createTestBus` accepts the full `BusOptions<T>` including `onError`.

Use `reset()` to clear recorded payloads between assertions without affecting active listeners:

```ts
bus.emit('user:login', { email: 'a@example.com', userId: '1' });
bus.reset(); // clears emission records — listeners remain active

bus.emitted('user:login'); // => []
```

Use `using` for automatic cleanup in test cases:

```ts
it('records emitted events', () => {
  using bus = createTestBus<AppEvents>();
  bus.emit('user:logout');
  expect(bus.emitted('user:logout')).toHaveLength(1);
}); // bus disposed automatically
```

## Framework Integration

::: code-group

```tsx [React]
import { useEffect } from 'react';
import { createBus } from '@vielzeug/herald';

type AppEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': void;
};

// Module-level bus shared across components
const bus = createBus<AppEvents>();

function useEvent<K extends keyof AppEvents>(event: K, handler: (payload: AppEvents[K]) => void) {
  useEffect(() => {
    const controller = new AbortController();
    bus.on(event as any, handler as any, controller.signal);
    return () => controller.abort();
  }, [event, handler]);
}

function LoginButton() {
  useEvent('user:login', ({ userId }) => console.log('logged in:', userId));
  return <button onClick={() => bus.emit('user:login', { userId: '1', email: 'a@x.com' })}>Login</button>;
}
```

```ts [Vue 3]
import { onScopeDispose } from 'vue';
import { createBus } from '@vielzeug/herald';

type AppEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': void;
};

const bus = createBus<AppEvents>();

function useEvent<K extends keyof AppEvents>(event: K, handler: (payload: AppEvents[K]) => void) {
  const controller = new AbortController();
  bus.on(event as any, handler as any, controller.signal);
  onScopeDispose(() => controller.abort());
}
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createBus } from '@vielzeug/herald';

  type AppEvents = {
    'user:login': { userId: string; email: string };
    'user:logout': void;
  };

  const bus = createBus<AppEvents>();

  // Listen to events with automatic cleanup on component destroy
  const controller = new AbortController();
  bus.on('user:login', ({ userId }) => console.log('logged in:', userId), controller.signal);
  onDestroy(() => controller.abort());

  function login() {
    bus.emit('user:login', { userId: '1', email: 'alice@example.com' });
  }
</script>

<button on:click={login}>Login</button>
```

:::

## Working with Other Vielzeug Libraries

### With Rune

Use Rune to trace all event dispatches in development.

```ts
import { createBus } from '@vielzeug/herald';
import { createLogger } from '@vielzeug/rune';

const logger = createLogger({ scope: 'herald' });

const bus = createBus<AppEvents>({
  logger: { debug: logger.debug, warn: logger.warn },
  onError: ({ err, event }) => logger.error('handler failed', { err, event }),
});
```

### With Ripple

Use Ripple signals to reflect the latest event payload as reactive state.

```ts
import { createBus } from '@vielzeug/herald';
import { signal } from '@vielzeug/ripple';

type AppEvents = { 'user:login': { userId: string; email: string }; 'user:logout': void };
const bus = createBus<AppEvents>();

const currentUser = signal<{ userId: string; email: string } | null>(null);

bus.on('user:login', (payload) => {
  currentUser.value = payload;
});
bus.on('user:logout', () => {
  currentUser.value = null;
});
```

## Best Practices

- Create one bus per logical domain (e.g., one bus per micro-frontend module) rather than a single global bus.
- Pass `AbortSignal` to `on()` and `once()` for lifecycle-bound listeners — avoids manual `unsub()` tracking.
- Use `wait()` for one-off async coordination; use `events()` for continuous processing pipelines.
- Configure `onError` on the bus rather than wrapping each listener in try/catch.
- Call `dispose()` when a bus is no longer needed — it rejects all pending `wait()` promises.
- Use `pipeEvents()` to forward events between buses rather than re-emitting manually inside listeners.
- Pass `bus.disposalSignal` to tie external subscriptions and fetch calls to the bus lifetime.
- Prefer typed `EventMap` interfaces over generic string keys for full payload inference.
- Use `createTestBus` from `@vielzeug/herald/test` in unit tests rather than mocking the bus.
