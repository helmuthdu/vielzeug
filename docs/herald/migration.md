---
title: Herald — Migration Guide
description: Migrate from Herald 1.x retained-state and test-listener APIs to Herald 2.
---

[[toc]]

## Herald 2 Changes

Herald 2 is a temporal event bus. It delivers events, owns subscription lifecycles, and supports waits, streams, and compatible event pipes.

Removed APIs:

- `createBehaviorBus()`
- `BehaviorBus`, `BehaviorInitial`, and `BehaviorBusOptions`
- `debugBehaviorBus()`
- `TestBus.removeAllListeners()`

Use `@vielzeug/ripple` for retained current state.

## Replace `createBehaviorBus()`

Replace replayed event state with Ripple signals or stores.

```ts
// Herald 1
const bus = createBehaviorBus<{ theme: string }>({ theme: 'light' });
bus.on('theme', applyTheme);
bus.emit('theme', 'dark');
console.log(bus.current('theme'));
```

```ts
// Herald 2
import { signal } from '@vielzeug/ripple';

const theme = signal('light');
const stop = theme.subscribe(applyTheme);

theme.set('dark');
console.log(theme.value);
stop();
```

Use `createBus()` only when consumers need future event delivery rather than current state.

## Replace `debugBehaviorBus()`

Use a Ripple signal/store for state. Use `debugBus()` only for temporal event tracing.

```ts
import { debugBus } from '@vielzeug/herald/devtools';

const bus = debugBus<{ 'theme:changed': { theme: string } }>();
bus.emit('theme:changed', { theme: 'dark' });
```

## Replace `removeAllListeners()`

Keep unsubscribe handles or use an `AbortSignal` for owned listener lifetimes.

```ts
const controller = new AbortController();

bus.on('cart:updated', renderCart, { signal: controller.signal });
controller.abort();
```

Use explicit handles when only one listener needs removal.

```ts
const stop = bus.on('cart:updated', renderCart);
stop();
```

## Middleware Contract

Middleware remains synchronous. Call `next()` during current middleware call and only once. For deferred work, schedule a new `emit()` yourself.

```ts
const bus = createBus<{ refresh: void }>({
  middleware: [(_event, _payload, next) => {
    next();
  }],
});
```

## Pipe Type Safety

Renamed pipe entries now require compatible payloads.

```ts
pipeEvents(source, target, [{ from: 'auth:login', to: 'user:authenticated' }]);
```

Transform incompatible data before emitting target event.

```ts
source.on('order:created', (order) => {
  target.emit('audit:entry', { id: order.id, kind: 'created' });
});
```

## Upgrade Checklist

- Replace retained event state with Ripple.
- Replace `removeAllListeners()` with signals or unsubscribe handles.
- Make middleware continuation synchronous and single-use.
- Check renamed pipe payload compatibility.
- Update import and type references removed in Herald 2.
