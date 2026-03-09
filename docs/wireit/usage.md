---
title: Wireit — Usage Guide
description: Tokens, lifetimes, async providers, and child containers for Wireit.
---

# Wireit Usage Guide

::: tip New to Wireit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Why Wireit?

Dependency injection decouples your code from its dependencies, making testing and composition easier — without the decorator/reflect-metadata ceremony of NestJS or InversifyJS.

```ts
// Before — manual instantiation
const db = new Database(process.env.DB_URL!);
const repo = new UserRepository(db);
const svc = new UserService(repo);

// After — Wireit container
const c = createContainer();
c.register(DbToken,   { useFactory: () => new Database(process.env.DB_URL!), lifetime: 'singleton' });
c.register(RepoToken, { useClass: UserRepository, deps: [DbToken] });
c.register(SvcToken,  { useClass: UserService,    deps: [RepoToken] });
```

| Feature | Wireit | InversifyJS | tsyringe |
|---|---|---|---|
| Decorators required | ❌ | ✅ | ✅ |
| reflect-metadata | ❌ | ✅ | ✅ |
| Async providers | ✅ | ✅ | ✅ |
| Child containers | ✅ | ✅ | ✅ |
| Snapshot/restore | ✅ | ❌ | ❌ |
| Zero dependencies | ✅ | ❌ | ❌ |


## Import

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

// Types only
import type { Container, Token, Provider, Lifetime, Snapshot } from '@vielzeug/wireit';
```

## Tokens

Tokens are typed symbols that uniquely identify dependencies in the container.

### Creating Tokens

```ts
const LoggerToken = createToken<ILogger>('Logger');
const ConfigToken = createToken<AppConfig>('Config');
const DbToken     = createToken<IDatabase>('Database');
```

### Token best practices

```ts
// ✅ Use descriptive names — shown in error messages and debug()
const UserRepositoryToken = createToken<IUserRepository>('UserRepository');

// ✅ Use interfaces so implementations are swappable
interface ILogger { info(msg: string): void; error(msg: string): void }
const LoggerToken = createToken<ILogger>('Logger');

// ❌ Avoid coupling to concrete classes
const ConsoleLoggerToken = createToken<ConsoleLogger>('Logger');
```

Centralise token definitions in a dedicated file:

```ts
// tokens.ts
export const ConfigToken   = createToken<AppConfig>('Config');
export const LoggerToken   = createToken<ILogger>('Logger');
export const DbToken       = createToken<IDatabase>('Database');
export const UserRepoToken = createToken<IUserRepository>('UserRepository');
```

## Providers

Wireit supports three provider shapes for different scenarios.

### Value provider

Register an existing instance or plain value:

```ts
container.registerValue(ConfigToken, { port: 3000, dbUrl: process.env.DB_URL! });

// or equivalently
container.register(ConfigToken, { useValue: { port: 3000, dbUrl: '...' } });
```

### Class provider

Register a class to be instantiated by the container. `deps` lists the tokens whose resolved values are passed as constructor arguments in order.

```ts
class UserService {
  constructor(
    private db: IDatabase,
    private logger: ILogger,
  ) {}
}

container.register(UserServiceToken, {
  useClass: UserService,
  deps: [DbToken, LoggerToken],
  lifetime: 'singleton', // default
});
```

### Factory provider

Register a factory function for custom creation logic. The resolved values of `deps` are passed as arguments.

```ts
// Sync factory
container.register(LoggerToken, {
  useFactory: (config: AppConfig) => new ConsoleLogger(config.logLevel),
  deps: [ConfigToken],
});

// Async factory — must be resolved via getAsync()
container.register(DbToken, {
  useFactory: async (config: AppConfig) => {
    const db = new PrismaClient({ datasourceUrl: config.dbUrl });
    await db.$connect();
    return db;
  },
  deps: [ConfigToken],
  lifetime: 'singleton',
});
```

## Lifetimes

Control when and how often instances are created.

### Singleton

Created once and reused across all resolutions (default for classes):

```ts
let instanceCount = 0;

class Database {
  constructor() {
    instanceCount++;
  }
}

container.register(Database, {
  useClass: Database,
  lifetime: 'singleton',
});

