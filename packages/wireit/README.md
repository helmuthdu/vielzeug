# @vielzeug/wireit

> Minimal async-first dependency injection container for TypeScript.

Wireit is a zero-dependency IoC container built around typed tokens and a small core API.

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

- `value(token, value, { multi? })`
- `factory(token, fn, { deps?, lifetime?, init?, dispose?, multi? })`
- `bind(token, cls, { deps?, lifetime?, init?, dispose?, multi? })`

### Resolution

- `resolve(token)`
- `resolveMany(token)`

### Lifecycle

- `createChild()`
- `dispose()`
- `disposed`

## Lifetimes

| Lifetime | Behavior |
| --- | --- |
| `singleton` (default) | One instance per container |
| `transient` | New instance for each resolution |
| `scoped` | One instance per child container |

## Multi-provider token

```ts
container.value(ValidatorToken, new EmailValidator(), { multi: true });
container.value(ValidatorToken, new PhoneValidator(), { multi: true });

const validators = await container.resolveMany(ValidatorToken);
```

## Async provider with init/dispose

```ts
container.factory(DbToken, () => new Database(process.env.DB_URL!), {
  init: (db) => db.connect(),
  dispose: (db) => db.close(),
});

const db = await container.resolve(DbToken);
```

## Exports

```ts
export {
  CircularDependencyError,
  Container,
  ContainerDisposedError,
  createContainer,
  createToken,
  MultipleProvidersError,
  ProviderNotFoundError,
} from '@vielzeug/wireit';

export type {
  ClassProvider,
  FactoryProvider,
  Lifetime,
  Provider,
  ProviderOptions,
  Token,
  ValueProvider,
} from '@vielzeug/wireit';
```
