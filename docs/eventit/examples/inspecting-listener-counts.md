---
title: 'Eventit Examples — Inspecting listener counts'
description: 'Inspecting listener counts examples for eventit.'
---

## Inspecting listener counts

## Problem

Implement inspecting listener counts in a production-friendly way with `@vielzeug/eventit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/eventit` installed.

Useful for debugging, conditional logic, or test assertions:

```ts
const bus = createBus<AppEvents>();

const unsub1 = bus.on('user:login', handler1);
const unsub2 = bus.on('user:login', handler2);
bus.on('user:logout', handler3);

bus.listenerCount('user:login'); // 2
bus.listenerCount('user:logout'); // 1
bus.listenerCount(); // 3 — total across all events

unsub1();
bus.listenerCount('user:login'); // 1

bus.dispose();
bus.listenerCount(); // 0
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Custom error boundary](./custom-error-boundary.md)
- [Framework Integration](./framework-integration.md)
