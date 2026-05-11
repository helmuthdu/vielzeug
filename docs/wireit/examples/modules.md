---
title: 'Wireit Examples — Modules'
description: 'Grouping and composing registrations with container modules.'
---

## Modules

Modules group related registrations into reusable, composable units. Use `defineModule` to create them and `container.load()` to apply them.

## Defining a module

```ts
import { createToken, defineModule } from '@vielzeug/wireit';

export const ConfigToken = createToken<AppConfig>('Config');
export const DbToken = createToken<IDatabase>('Database');

export const infraModule = defineModule((c) => {
  c.value(ConfigToken, {
    dbUrl: process.env.DB_URL!,
    apiKey: process.env.API_KEY!,
  });

  c.factory(DbToken, (cfg) => new Database(cfg.dbUrl), {
    deps: [ConfigToken],
    init: (db) => db.connect(),
    dispose: (db) => db.close(),
  });
});
```

## Loading modules

```ts
const container = createContainer();
await container.load(infraModule, appModule, featureModule);
```

`load()` runs modules in order and is async-safe — each module's async work is awaited before the next starts.

## Composing modules

```ts
const coreModule = defineModule(async (c) => {
  const config = await loadRemoteConfig();
  c.value(ConfigToken, config);
});

const dbModule = defineModule((c) => {
  c.factory(DbToken, (cfg) => new Database(cfg.dbUrl), {
    deps: [ConfigToken],
    init: (db) => db.connect(),
    dispose: (db) => db.close(),
  });
});

const loggerModule = defineModule((c) => {
  c.bind(LoggerToken, ConsoleLogger);
});

const serviceModule = defineModule((c) => {
  c.bind(UserServiceToken, UserService, { deps: [DbToken, LoggerToken] });
  c.bind(AuthServiceToken, AuthService, { deps: [DbToken] });
});

await container.load(coreModule, dbModule, loggerModule, serviceModule);
```

## Test modules

Modules make test setup composable — create a test module that overrides specific bindings:

```ts
import { createTestContainer } from '@vielzeug/wireit';

const testModule = defineModule((c) => {
  c.value(DbToken, createMockDb(), { overwrite: true });
  c.value(LoggerToken, silentLogger, { overwrite: true });
});

describe('UserService', () => {
  let container: Container;

  beforeEach(async () => {
    container = createTestContainer(appContainer);
    await container.load(testModule);
  });

  afterEach(() => container.dispose());

  it('creates a user', async () => {
    const svc = await container.resolve(UserServiceToken);
    await svc.createUser({ name: 'Alice' });
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
```

## Feature flags

```ts
const analyticsModule = defineModule((c) => {
  c.factory(AnalyticsToken, (cfg) => new Analytics(cfg.apiKey), {
    deps: [ConfigToken],
    dispose: (a) => a.flush(),
  });
});

const container = createContainer();
await container.load(infraModule);

if (process.env.ENABLE_ANALYTICS) {
  await container.load(analyticsModule);
}
```

## Related Recipes

- [Basic Setup](./basic-setup.md)
- [Lazy Dependencies](./lazy-deps.md)
- [Multi-Providers](./multi-providers.md)
- [Testing](./testing.md)
