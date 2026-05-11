---
title: 'Wireit Examples — Basic Setup'
description: 'Basic Setup examples for wireit.'
---

## Basic Setup

## Problem

Implement basic setup in a production-friendly way with `@vielzeug/wireit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/wireit` installed.

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

const service = await container.resolve(ServiceToken);
```

### Organizing registration by plain functions

For larger apps, compose plain setup functions instead of module abstractions:

```ts
function registerInfra(c: ReturnType<typeof createContainer>) {
  c.value(ConfigToken, { apiUrl: process.env.API_URL!, timeout: 5000 });
  c.factory(DbToken, (cfg) => new Database(cfg.apiUrl), {
    deps: [ConfigToken],
    init: (db) => db.connect(),
    dispose: (db) => db.close(),
  });
}

function registerApp(c: ReturnType<typeof createContainer>) {
  c.bind(ServiceToken, UserService, { deps: [DbToken, LoggerToken] });
}

const container = createContainer();
registerInfra(container);
registerApp(container);

const service = await container.resolve(ServiceToken);
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
- [Child Containers](./child-containers.md)
- [Lifetimes](./lifetimes.md)
