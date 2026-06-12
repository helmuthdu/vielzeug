---
title: 'Herald Examples — Bus bridging with `pipeEvents()`'
description: 'Bus bridging with `pipeEvents()` example for @vielzeug/herald.'
---

## Bus bridging with `pipeEvents()`

### Problem

You have two buses — for example an application bus and an audit bus — and you want selected events from the source to appear on the target automatically, without manually re-emitting them in every subscriber.

### Solution

Use `pipeEvents()` to forward a named subset of events. The pipe tears down automatically when the target bus is disposed.

```ts
import { createBus, pipeEvents } from '@vielzeug/herald';

type AppEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': void;
  'cart:updated': { items: CartItem[]; total: number };
};

const appBus = createBus<AppEvents>();
const auditBus = createBus<AppEvents>();

// Forward only auth events — cart events stay local to appBus
const unpipe = pipeEvents(appBus, auditBus, ['user:login', 'user:logout']);

appBus.emit('user:login', { email: 'alice@example.com', userId: '42' });
// auditBus listeners for 'user:login' also fire

// Stop forwarding manually
unpipe();
```

### Scoping a pipe to a signal

Pass an `AbortSignal` to stop forwarding after a condition:

```ts
const controller = new AbortController();
pipeEvents(appBus, auditBus, ['user:login'], controller.signal);

// Stop forwarding after 60 seconds
setTimeout(() => controller.abort(), 60_000);
```

### Automatic teardown on target disposal

The pipe unsubscribes from the source automatically when the target bus is disposed. No cleanup code needed on the calling side:

```ts
using auditBus = createBus<AppEvents>(); // disposed at end of block

pipeEvents(appBus, auditBus, ['user:login', 'user:logout']);

// ... do work ...
// When auditBus disposes, forwarding stops automatically
```

### Tying child bus lifetime to a parent

Use `bus.disposalSignal` to scope a child bus's lifetime to its parent:

```ts
const parentBus = createBus<AppEvents>();
const childBus = createBus<AppEvents>();

// Forward events; stop when parent disposes
pipeEvents(parentBus, childBus, ['user:login'], parentBus.disposalSignal);
```

### Pitfalls

- Source and target buses may have **different event map types** — TypeScript enforces that the listed keys exist in both with compatible payload types, but the buses themselves do not need to share the same type.
- `pipeEvents` only forwards events listed in the third argument. Events not listed on the source are not forwarded, even if the target has listeners for them.
- The returned `unpipe()` function is idempotent — calling it after the target has already disposed is safe and does nothing.
- A pipe does not buffer events. If the target bus processes events slower than the source emits, consider using `bus.events()` with a `maxBuffer` option instead.

### Related

- [Module-level bus](./module-level-bus.md)
- [Handling disposal in async code](./handling-disposal-in-async-code.md)
- [Disposal Signal — Usage Guide](../usage.md#dispose--cleanup)