const db1 = container.get(Database);
const db2 = container.get(Database);

console.log(instanceCount); // 1
console.log(db1 === db2); // true
```

### Transient

New instance on every `get()` call.

```ts
let instanceCount = 0;

container.register(RequestIdToken, {
  useFactory: () => {
    instanceCount++;
    return generateId();
  },
  lifetime: 'transient',
});

const id1 = container.get(RequestIdToken);
const id2 = container.get(RequestIdToken);

console.log(instanceCount); // 2
console.log(id1 === id2); // false
```

### Scoped

Created once per scope (useful for request-scoped dependencies):

```ts
container.register(RequestContext, {
  useClass: Context,
  lifetime: 'scoped',
});

// In root container, acts like singleton
const ctx1 = container.get(RequestContext);
const ctx2 = container.get(RequestContext);
console.log(ctx1 === ctx2); // true

// In child container, new instance per child
const child1 = container.createChild();
const child2 = container.createChild();

const ctx3 = child1.get(RequestContext);
const ctx4 = child2.get(RequestContext);
console.log(ctx3 === ctx4); // false
```

## Container Management

### Checking Registration

```ts
const Logger = createToken<ILogger>('Logger');

console.log(container.has(Logger)); // false

container.registerValue(Logger, new ConsoleLogger());

console.log(container.has(Logger)); // true
```

### Unregistering

```ts
container.register(Logger, { useClass: ConsoleLogger });
container.unregister(Logger);

console.log(container.has(Logger)); // false
```

### Clearing Container

```ts
container.registerValue(Config, config);
container.registerValue(Logger, logger);

container.clear(); // Removes all registrations

console.log(container.has(Config)); // false
console.log(container.has(Logger)); // false
```

### Debug

```ts
const info = container.debug();
console.log(info.tokens);  // ['Config', 'Logger', 'Database']
console.log(info.aliases); // [['ILogger', 'Logger']]
```

## Aliases

Redirect a token to an existing registration. Useful for mapping interface tokens to implementation tokens.

```ts
const ILoggerToken    = createToken<ILogger>('ILogger');
const LoggerImplToken = createToken<ConsoleLogger>('LoggerImpl');

container.register(LoggerImplToken, { useClass: ConsoleLogger });

// ILoggerToken → LoggerImplToken
container.alias(ILoggerToken, LoggerImplToken);

container.get(ILoggerToken) === container.get(LoggerImplToken); // true
```

### Alias chains

Chains are supported. `C → B → A` all resolve to `A`'s value.

```ts
container.registerValue(TokenA, 'value');
container.alias(TokenB, TokenA);
container.alias(TokenC, TokenB);

container.get(TokenC); // 'value'
```

Cycle detection throws a generic `Error` with message `"Alias cycle detected for token: X"`.

## Child Containers & Hierarchy

### createChild()

A child container inherits all registrations from its parent. Local registrations in the child shadow the parent without modifying it.

```ts
const parent = createContainer();
parent.registerValue(ConfigToken, globalConfig);
parent.register(LoggerToken, { useClass: ConsoleLogger });

const child = parent.createChild();
child.registerValue(UserToken, currentUser);

child.get(ConfigToken); // globalConfig — inherited
child.get(UserToken);   // currentUser — local

parent.get(UserToken);  // throws ProviderNotFoundError
```

`'scoped'` providers resolve once per child — each call to `createChild()` gets its own fresh instance.

### runInScope()

Creates a temporary child, passes it to `fn`, then `clear()`s it in a `finally` block.

```ts
await container.runInScope(async (scope) => {
  scope.registerValue(RequestIdToken, crypto.randomUUID());
  scope.registerValue(UserToken, req.user);
  return scope.get(RequestHandlerToken).handle(req.body);
});
// scope is cleared here regardless of success or failure
```

### Request-scoped web server

```ts
app.use(async (req, res, next) => {
  await container.runInScope(async (scope) => {
    scope.registerValue(RequestToken, req);
    scope.registerValue(ResponseToken, res);
    scope.registerValue(UserToken, req.user);

    const handler = scope.get(RequestHandlerToken);
    await handler.handle();
  });
});
```

## Async Resolution

For providers with async initialization:

```ts
container.register(DbToken, {
  useFactory: async (config) => {
    const db = new PrismaClient();
    await db.$connect();
    return db;
  },
  deps: [ConfigToken],
  lifetime: 'singleton',
});

