---
title: 'Wireit Examples — Dispose Lifecycle'
description: 'Dispose Lifecycle examples for wireit.'
---

## Dispose Lifecycle

## Problem

Implement dispose lifecycle in a production-friendly way with `@vielzeug/wireit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/wireit` installed.

### Clean shutdown with init and dispose

Use `init` for async setup and `dispose` for cleanup — the container calls both at the right time:

```ts
const container = createContainer();

container
  .factory(DbToken, () => new Database(env.DB_URL), {
    init: (db) => db.connect(),
    dispose: (db) => db.close(),
  })
  .factory(CacheToken, () => new RedisCache(env.REDIS_URL), {
    dispose: (cache) => cache.quit(),
  })
  .factory(QueueToken, () => new JobQueue(), {
    dispose: (q) => q.drain(),
  });

// All dispose hooks run in parallel; if any fail, an AggregateError is thrown.
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  try {
    await container.dispose();
  } catch (err) {
    if (err instanceof AggregateError) {
      console.error('Some dispose hooks failed:', err.errors);
    }
    throw err;
  }
  process.exit(0);
});
```

### Check disposed state

```ts
const container = createContainer();
container.value(ConfigToken, config);

console.log(container.disposed); // false

await container.dispose();

console.log(container.disposed); // true
// await container.resolve(ConfigToken) — throws ContainerDisposedError
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Async Providers](./async-providers.md)
- [Basic Setup](./basic-setup.md)
