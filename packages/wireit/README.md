# @vielzeug/wireit

> Lightweight async-first dependency injection container for TypeScript.

Wireit is a zero-dependency IoC container built around typed tokens.

## Installation

```sh
pnpm add @vielzeug/wireit
# npm install @vielzeug/wireit
# yarn add @vielzeug/wireit
```

## Quick Start

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

const ConfigToken = createToken<{ dbUrl: string }>('Config');
const DbToken = createToken<Database>('Database');
const ServiceToken = createToken<UserService>('UserService');

const container = createContainer();

container
  .value(ConfigToken, { dbUrl: process.env.DB_URL! })
  .factory(DbToken, (config) => new Database(config.dbUrl), { deps: [ConfigToken] })
  .bind(ServiceToken, UserService, { deps: [DbToken] });

const service = await container.resolve(ServiceToken);
```

## Core API

### Registration

- `value(token, value, opts?)`
- `factory(token, fn, opts?)`
- `bind(token, cls, opts?)`
- `alias(token, source)`
- `unregister(token)`
- `clear()`

### Resolution (async-first)

- `resolve(token)`
- `resolveAll(tokens)`
- `resolveOptional(token)`
- `has(token)`

### Lifecycle

- `createChild()`
- `runInScope(fn)`
- `dispose()`
- `disposed`

### Testing

- `createTestContainer(base?)` returns a child container
- `mock(token, provider, fn)`
- `snapshot()` / `restore(snapshot)`
- `debug()`

## Lifetimes

| Lifetime | Behavior |
| --- | --- |
| `singleton` (default) | One instance per container |
| `transient` | New instance for each resolution |
| `scoped` | One instance per child container |

## Examples

### Async provider

```ts
container.factory(DbToken, async () => {
  const db = new Database(process.env.DB_URL!);
  await db.connect();
  return db;
});

const db = await container.resolve(DbToken);
```

### Scoped execution

```ts
await container.runInScope(async (scope) => {
  scope.value(RequestIdToken, crypto.randomUUID());
  const handler = await scope.resolve(RequestHandlerToken);
  await handler.handle();
});
```

### Temporary mock

```ts
await container.mock(DbToken, { useValue: fakeDb }, async () => {
  const service = await container.resolve(ServiceToken);
  await service.sync();
});
```

## Exports

```ts
export {
  AliasCycleError,
  CircularDependencyError,
  Container,
  ContainerDisposedError,
  createContainer,
  createTestContainer,
  createToken,
  ProviderNotFoundError,
} from '@vielzeug/wireit';

export type {
  ClassProvider,
  FactoryProvider,
  Lifetime,
  Provider,
  ProviderOptions,
  Snapshot,
  Token,
  TokenValues,
  ValueProvider,
} from '@vielzeug/wireit';
```