// Must use getAsync
const db = await container.getAsync(DbToken);

// ❌ This will throw AsyncProviderError
// const db = container.get(DbToken);
```

## Optional Resolution

Handle missing dependencies gracefully:

```ts
// Returns undefined if not registered
const cache = container.getOptional(CacheToken);
if (cache) {
  await cache.set('key', value);
}

// Async version
const db = await container.getOptionalAsync(DbToken);
```

## Snapshot / Restore

`snapshot()` deep-copies the registry including any cached singleton instances. Pass the snapshot to `restore()` to roll back all changes.

```ts
const snap = container.snapshot();

container.registerValue(LoggerToken, mockLogger);
// ... do things ...

container.restore(snap); // LoggerToken is back to its original state
```

This is the mechanism used internally by `withMock()`.

## Testing

### Isolated containers with createTestContainer

`createTestContainer(base?)` creates a child of `base` (or a fresh root) and returns `{ container, dispose }`. Call `dispose()` in `afterEach` to prevent state leaking between tests.

```ts
import { createTestContainer } from '@vielzeug/wireit';

describe('UserService', () => {
  let container: Container;
  let dispose: () => void;

  beforeEach(() => {
    ({ container, dispose } = createTestContainer(appContainer));
    container.registerValue(DbToken, mockDb);
  });

  afterEach(() => dispose());

  it('creates a user', async () => {
    const svc = container.get(UserServiceToken);
    await svc.createUser({ name: 'Alice' });
    expect(mockDb.users.create).toHaveBeenCalled();
  });
});
```

### Scoped mock overrides with withMock

`withMock` snapshots the container, registers a mock, runs `fn`, then restores the original state — even if `fn` throws.

```ts
import { withMock } from '@vielzeug/wireit';

it('handles database error', async () => {
  const failingDb = {
    users: { create: vi.fn().mockRejectedValue(new Error('DB Error')) },
  };

  await withMock(container, DbToken, failingDb, async () => {
    const svc = container.get(UserServiceToken);
    await expect(svc.createUser(data)).rejects.toThrow('DB Error');
  });

  // DbToken is restored; original db is back
});
```

### Manual snapshot/restore

```ts
it('tests with custom logger', () => {
  const snap = container.snapshot();
  container.registerValue(LoggerToken, { info: vi.fn(), error: vi.fn() });

  const svc = container.get(UserServiceToken);
  // assertions ...

  container.restore(snap);
});
```

## Best Practices

### Do

- **Use interfaces** for token types to keep implementations swappable.
- **Use descriptive token names** — they appear in error messages and `debug()`.
- **Register singletons** for expensive resources (DB connections, HTTP clients).
- **Use scoped lifetimes** for request-specific objects.
- **Centralise token definitions** in a `tokens.ts` file.
- **Use `createTestContainer`** in tests for automatic cleanup.

### Don't

- **Don't create circular dependencies** — refactor your design instead.
- **Don't call `get()` on async providers** — use `getAsync()`.
- **Don't mutate the container during resolution** — register everything upfront.
- **Don't use `any` token types** — leverage TypeScript type inference.

### Code organisation

```ts
// tokens.ts
export const DbToken       = createToken<IDatabase>('Database');
export const LoggerToken   = createToken<ILogger>('Logger');
export const UserSvcToken  = createToken<IUserService>('UserService');

// container.ts
import * as T from './tokens';

export const container = createContainer();

container
  .register(T.DbToken,      { useClass: PrismaDatabase })
  .register(T.LoggerToken,  { useClass: ConsoleLogger })
  .register(T.UserSvcToken, { useClass: UserService, deps: [T.DbToken, T.LoggerToken] });

// app.ts
import { container } from './container';
import { UserSvcToken } from './tokens';

const svc = container.get(UserSvcToken);
```

## Next Steps

- [API Reference](./api.md) — complete type signatures
- [Examples](./examples.md) — practical code examples
