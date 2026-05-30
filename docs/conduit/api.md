---
title: Conduit — API Reference
description: Complete API reference for @vielzeug/conduit.
---

[[toc]]

## API At a Glance

| Symbol                        | Purpose                                        | Execution mode | Common gotcha                                           |
| ----------------------------- | ---------------------------------------------- | -------------- | ------------------------------------------------------- |
| `createToken()`               | Create a typed DI token (Symbol-backed)        | Sync           | Each call produces a distinct symbol                    |
| `createContainer()`           | Create a new root DI container                 | Sync           | Register all providers before resolving                 |
| `container.value()`           | Register a static value                        | Sync           | Value is used as-is, not wrapped or cloned              |
| `container.factory()`         | Register a lazy factory (sync or async)        | Sync           | Factory does not run until first `resolve()`            |
| `container.has()`             | Check if a token is registered                 | Sync           | Does not execute the factory                            |
| `container.resolve()`         | Resolve a single provider                      | Async          | Throws `ProviderNotFoundError` if token not registered  |
| `container.resolveSync()`     | Resolve a token synchronously                  | Sync           | Throws for transient and not-yet-resolved factories     |
| `container.resolveMany()`     | Resolve all providers for a multi token        | Async          | Returns `[]` when no providers exist                    |
| `container.resolveOptional()` | Resolve, returning `undefined` if missing      | Async          | Still throws for disposed container and other errors    |
| `container.createChild()`     | Create a scoped child container                | Sync           | Child inherits parent registrations read-only           |
| `container.dispose()`         | Dispose container and run cleanup hooks        | Async          | Hooks from both `value()` and `factory()` are called    |
| `container.disposed`          | Whether the container has been disposed        | Sync getter    | —                                                       |

## Package Entry Point

| Import            | Purpose                |
| ----------------- | ---------------------- |
| `@vielzeug/conduit` | Main exports and types |

## Core Functions

### `createToken()`

```ts
function createToken<T>(description: string): Token<T>;
```

Creates a unique typed symbol used to identify a dependency. Two calls with the same `description` produce distinct symbols.

**Parameters:**

| Parameter     | Type     | Description                                  |
| ------------- | -------- | -------------------------------------------- |
| `description` | `string` | Human-readable label used in error messages  |

**Returns:** `Token<T>` — a symbol carrying `T` as a phantom type parameter.

**Example:**

```ts
import { createToken } from '@vielzeug/conduit';

const Logger = createToken<{ log(message: string): void }>('Logger');
const Config = createToken<{ apiUrl: string }>('Config');
```

---

### `createContainer()`

```ts
function createContainer(): Container;
```

Creates a new root container with an empty registry.

**Returns:** `Container`

**Example:**

```ts
import { createContainer } from '@vielzeug/conduit';

const container = createContainer();
```

---

## Container

### `container.value()`

```ts
value<T>(token: Token<T>, value: T, opts?: ValueOptions<T>): this;
```

Registers a constant value. The value is returned as-is on every resolution. Supports an optional `dispose` hook that always runs on container disposal.

**Parameters — `ValueOptions<T>`:**

| Option    | Type                                     | Default     | Description                                                     |
| --------- | ---------------------------------------- | ----------- | --------------------------------------------------------------- |
| `multi`   | `boolean`                                | `false`     | Allow multiple providers for this token                         |
| `dispose` | `(instance: T) => void \| Promise<void>` | `undefined` | Called during disposal regardless of whether value was resolved |

**Returns:** `this` (chainable)

**Example:**

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

const Db = createToken<Database>('Db');
const container = createContainer();

const db = await connectDb();
container.value(Db, db, { dispose: (db) => db.close() });
```

---

### `container.factory()`

```ts
// Zero deps
factory<T>(token: Token<T>, fn: () => T | Promise<T>, opts?: FactoryOptions<T>): this;

// With deps
factory<T, Deps extends [unknown, ...unknown[]]>(
  token: Token<T>,
  fn: (...deps: Deps) => T | Promise<T>,
  opts: FactoryOptions<T, Deps> & { deps: { [K in keyof Deps]: Token<Deps[K]> } },
): this;
```

Registers a lazy factory. The factory runs on first resolution and its result is cached according to `lifetime`.

**Parameters — `FactoryOptions<T, Deps>`:**

| Option     | Type                                     | Default       | Description                                         |
| ---------- | ---------------------------------------- | ------------- | --------------------------------------------------- |
| `deps`     | `Token<Deps[K]>[]`                       | `[]`          | Tokens resolved and passed as factory arguments     |
| `lifetime` | `'singleton' \| 'transient' \| 'scoped'` | `'singleton'` | Caching strategy                                    |
| `multi`    | `boolean`                                | `false`       | Allow multiple providers for this token             |
| `dispose`  | `(instance: T) => void \| Promise<void>` | `undefined`   | Called during disposal if the instance was resolved |

**Returns:** `this` (chainable)

**Example:**

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

const Logger = createToken<{ log(msg: string): void }>('Logger');
const Service = createToken<{ run(): Promise<void> }>('Service');
const container = createContainer();

container.value(Logger, console);
container.factory(
  Service,
  (logger) => ({ run: async () => logger.log('ok') }),
  { deps: [Logger] },
);
```

#### Lifetimes

| Value         | Behavior                                                                  |
| ------------- | ------------------------------------------------------------------------- |
| `'singleton'` | Factory runs once; the same instance is returned on every subsequent call |
| `'transient'` | Factory runs on every resolution; result is never cached                  |
| `'scoped'`    | One instance per child container; throws if resolved from the root        |

