---
title: 'Wireit Examples — Async Providers'
description: 'Async Providers examples for wireit.'
---

## Async Providers

## Problem

Implement async providers in a production-friendly way with `@vielzeug/wireit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/wireit` installed.

### Database connection

```ts
const DbToken = createToken<IDatabase>('Database');

container.factory(
  DbToken,
  async (config) => {
    const db = new PostgresClient({ connectionString: config.dbUrl });
    await db.connect();
    return db;
  },
  {
    deps: [ConfigToken],
    lifetime: 'singleton',
    dispose: (db) => db.end(),
  },
);

// Must use getAsync for async providers
const db = await container.getAsync(DbToken);
```

### await using (AsyncDisposable)

```ts
async function bootstrap() {
  await using container = createContainer();

  container.factory(
    DbToken,
    async () => {
      const db = new Database(env.DB_URL);
      await db.connect();
      return db;
    },
    { dispose: (db) => db.close() },
  );

  const app = container.get(AppToken);
  await app.start();
  // container.dispose() is called automatically when bootstrap() exits
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
- [Basic Setup](./basic-setup.md)
- [Batch Resolution](./batch-resolution.md)
