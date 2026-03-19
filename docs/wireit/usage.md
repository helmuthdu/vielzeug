---
title: Wireit — Usage Guide
description: Tokens, providers, lifetimes, async resolution, child containers, and testing for @vielzeug/wireit.
---

# Wireit Usage Guide

::: tip New to Wireit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Tokens

Every dependency is identified by a typed token — a branded symbol. The description is **required** and appears in error messages and `debug()` output.

```ts
import { createToken } from '@vielzeug/wireit';

const ConfigToken = createToken<AppConfig>('AppConfig');
const DbToken = createToken<IDatabase>('Database');
const LoggerToken = createToken<ILogger>('Logger');
const ServiceToken = createToken<UserService>('UserService');
```

Centralise token definitions in a dedicated file:

```ts
// tokens.ts
export const ConfigToken = createToken<AppConfig>('AppConfig');
export const DbToken = createToken<IDatabase>('Database');
export const LoggerToken = createToken<ILogger>('Logger');
export const ServiceToken = createToken<UserService>('UserService');
```

::: tip
Use interface types for tokens (`createToken<ILogger>`) so implementations are swappable without changing call sites.
:::

## Providers

### value()

Use `value()` for constants, configuration objects, and already-constructed instances:

```ts
container.value(ConfigToken, { apiUrl: 'https://api.example.com', timeout: 5000 });
container.value(LoggerToken, console);
```

### factory()

Use `factory()` for any function that creates an instance. Resolved deps are passed in order:

```ts
// Sync
container.factory(DbToken, (config) => new Database(config.apiUrl), {
  deps: [ConfigToken],
});

// Async — must be resolved via getAsync()
container.factory(
  DbToken,
  async (config) => {
    const db = new Database(config.apiUrl);
    await db.connect();
    return db;
  },
  { deps: [ConfigToken] },
);
```

### bind()

Use `bind()` to pair a class with a token. The container instantiates it with the resolved deps as constructor arguments:

```ts
class UserService {
  constructor(
    private db: IDatabase,
    private logger: ILogger,
  ) {}
}

container.bind(ServiceToken, UserService, {
  deps: [DbToken, LoggerToken],
  lifetime: 'singleton',
});
```

### register()

Use `register()` when you need the full provider object:

```ts
container.register(ServiceToken, {
  useClass: UserService,
  deps: [DbToken, LoggerToken],
  lifetime: 'transient',
});
```

### Re-registration guard

Re-registering an existing token throws by default. Pass `{ overwrite: true }` to replace it intentionally:

```ts
container.value(ConfigToken, defaultConfig);

// Throws — ConfigToken already registered
// container.value(ConfigToken, otherConfig);

// OK — explicit overwrite
container.value(ConfigToken, otherConfig, { overwrite: true });
```

### Dispose hooks

Class and factory providers accept an optional `dispose` callback invoked by `container.dispose()`:

```ts
container.factory(
  DbToken,
  async () => {
    const db = new Database(env.DB_URL);
    await db.connect();
    return db;
  },
  {
    dispose: async (db) => db.close(),
  },
);

await container.dispose(); // calls db.close(), then clears the container
```

`dispose()` is idempotent — calling it more than once is safe. The container also implements `[Symbol.asyncDispose]`:

```ts
{
  await using container = createContainer();
  container.bind(ServiceToken, MyService);
  const svc = container.get(ServiceToken);
  // container.dispose() is called automatically when the block exits
}
```

::: warning
`dispose` hooks are only invoked for `singleton` and `scoped` instances that were resolved at least once. `transient` instances are not cached, so their hooks are never called.
:::

## Lifetimes

| Lifetime    | Behaviour                                                                |
| ----------- | ------------------------------------------------------------------------ |
| `singleton` | One instance per container — created on first `get()`, cached thereafter |
| `transient` | New instance on every `get()` call                                       |
| `scoped`    | One instance per child container; behaves like singleton in the root     |

```ts
// Singleton (default)
container.bind(DbToken, Database, { deps: [ConfigToken] });

// Transient
container.factory(RequestIdToken, () => crypto.randomUUID(), { lifetime: 'transient' });

// Scoped — one per child container
container.bind(RequestContextToken, RequestContext, { lifetime: 'scoped' });
```

## Child Containers and Hierarchy

A child container inherits all registrations from its parent. Registrations in the child shadow the parent without modifying it:

```ts
const root = createContainer();
root.value(ConfigToken, globalConfig);
root.bind(LoggerToken, ConsoleLogger);

const child = root.createChild();
child.value(UserToken, currentUser); // local only

child.get(ConfigToken); // globalConfig — inherited from root
child.get(UserToken); // currentUser — local
root.get(UserToken); // throws ProviderNotFoundError — not in root
```

`scoped` providers resolve once per child — each `createChild()` call gets its own instance:

```ts
root.bind(RequestContextToken, RequestContext, { lifetime: 'scoped' });

const child1 = root.createChild();
const child2 = root.createChild();

child1.get(RequestContextToken) === child2.get(RequestContextToken); // false — separate instances
```