---

### `container.has()`

```ts
has<T>(token: Token<T>): boolean;
```

Returns `true` if the token has at least one registered provider. Walks the parent chain. Does not execute the factory.

**Returns:** `boolean`

**Example:**

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

const Telemetry = createToken<{ track(event: string): void }>('Telemetry');
const container = createContainer();

if (container.has(Telemetry)) {
  const telemetry = container.resolveSync(Telemetry);
  telemetry.track('startup');
}
```

---

### `container.resolve()`

```ts
resolve<T>(token: Token<T>): Promise<T>;
```

Resolves the single provider registered for `token`. Concurrent calls for a singleton or scoped token share the same in-flight promise.

**Returns:** `Promise<T>`

**Throws:** `ProviderNotFoundError`, `MultipleProvidersError`, `CircularDependencyError`, `ContainerDisposedError`

**Example:**

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

const Service = createToken<{ run(): void }>('Service');
const container = createContainer();

const service = await container.resolve(Service);
```

---

### `container.resolveSync()`

```ts
resolveSync<T>(token: Token<T>): T;
```

Resolves synchronously. Works for value providers (always) and singleton/scoped instances that have already been resolved at least once.

**Returns:** `T`

**Throws:**
- `SyncResolutionError` — transient factories (never cached) or unresolved singletons/scoped instances
- `ScopedResolutionError` — scoped token called on the root container
- `ProviderNotFoundError`, `MultipleProvidersError`, `ContainerDisposedError`

**Example:**

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

const Config = createToken<{ apiUrl: string }>('Config');
const container = createContainer();

// Warm up once during async startup
await container.resolve(Config);

// Then resolve synchronously in hot paths
const config = container.resolveSync(Config);
```

---

### `container.resolveMany()`

```ts
resolveMany<T>(token: Token<T>): Promise<T[]>;
```

Resolves all providers registered for a multi token. Returns `[]` when no providers exist.

**Returns:** `Promise<T[]>`

**Example:**

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

const Plugin = createToken<{ name: string }>('Plugin');
const container = createContainer();

container.value(Plugin, { name: 'analytics' }, { multi: true });
container.value(Plugin, { name: 'logger' }, { multi: true });

const plugins = await container.resolveMany(Plugin);
```

---

### `container.resolveOptional()`

```ts
resolveOptional<T>(token: Token<T>): Promise<T | undefined>;
```

Resolves the token when available. Returns `undefined` when no provider is registered. Re-throws all other errors including `ContainerDisposedError`.

**Returns:** `Promise<T | undefined>`

**Example:**

```ts
const logger = await container.resolveOptional(Logger);
logger?.log('optional feature active');
```

---

### `container.createChild()`

```ts
createChild(): Container;
```

Creates a child container that inherits the parent's registrations. Registrations on the child shadow the parent for that token. The child has its own scope cache for scoped lifetime instances.

**Returns:** `Container`

**Example:**

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

const Session = createToken<{ id: string }>('Session');
const container = createContainer();
container.factory(Session, () => ({ id: crypto.randomUUID() }), { lifetime: 'scoped' });

const child = container.createChild();
const session = await child.resolve(Session); // scoped instance on the child
await child.dispose(); // disposes child's scoped instances only
```

---

### `container.dispose()`

```ts
dispose(): Promise<void>;
[Symbol.asyncDispose](): Promise<void>;
```

Disposes the container. Runs all registered cleanup hooks in parallel. Factory hooks fire only for resolved instances; value hooks always fire. Collects failures into an `AggregateError` if any hook throws. Multiple calls are safe — only the first call runs hooks.

**Returns:** `Promise<void>`

**Throws:** `AggregateError` if one or more hooks reject.

**Example:**

```ts
await container.dispose();

// Or with explicit resource management:
await using container = createContainer();
// container.dispose() is called automatically at block exit
```

---

### `container.disposed`

```ts
get disposed(): boolean;
```

Returns `true` after `dispose()` has been called.

---

## Types

```ts
/** Symbol carrying T as a phantom type. Created via createToken(). */
type Token<T = unknown> = symbol & { __type?: T };

/** Caching strategy for factory registrations. */
type Lifetime = 'singleton' | 'transient' | 'scoped';

/** Options for container.value(). */
type ValueOptions<T> = {
  dispose?: (instance: T) => void | Promise<void>;
  multi?: boolean;
};

/** Options for container.factory(). */
type FactoryOptions<T, Deps extends unknown[] = []> = {
  deps?: { [K in keyof Deps]: Token<Deps[K]> };
  dispose?: (instance: T) => void | Promise<void>;
  lifetime?: Lifetime;
  multi?: boolean;
};
```

## Errors

| Error                    | When thrown                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `CircularDependencyError` | Dependency graph contains a cycle; message includes the full cycle path                |
| `ProviderNotFoundError`  | `resolve()` or `resolveSync()` called for an unregistered token                         |
| `MultipleProvidersError` | `resolve()` or `resolveSync()` called on a multi token; use `resolveMany()` instead     |
| `SyncResolutionError`    | `resolveSync()` called for a transient factory or an unresolved singleton/scoped factory |
| `ScopedResolutionError`  | `resolve()` or `resolveSync()` called on the root container for a scoped token          |
| `ContainerDisposedError` | Any operation called after `dispose()`                                                  |
