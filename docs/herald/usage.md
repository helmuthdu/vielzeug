---
title: Herald — Usage Guide
description: Typed event maps, lifecycle-owned subscriptions, waits, streams, pipes, and testing.
---

[[toc]]

## Basic Usage

Use interface or type alias event maps. Events model facts that happened; use Ripple for current state.

```ts
import { createBus } from '@vielzeug/herald';

interface AppEvents {
  'cart:updated': { count: number };
  'user:logout': void;
}

const bus = createBus<AppEvents>();
const stop = bus.on('cart:updated', ({ count }) => console.log(count));

bus.emit('cart:updated', { count: 1 });
stop();
bus.dispose();
```

## Subscriptions

Use `once()` for one event and `{ signal }` for owned subscription lifetime.

```ts
const controller = new AbortController();

bus.on('cart:updated', renderCart, { signal: controller.signal });
bus.once('user:logout', clearSession);
controller.abort();
```

## Middleware and Validation

Middleware is synchronous. Call `next()` once to continue; omit it to block dispatch.

```ts
const bus = createBus<AppEvents>({
  middleware: [
    (event, payload, next) => {
      audit(event, payload);
      next();
    },
  ],
  validatePayload: (event, payload) => {
    if (event === 'cart:updated' && payload.count < 0) throw new RangeError('count must be non-negative');
  },
});
```

## Awaiting Events

```ts
const cart = await bus.wait('cart:updated', { signal: AbortSignal.timeout(5_000) });
const winner = await bus.waitAny(['cart:updated', 'user:logout'], { signal: AbortSignal.timeout(5_000) });
```

## Streaming Events

`events()` subscribes eagerly. Bound buffers for producers faster than consumers.

```ts
await using stream = bus.events('cart:updated', { maxBuffer: 100 });

for await (const cart of stream) {
  renderCart(cart);
}
```

## Piping Events

`pipeEvents()` only accepts compatible payloads. Stop explicitly or tie pipe to signal.

```ts
const stopPipe = pipeEvents(sourceBus, auditBus, ['cart:updated'], { signal: pageSignal });
stopPipe();
```

## Testing

`createTestBus()` records dispatched payloads without mocks.

```ts
import { createTestBus } from '@vielzeug/herald/testing';

const bus = createTestBus<AppEvents>();
bus.emit('cart:updated', { count: 2 });
expect(bus.emitted('cart:updated')).toEqual([{ count: 2 }]);
bus.dispose();
```

## Debugging

```ts
import { debugBus } from '@vielzeug/herald/devtools';

const bus = debugBus<AppEvents>({ name: 'cart' });
```

## Working with Other Vielzeug Libraries

Use Herald for temporal events. Use Ripple for retained reactive state. Use Familiar or Courier completion handlers to emit application events.

## Best Practices

- Define one explicit event map per boundary.
- Emit facts, not mutable application state.
- Keep middleware synchronous and call `next()` once.
- Pass AbortSignals for component/request scoped work.
- Set `maxBuffer` for long-lived streams.
- Use `wait()` only for one-off coordination.
- Use unsubscribe handles instead of global listener removal.
- Dispose owner-scoped buses.
