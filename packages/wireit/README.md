# @vielzeug/wireit

> Lightweight dependency injection container for TypeScript with interface tokens and test mocks

[![npm version](https://img.shields.io/npm/v/@vielzeug/wireit)](https://www.npmjs.com/package/@vielzeug/wireit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Wireit** is a minimal IoC container that uses typed interface tokens to bind and resolve dependencies — with first-class support for testing via `createTestContainer` and `withMock`.

## Installation

```sh
pnpm add @vielzeug/wireit
# npm install @vielzeug/wireit
# yarn add @vielzeug/wireit
```

## Quick Start

```typescript
import { createContainer, createToken } from '@vielzeug/wireit';

interface Logger { log(msg: string): void }
interface UserRepo { findById(id: string): Promise<User> }

const LoggerToken = createToken<Logger>('Logger');
const UserRepoToken = createToken<UserRepo>('UserRepo');

const container = createContainer();

container.bind(LoggerToken).toValue({ log: (msg) => console.log(msg) });
container.bind(UserRepoToken).toClass(SqlUserRepo, [LoggerToken]);

const repo = container.resolve(UserRepoToken);
await repo.findById('123');
```

## Features

- ✅ **Typed tokens** — `createToken<T>(name)` keeps bindings type-safe
- ✅ **Multiple binding strategies** — `toValue`, `toClass`, `toFactory`, `toAlias`
- ✅ **Scoped containers** — child containers inherit parent bindings
- ✅ **Lazy resolution** — bindings are only created when first resolved
- ✅ **Singleton by default** — one instance per container scope
- ✅ **Test utilities** — `createTestContainer` and `withMock` for easy testing
- ✅ **Zero runtime dependencies**

## Usage

### Defining Tokens

```typescript
import { createToken } from '@vielzeug/wireit';

const DbToken     = createToken<Database>('Database');
const LoggerToken = createToken<Logger>('Logger');
const ConfigToken = createToken<Config>('Config');
```

### Binding Strategies

```typescript
const container = createContainer();

// Value — constant instance
container.bind(ConfigToken).toValue({ apiUrl: 'https://api.example.com' });

// Class — auto-resolved constructor injection
container.bind(LoggerToken).toClass(ConsoleLogger);
container.bind(DbToken).toClass(PostgresDb, [ConfigToken]);

// Factory — full control
container.bind(LoggerToken).toFactory((c) => {
  const config = c.resolve(ConfigToken);
  return new FileLogger(config.logPath);
});

// Alias — redirect one token to another
container.bind(AltLoggerToken).toAlias(LoggerToken);
```

### Child Containers

```typescript
const requestContainer = createContainer(container); // inherits all parent bindings

requestContainer.bind(UserToken).toValue(currentUser);

const svc = requestContainer.resolve(ServiceToken);
```

### Testing

```typescript
import { createTestContainer, withMock } from '@vielzeug/wireit';

// createTestContainer returns { container, dispose }
const { container, dispose } = createTestContainer(baseContainer);

container.bind(DbToken).toValue(mockDb);
const service = container.resolve(ServiceToken);

// or use withMock for scoped override
const result = await withMock(container, LoggerToken, mockLogger, async (c) => {
  return c.resolve(ServiceToken).doWork();
});

dispose(); // always clean up
```

## API

| Export | Description |
|---|---|
| `createToken<T>(name)` | Create a typed DI token |
| `createContainer(parent?)` | Create a container (optionally inheriting from parent) |
| `createTestContainer(base?)` | Create a disposable test container — returns `{ container, dispose }` |
| `withMock(container, token, mock, fn)` | Run `fn` with a temporary binding override |

### Container Methods

| Method | Description |
|---|---|
| `.bind(token)` | Start a binding — returns builder with `toValue`, `toClass`, `toFactory`, `toAlias` |
| `.resolve(token)` | Resolve a dependency by token |
| `.has(token)` | Check if a token is bound |
| `.unbind(token)` | Remove a binding |

## Documentation

Full docs at **[vielzeug.dev/wireit](https://vielzeug.dev/wireit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/wireit/usage) | Tokens, bindings, child containers |
| [API Reference](https://vielzeug.dev/wireit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/wireit/examples) | Real-world DI patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
