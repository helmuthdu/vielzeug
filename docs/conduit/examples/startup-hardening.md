---
title: 'Conduit Examples — Startup Hardening'
description: 'Startup hardening example for @vielzeug/conduit — validate, freeze, and pre-warm the container.'
---

## Startup Hardening

### Problem

A production application registers many providers at boot. You want to:

1. Catch missing dependencies and circular references **before** any request is served.
2. **Lock** the container so no late registrations can silently slip in at runtime.
3. **Pre-warm** all singletons so `resolveSync()` is immediately available on hot paths.

### Solution

After all registrations are loaded, chain `validate()` → `freeze()` → `resolveAll()` once during the async startup phase.

```ts
import { createContainer, token, type ContainerModule } from '@vielzeug/conduit';

interface Config {
  dbUrl: string;
  port: number;
}
interface Logger {
  log(msg: string): void;
}
interface DbPool {
  query(sql: string): Promise<unknown[]>;
  end(): Promise<void>;
}

const Config = token<Config>('Config');
const Logger = token<Logger>('Logger');
const Db = token<DbPool>('Db');

const coreModule: ContainerModule = (c) => {
  c.value(Config, { dbUrl: process.env.DATABASE_URL!, port: 8080 });
  c.value(Logger, console);
};

const dbModule: ContainerModule = async (c) => {
  c.factory(
    Db,
    async (config, logger) => {
      logger.log(`connecting to ${config.dbUrl}`);
      const pool = await createPool(config.dbUrl);
      logger.log('database ready');
      return pool;
    },
    { deps: [Config, Logger], dispose: (pool) => pool.end() },
  );
};

async function bootstrap() {
  const container = createContainer({ name: 'app' });

  // 1. Load all modules
  await container.load(coreModule, dbModule);

  // 2. Detect cycles and missing providers before serving traffic
  container.validate();

  // 3. Lock — no further registrations allowed
  container.freeze();

  // 4. Pre-warm singletons so resolveSync() works everywhere
  await container.resolveAll();

  return container;
}

const container = await bootstrap();

// Hot path — no await, no Promise
const logger = container.resolveSync(Logger);
const config = container.resolveSync(Config);
logger.log(`server starting on port ${config.port}`);
```

### Pitfalls

- `validate()` only checks registrations that are already in the container. Call it **after** all modules are loaded.
- `freeze()` is **local** to the container it is called on. Child containers created after `freeze()` are not frozen and can still accept registrations.
- `resolveAll()` pre-warms only `'singleton'` factories. Factories with `'scoped'`, `'transient'`, or a `ScopeToken` lifetime are skipped and must be resolved from the appropriate container at runtime.
- Do not call `validate()` before `load()` — async modules may register providers that satisfy dependencies detected as missing during an early `validate()` call.

### Related

- [Async Providers](./async-providers.md)
- [Sync Resolution](./sync-resolution.md)
- [Dispose Lifecycle](./dispose-lifecycle.md)
