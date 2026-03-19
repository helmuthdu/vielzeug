---
title: 'Eventit Examples — Standalone entry'
description: 'Standalone entry examples for eventit.'
---

## Standalone entry

## Problem

Implement standalone entry in a production-friendly way with `@vielzeug/eventit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/eventit` installed.

When you need the standalone bundle export, import from `@vielzeug/eventit/core`:

```ts
import { createBus } from '@vielzeug/eventit/core';

type WorkerEvents = {
  message: { id: string; body: string };
  stop: void;
};

const bus = createBus<WorkerEvents>();
bus.on('message', (payload) => console.log(payload.body));
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