## Scoped Execution

`runInScope(fn)` creates a child container, passes it to your callback, then calls `dispose()` on it automatically — even if the callback throws:

```ts
await container.runInScope(async (scope) => {
  scope.value(RequestIdToken, crypto.randomUUID());
  scope.value(UserToken, req.user);

  const handler = scope.get(RequestHandlerToken);
  await handler.process(req);
});
// scope.dispose() is called here regardless of outcome
```

### Request-scoped web server (Express example)

```ts
app.use(async (req, _res, next) => {
  await container.runInScope(async (scope) => {
    scope.value(RequestToken, req);
    scope.value(UserToken, req.user);

    await scope.get(RequestHandlerToken).handle(req);
  });
  next();
});
```

## Aliases

Map one token to another — useful for interface-to-implementation bindings:

```ts
const ILoggerToken = createToken<ILogger>('ILogger');

container.bind(ConsoleLoggerToken, ConsoleLogger);
container.alias(ILoggerToken, ConsoleLoggerToken);

container.get(ILoggerToken) === container.get(ConsoleLoggerToken); // true
```

Alias chains are supported (`C → B → A` all resolve to `A`). Cycles throw `AliasCycleError` with the full path shown (`A → B → A`).

Aliases defined in parent containers are automatically visible to child containers. A child can also shadow a parent alias by defining its own mapping for the same token.

## Async Resolution

When a factory returns a `Promise`, use `getAsync()` to resolve it:

```ts
container.factory(DbToken, async () => {
  const db = new Database(env.DB_URL);
  await db.connect();
  return db;
});

// ✅
const db = await container.getAsync(DbToken);

// ❌ Throws AsyncProviderError
const db = container.get(DbToken);
```

Concurrent `getAsync()` calls for the same singleton share a single in-flight promise — the factory runs exactly once.

## Batch Resolution

Resolve multiple tokens at once with a fully typed tuple result:

```ts
const [db, config, logger] = container.getAll([DbToken, ConfigToken, LoggerToken]);

// Async
const [db, cache] = await container.getAllAsync([DbToken, CacheToken]);
```

The return type is inferred from the token tuple: `getAll([DbToken, ConfigToken])` returns `[IDatabase, AppConfig]`.

## Optional Resolution

Return `undefined` instead of throwing when a token is not registered:

```ts
const cache = container.getOptional(CacheToken);
if (cache) {
  await cache.set('session', data);
}

const analytics = await container.getOptionalAsync(AnalyticsToken);
```

## Snapshot / Restore

`snapshot()` captures the current local registrations, aliases, and cached instances. `restore(snap)` rolls back all changes:

```ts
const snap = container.snapshot();

container.value(LoggerToken, silentLogger, { overwrite: true });
// ... run some code ...

container.restore(snap); // LoggerToken is back to its original state
```

## Testing

### createTestContainer

`createTestContainer(base?)` returns `{ container, dispose }`. `container` is an isolated child container for test overrides — it inherits all registrations from `base`. Call `dispose()` in `afterEach` to tear it down without affecting the base container:

```ts
import { createTestContainer } from '@vielzeug/wireit';

describe('UserService', () => {
  let container: Container;
  let dispose: () => Promise<void>;

  beforeEach(() => {
    ({ container, dispose } = createTestContainer(appContainer));
    container.value(DbToken, mockDb, { overwrite: true });
  });

  afterEach(() => dispose());

  it('creates a user', async () => {
    const svc = container.get(ServiceToken);
    await svc.createUser({ name: 'Alice' });
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
```

### container.mock()

`mock()` snapshots the container, registers a temporary replacement, runs your callback, then restores the original — even if the callback throws:

```ts
it('handles database errors', async () => {
  const brokenDb = { insert: vi.fn().mockRejectedValue(new Error('DB down')) };

  await container.mock(DbToken, brokenDb, async () => {
    const svc = container.get(ServiceToken);
    await expect(svc.createUser(data)).rejects.toThrow('DB down');
  });

  // DbToken is fully restored — original db is back
});
```

The second argument accepts either a plain value (wrapped in `{ useValue }`) or a full `Provider<T>`:

```ts
await container.mock(DbToken, { useFactory: () => createInMemoryDb() }, async () => {
  /* ... */
});
```

### Manual snapshot/restore

```ts
it('tests with custom logger', () => {
  const snap = container.snapshot();
  container.value(LoggerToken, { info: vi.fn(), error: vi.fn() }, { overwrite: true });

  const svc = container.get(ServiceToken);
  // assertions...

  container.restore(snap);
});
```

### Debug

`debug()` returns a snapshot of all tokens and aliases visible from the container, walking the full parent chain (child-wins):

```ts
const { tokens, aliases } = container.debug();
console.log(tokens); // ['AppConfig', 'Database', 'Logger', 'UserService']
console.log(aliases); // [['ILogger', 'Logger']]
```
