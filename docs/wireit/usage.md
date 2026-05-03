---
title: Wireit Usage Guide
description: Practical usage for @vielzeug/wireit.
---

# Usage Guide

## Tokens

```ts
const ConfigToken = createToken<AppConfig>('Config');
const DbToken = createToken<IDatabase>('Database');
const ServiceToken = createToken<UserService>('UserService');
```

## Registration

```ts
container.value(ConfigToken, { dbUrl: 'postgres://...' });
container.factory(DbToken, (cfg) => new Database(cfg.dbUrl), { deps: [ConfigToken] });
container.bind(ServiceToken, UserService, { deps: [DbToken] });
```

Use `overwrite: true` for intentional replacement.

```ts
container.value(ConfigToken, nextConfig, { overwrite: true });
```

## Resolution

```ts
const service = await container.resolve(ServiceToken);
const [db, cfg] = await container.resolveAll([DbToken, ConfigToken]);
const maybeCache = await container.resolveOptional(CacheToken);
```

## Lifetimes

- `singleton`: one instance per container
- `transient`: new instance per resolution
- `scoped`: one instance per child container

```ts
container.factory(RequestIdToken, () => crypto.randomUUID(), { lifetime: 'transient' });
container.bind(RequestContextToken, RequestContext, { lifetime: 'scoped' });
```

## Child Containers

```ts
const child = container.createChild();
child.value(UserToken, req.user);

const handler = await child.resolve(RequestHandlerToken);
```

## Scoped Execution

```ts
await container.runInScope(async (scope) => {
  scope.value(RequestIdToken, crypto.randomUUID());
  const handler = await scope.resolve(RequestHandlerToken);
  await handler.handle();
});
```

## Async Providers

```ts
container.factory(DbToken, async () => {
  const db = new Database(process.env.DB_URL!);
  await db.connect();
  return db;
});

const db = await container.resolve(DbToken);
```

## Aliases

```ts
container.bind(ConsoleLoggerToken, ConsoleLogger);
container.alias(ILoggerToken, ConsoleLoggerToken);

const logger = await container.resolve(ILoggerToken);
```

## Testing

### Test container

```ts
const testContainer = createTestContainer(appContainer);
testContainer.value(DbToken, fakeDb, { overwrite: true });
afterEach(() => testContainer.dispose());
```

### Mock

```ts
await container.mock(DbToken, { useValue: fakeDb }, async () => {
  const service = await container.resolve(ServiceToken);
  await service.sync();
});
```

### Snapshot / restore

```ts
const snap = container.snapshot();
container.value(DbToken, fakeDb, { overwrite: true });
container.restore(snap);
```
