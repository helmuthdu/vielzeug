# @vielzeug/wireit

> Lightweight dependency injection container for TypeScript with typed tokens, lifetimes, and test utilities

[![npm version](https://img.shields.io/npm/v/@vielzeug/wireit)](https://www.npmjs.com/package/@vielzeug/wireit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Wireit** is a zero-dependency IoC container that uses typed tokens to register and resolve dependencies — with singleton/transient/scoped lifetimes, async providers, child containers, and first-class test helpers.

## Installation

```sh
pnpm add @vielzeug/wireit
# npm install @vielzeug/wireit
# yarn add @vielzeug/wireit
```

## Quick Start

```typescript
import { createContainer, createToken } from '@vielzeug/wireit';

interface ILogger { log(msg: string): void }
interface IUserRepo { findById(id: string): Promise<User> }

const LoggerToken  = createToken<ILogger>('Logger');
const UserRepoToken = createToken<IUserRepo>('UserRepo');

const container = createContainer();

container.registerValue(LoggerToken, { log: (msg) => console.log(msg) });
container.register(UserRepoToken, { useClass: SqlUserRepo, deps: [LoggerToken] });

const repo = container.get(UserRepoToken);
await repo.findById('123');
```

## Features

- **Typed tokens** — `createToken<T>(name)` ties a TypeScript type to the token at compile time
- **Three provider kinds** — `useValue`, `useClass`, `useFactory` (sync or async)
- **Lifetimes** — `'singleton'` (default), `'transient'`, `'scoped'` per registration
- **Child containers** — `createChild()` inherits parent registrations; scoped deps get one instance per child
- **Scoped execution** — `runInScope(fn)` creates a child container, runs `fn`, then clears it
- **Aliases** — `alias(token, source)` redirects one token to another, with chain and cycle detection
- **Async providers** — `useFactory` may return a `Promise`; resolve with `getAsync()`
- **Test utilities** — `createTestContainer` and `withMock` for isolated, auto-cleanup test setups
- **Snapshot/restore** — `snapshot()` / `restore()` for rollback in tests
- **Zero runtime dependencies**

## Usage

### Tokens

```typescript
import { createToken } from '@vielzeug/wireit';

const DbToken     = createToken<Database>('Database');
const LoggerToken = createToken<ILogger>('Logger');
const ConfigToken = createToken<Config>('Config');
```

### Registration

```typescript
const container = createContainer();

// Value — register a constant instance
container.registerValue(ConfigToken, { apiUrl: 'https://api.example.com' });

// Class — container instantiates and injects deps
container.register(LoggerToken, { useClass: ConsoleLogger });
container.register(DbToken, { useClass: PostgresDb, deps: [ConfigToken] });

// Factory — full control; may be async
container.register(DbToken, {
  useFactory: async (config) => {
    const db = new PostgresDb(config.apiUrl);
    await db.connect();
    return db;
  },
  deps: [ConfigToken],
  lifetime: 'singleton',
});

// Alias — redirect AltLoggerToken → LoggerToken
container.alias(AltLoggerToken, LoggerToken);
```

### Resolution

```typescript
const logger = container.get(LoggerToken);           // sync
const db     = await container.getAsync(DbToken);    // async factory
const cache  = container.getOptional(CacheToken);    // undefined if missing
```

### Child Containers & Scoped Execution

```typescript
// Child inherits all parent registrations
const child = container.createChild();
child.registerValue(UserToken, currentUser);
const svc = child.get(ServiceToken);

// runInScope creates an auto-disposed child
const result = await container.runInScope(async (scope) => {
  scope.registerValue(RequestIdToken, generateId());
  return scope.get(RequestHandlerToken).handle(data);
});
```

### Testing

```typescript
import { createTestContainer, withMock } from '@vielzeug/wireit';

// Isolated child container + dispose helper
const { container, dispose } = createTestContainer(baseContainer);
container.registerValue(DbToken, mockDb);
const service = container.get(ServiceToken);
dispose(); // clears the child container

// Scoped override via snapshot/restore
await withMock(container, LoggerToken, mockLogger, async () => {
  await container.get(ServiceToken).doWork();
  // original LoggerToken is restored after this block
});
```

## API

### Factory functions

| Export | Description |
|---|---|
| `createToken<T>(description)` | Create a typed DI token |
| `createContainer()` | Create a new root container |
| `createTestContainer(base?)` | Create a child test container — returns `{ container, dispose }` |
| `withMock(container, token, mock, fn)` | Run `fn` with `token` temporarily overridden by `mock` |

### Container methods

| Method | Description |
|---|---|
| `register(token, provider)` | Register a `useClass`, `useFactory`, or `useValue` provider |
| `registerValue(token, value)` | Shorthand for `register(token, { useValue })` |
| `alias(token, source)` | Redirect `token` resolution to `source` |
| `unregister(token)` | Remove a registration |
| `clear()` | Remove all registrations and aliases |
| `has(token)` | Check if registered (own or parent) |
| `get(token)` | Resolve synchronously; throws `AsyncProviderError` for async factories |
| `getAsync(token)` | Resolve asynchronously; deduplicates concurrent singleton requests |
| `getOptional(token)` | Returns `undefined` if not found instead of throwing |
| `getOptionalAsync(token)` | Async version of `getOptional` |
| `createChild()` | Create a child container that inherits this one |
| `runInScope(fn)` | Run `fn` in a temporary child container, auto-cleared on completion |
| `snapshot()` | Deep-copy current registry state (includes cached instances) |
| `restore(snap)` | Restore a previously taken snapshot |
| `debug()` | Returns `{ tokens: string[], aliases: [string, string][] }` |

### Lifetimes

| Lifetime | Behaviour |
|---|---|
| `'singleton'` | One instance per container, cached after first resolution (default for class/factory) |
| `'transient'` | New instance on every `get()` call |
| `'scoped'` | One instance per child container; behaves as singleton in the root |

### Errors

| Class | When thrown |
|---|---|
| `ProviderNotFoundError` | Token not registered and no parent provides it |
| `AsyncProviderError` | `get()` called on an async factory; use `getAsync()` |
| `CircularDependencyError` | Circular dependency detected during resolution |

## Documentation

Full docs at **[vielzeug.dev/wireit](https://vielzeug.dev/wireit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/wireit/usage) | Tokens, providers, lifetimes, child containers, testing |
| [API Reference](https://vielzeug.dev/wireit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/wireit/examples) | Real-world DI patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
