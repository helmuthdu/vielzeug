---
title: Wireit — Examples
description: Real-world dependency injection patterns with @vielzeug/wireit.
---

# Wireit Examples

::: tip
These are copy-paste ready recipes. See the [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

## Basic Setup

### Create tokens and a container

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

// tokens.ts
const ConfigToken = createToken<AppConfig>('AppConfig');
const DbToken = createToken<IDatabase>('Database');
const LoggerToken = createToken<ILogger>('Logger');
const ServiceToken = createToken<UserService>('UserService');

// container.ts
const container = createContainer();

container
  .value(ConfigToken, { apiUrl: process.env.API_URL!, timeout: 5000 })
  .factory(DbToken, (config) => new Database(config.apiUrl), { deps: [ConfigToken] })
  .bind(ServiceToken, UserService, { deps: [DbToken, LoggerToken] });
```

## Lifetimes

### Singleton (default)

```ts
const CacheToken = createToken<Cache>('Cache');

container.factory(CacheToken, () => new LRUCache({ max: 500 }));

const a = container.get(CacheToken);
const b = container.get(CacheToken);
console.log(a === b); // true — same instance
```

### Transient

```ts
const RequestIdToken = createToken<string>('RequestId');

container.factory(RequestIdToken, () => crypto.randomUUID(), { lifetime: 'transient' });

const id1 = container.get(RequestIdToken);
const id2 = container.get(RequestIdToken);
console.log(id1 === id2); // false — new UUID each time
```

### Scoped

```ts
const RequestContextToken = createToken<RequestContext>('RequestContext');

container.bind(RequestContextToken, RequestContext, { lifetime: 'scoped' });

const child1 = container.createChild();
const child2 = container.createChild();

console.log(child1.get(RequestContextToken) === child2.get(RequestContextToken)); // false
```

## Async Providers

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

## Child Containers

### Per-request scoping

```ts
const RequestToken = createToken<Request>('Request');
const UserToken = createToken<User>('User');
const HandlerToken = createToken<RequestHandler>('RequestHandler');

// Root — shared across all requests
container.bind(HandlerToken, RequestHandler, { deps: [DbToken, UserToken] });

// Express middleware
app.use(async (req, _res, next) => {
  await container.runInScope(async (scope) => {
    scope.value(RequestToken, req);
    scope.value(UserToken, await authenticateRequest(req));

    await scope.get(HandlerToken).handle(req);
  });
  next();
});
```

### Tenant isolation

```ts
async function handleTenantRequest(tenantId: string, action: () => Promise<void>) {
  await container.runInScope(async (scope) => {
    const tenantConfig = await loadTenantConfig(tenantId);
    scope.value(TenantConfigToken, tenantConfig);
    scope.factory(DbToken, (cfg) => new Database(cfg.connectionString), {
      deps: [TenantConfigToken],
      overwrite: true,
    });
    await action();
  });
}
```

## Aliases

### Interface to implementation

```ts
const ILoggerToken = createToken<ILogger>('ILogger');
const ConsoleLoggerToken = createToken<ConsoleLogger>('ConsoleLogger');

container.bind(ConsoleLoggerToken, ConsoleLogger);
container.alias(ILoggerToken, ConsoleLoggerToken);

// Both resolve to the same ConsoleLogger instance
const logger = container.get(ILoggerToken);
```

### Swapping implementations

```ts
if (process.env.NODE_ENV === 'production') {
  container.bind(LoggerToken, CloudLogger, { deps: [ConfigToken] });
} else {
  container.bind(LoggerToken, ConsoleLogger);
}

container.alias(ILoggerToken, LoggerToken);
```

### Alias chains

```ts
container.value(BaseConfigToken, { timeout: 5000 });
container.alias(AppConfigToken, BaseConfigToken);
container.alias(ServiceConfigToken, AppConfigToken);

// All three resolve to { timeout: 5000 }
container.get(ServiceConfigToken);
```

## Batch Resolution

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

## Testing

### Unit test with createTestContainer

```ts
import { createTestContainer } from '@vielzeug/wireit';

describe('UserService', () => {
  let container: Container;
  let dispose: () => Promise<void>;
  const mockDb = {
    users: {
      findById: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    ({ container, dispose } = createTestContainer(appContainer));
    container.value(DbToken, mockDb, { overwrite: true });
  });

  afterEach(() => dispose());

  it('returns a user by id', async () => {
    mockDb.users.findById.mockResolvedValue({ id: '1', name: 'Alice' });

    const svc = container.get(ServiceToken);
    const user = await svc.getById('1');

    expect(user.name).toBe('Alice');
    expect(mockDb.users.findById).toHaveBeenCalledWith('1');
  });

  it('throws when user not found', async () => {
    mockDb.users.findById.mockResolvedValue(null);

    const svc = container.get(ServiceToken);
    await expect(svc.getById('unknown')).rejects.toThrow('User not found');
  });
});
```

### Temporary mock with container.mock()

```ts
it('falls back to cache on DB error', async () => {
  const brokenDb = {
    users: { findById: vi.fn().mockRejectedValue(new Error('DB connection lost')) },
  };

  const result = await container.mock(DbToken, brokenDb, async () => {
    const svc = container.get(ServiceToken);
    return svc.getById('1'); // should return cached value
  });

  expect(result).toBeDefined(); // returned from cache
  // DbToken is fully restored after mock()
});
```

### Testing async providers

```ts
it('connects to the database on first get', async () => {
  const mockConnect = vi.fn().mockResolvedValue(undefined);
  const fakeDb = { connect: mockConnect, query: vi.fn() };

  await container.mock(
    DbToken,
    {
      useFactory: async () => {
        await fakeDb.connect();
        return fakeDb;
      },
    },
    async () => {
      const db = await container.getAsync(DbToken);
      expect(mockConnect).toHaveBeenCalledOnce();
    },
  );
});
```

## Dispose Lifecycle

### Clean shutdown

```ts
const container = createContainer();

container
  .factory(
    DbToken,
    async () => {
      const db = new Database(env.DB_URL);
      await db.connect();
      return db;
    },
    { dispose: (db) => db.close() },
  )
  .factory(CacheToken, () => new RedisCache(env.REDIS_URL), {
    dispose: (cache) => cache.quit(),
  })
  .factory(QueueToken, () => new JobQueue(), {
    dispose: (q) => q.drain(),
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await container.dispose(); // runs all dispose hooks in registration order
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
// container.get(ConfigToken) — throws ContainerDisposedError
```

## Debug

### Inspect all registered tokens

```ts
const container = createContainer();
container.value(ConfigToken, config);
container.bind(ServiceToken, UserService, { deps: [DbToken] });
container.alias(IUserServiceToken, ServiceToken);

const { tokens, aliases } = container.debug();
console.log(tokens); // ['AppConfig', 'UserService']
console.log(aliases); // [['IUserService', 'UserService']]
```

### Debugging parent chain

```ts
const root = createContainer();
root.value(ConfigToken, config);
root.bind(LoggerToken, ConsoleLogger);

const child = root.createChild();
child.bind(ServiceToken, UserService, { deps: [LoggerToken] });

// debug() on child walks the full hierarchy
const { tokens } = child.debug();
console.log(tokens); // ['UserService', 'AppConfig', 'Logger'] (child first)
```
