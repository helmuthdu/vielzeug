---
title: 'Routeit Examples — `using` — Explicit Resource Management'
description: '`using` — Explicit Resource Management examples for routeit.'
---

## `using` — Explicit Resource Management

## Problem

Implement `using` — explicit resource management in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Automatically clean up the router when leaving a scope:

```ts
async function renderPage() {
  using router = createRouter();
  router.on('/', () => renderHome()).start();

  await doWork();
  // router.dispose() is called automatically here
  // → subscribers cleared, popstate listener removed
}
```

::: tip
These are copy-paste ready recipes. See [Usage Guide](./usage.md) for detailed explanations and [API Reference](./api.md) for complete type signatures.
:::

[[toc]]

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Authentication](./authentication.md)
- [autoStart](./autostart.md)
- [Base Path Deployment](./base-path-deployment.md)
