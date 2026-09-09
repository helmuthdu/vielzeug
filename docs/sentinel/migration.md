---
title: Sentinel 3.0 Migration
description: Migrate Sentinel reads to the standard external-store snapshot contract.
---

# Sentinel 3.0 Migration

Sentinel 3.0 replaces signal-shaped reads with the standard `getSnapshot()` and `subscribe()` external-store contract.

## Replace `value` and `peek()`

Use `getSnapshot()` for both initial reads and reads inside subscription listeners.

```ts
import { createViewport } from '@vielzeug/sentinel';

// Before
const viewport = createViewport();
console.log(viewport.value.width);
console.log(viewport.peek().height);

// After
const viewport = createViewport();
console.log(viewport.getSnapshot().width);
console.log(viewport.getSnapshot().height);
```

## Bridge Sentinel into Ripple explicitly

Sentinel no longer behaves like a Ripple signal. Use `fromSubscribable()` when a reactive graph should track it.

```ts
import { computed, fromSubscribable } from '@vielzeug/ripple';
import { createViewport } from '@vielzeug/sentinel';

// Before
const viewport = createViewport();
const compact = computed(() => viewport.value.width < 640);

// After
const viewport = createViewport();
const viewportState = fromSubscribable(viewport, { signal: viewport.disposalSignal });
const compact = computed(() => viewportState.value.width < 640);
```

The bridge unsubscribes when the Sentinel is disposed. Dispose any watchers or computed scopes owned by your application separately.

## Remove runtime injection

`SentinelOptions.runtime` is removed. Sentinel owns a plain snapshot and subscription set; reactive runtime ownership belongs to the bridge created by the consumer.
