---
title: 'Eventit Examples — Handling disposal in async code'
description: 'Handling disposal in async code examples for eventit.'
---

## Handling disposal in async code

## Problem

Implement handling disposal in async code in a production-friendly way with `@vielzeug/eventit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/eventit` installed.

Use `BusDisposedError` for `instanceof` checks instead of string matching:

```ts
import { BusDisposedError } from '@vielzeug/eventit';

async function waitForLogin(bus: Bus<AppEvents>) {
  try {
    const { userId } = await bus.wait('user:login', AbortSignal.timeout(10_000));
    return userId;
  } catch (err) {
    if (err instanceof BusDisposedError) return null; // bus torn down — graceful exit
    throw err; // timeout or unexpected error — propagate
  }
}
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
