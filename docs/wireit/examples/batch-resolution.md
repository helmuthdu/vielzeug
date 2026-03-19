---
title: 'Wireit Examples — Batch Resolution'
description: 'Batch Resolution examples for wireit.'
---

## Batch Resolution

## Problem

Implement batch resolution in a production-friendly way with `@vielzeug/wireit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/wireit` installed.

### Resolve multiple dependencies at once

```ts
const [db, config, logger] = container.getAll([DbToken, ConfigToken, LoggerToken]);
// Types: [IDatabase, AppConfig, ILogger]

// Async version
const [db, cache] = await container.getAllAsync([DbToken, CacheToken]);
```

### Bootstrap function

```ts
async function bootstrap() {
  const container = createContainer();
  // ... register all providers ...

  const [db, cache, queue] = await container.getAllAsync([DbToken, CacheToken, QueueToken]);

  await Promise.all([db.migrate(), cache.warm(), queue.start()]);

  return container.get(AppToken);
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

- [Aliases](./aliases.md)
- [Async Providers](./async-providers.md)
- [Basic Setup](./basic-setup.md)
