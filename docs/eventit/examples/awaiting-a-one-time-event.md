---
title: 'Eventit Examples — Awaiting a one-time event'
description: 'Awaiting a one-time event examples for eventit.'
---

## Awaiting a one-time event

## Problem

Implement awaiting a one-time event in a production-friendly way with `@vielzeug/eventit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/eventit` installed.

Use `wait()` for async coordination between modules:

```ts
// Module A: waits for auth before doing work
async function loadDashboard() {
  const { userId } = await appBus.wait('user:login', AbortSignal.timeout(10_000));
  const data = await fetchDashboard(userId);
  renderDashboard(data);
}

// Module B: triggers the event independently
function onAuthSuccess(user: User) {
  appBus.emit('user:login', { userId: user.id, email: user.email });
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

- [Custom error boundary](./custom-error-boundary.md)
- [Framework Integration](./framework-integration.md)
- [Handling disposal in async code](./handling-disposal-in-async-code.md)
