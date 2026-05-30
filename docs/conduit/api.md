---
title: Conduit — API Reference
description: Complete API reference for @vielzeug/conduit.
---

[[toc]]

## API At a Glance

| Symbol                        | Purpose                                                         | Mode        | Common gotcha                                              |
| ----------------------------- | --------------------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| `token()`                     | Create a typed DI token (Symbol-backed)                         | Sync        | Each call produces a distinct symbol                       |
| `scope()`                     | Create a named scope token for lifecycle-scoped instances        | Sync        | Register factories with a `ScopeToken` as their lifetime   |
| `createContainer()`           | Create a new root DI container                                  | Sync        | Register all providers before resolving                    |
| `container.value()`           | Register a static value                                         | Sync        | Throws `DuplicateRegistrationError` if token already used  |
| `container.factory()`         | Register a lazy factory (sync or async)                         | Sync        | Factory does not run until first `resolve()`               |
| `container.load()`            | Apply `ContainerModule` functions sequentially                  | **Async**   | Returns `Promise<this>`; modules may be async              |
| `container.loadAll()`         | Apply `ContainerModule` functions in parallel                   | **Async**   | Use for independent modules that don't depend on each other|
| `container.has()`             | Check if a token is registered (walks parent chain)             | Sync        | Does not execute the factory                               |
| `container.resolve()`         | Resolve a single provider                                       | Async       | Throws `ProviderNotFoundError` if token not registered     |
| `container.resolveSync()`     | Resolve synchronously from cache                                | Sync        | Throws for transient and not-yet-resolved factories        |
| `container.resolveOptional()` | Resolve, returning `undefined` if missing                       | Async       | Still throws for disposed container and other errors       |
| `container.resolveAll()`      | Eagerly resolve all singleton factories (walks parent chain)    | Async       | Only singletons; scoped and transient are skipped          |
| `container.deferred()`        | Return a proxy that defers resolution to first property access  | Sync        | Token must be resolvable via `resolveSync()` on access     |
| `container.inspect()`         | Return a serializable graph of registered tokens                | Sync        | Defaults to deep traversal of the full parent chain        |
| `container.validate()`        | Detect circular dependencies at registration time               | Sync        | Returns `this`; throws `CircularDependencyError` on cycle  |
| `container.createChild()`     | Create a generic child container                                | Sync        | Child inherits parent registrations read-only              |
| `container.createScope()`     | Create a named-scope child container                            | Sync        | Factories with a `ScopeToken` lifetime resolve here        |
| `container.on()`              | Subscribe to container events (register / resolve / dispose)    | Sync        | Returns an unsubscribe function                            |
| `container.dispose()`         | Dispose container and run cleanup hooks                         | Async       | Hooks from both `value()` and `factory()` are called       |
| `container.disposed`          | Whether the container has been disposed                         | Sync getter | —                                                          |

## Package Entry Point

```ts
import { token, scope, createContainer } from '@vielzeug/conduit';
```

---

## Core Functions

### `token()`

```ts
function token<T>(description: string): Token<T>;
```

Creates a unique typed symbol used to identify a dependency. Two calls with the same `description` produce distinct symbols.

**Parameters:**

| Parameter     | Type     | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| `description` | `string` | Human-readable label used in error messages |

**Returns:** `Token<T>` — a symbol carrying `T` as a phantom type parameter.

**Example:**

```ts
import { token } from '@vielzeug/conduit';

const Logger = token<{ log(message: string): void }>('Logger');
const Config = token<{ apiUrl: string }>('Config');
```

---

### `scope()`

```ts
function scope(name: string): ScopeToken;
```

Creates a named scope token. Use as a `lifetime` in `factory()` to bind instances to a specific scope container created via `container.createScope(scopeToken)`.

**Returns:** `ScopeToken` — a unique symbol used as a scope identifier.

**Example:**

```ts
import { scope, token, createContainer } from '@vielzeug/conduit';

const RequestScope = scope('request');
const Session = token<{ id: string }>('Session');

const root = createContainer();
root.factory(Session, () => ({ id: crypto.randomUUID() }), { lifetime: RequestScope });

// Per-request scope container
const requestContainer = root.createScope(RequestScope);
const session = await requestContainer.resolve(Session);
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
value<T>(tok: Token<T>, value: T, opts?: ValueOptions<T>): this;
```

Registers a constant value. The value is returned as-is on every resolution. An optional `dispose` hook is always called on container disposal (regardless of whether the value was ever resolved).

**Throws:** `DuplicateRegistrationError` if the token is already registered.

**Parameters — `ValueOptions<T>`:**

| Option    | Type                                       | Default     | Description                            |
| --------- | ------------------------------------------ | ----------- | -------------------------------------- |
| `dispose` | `(instance: T) => void \| Promise<void>`   | `undefined` | Called during disposal                 |

**Returns:** `this` (chainable)

**Example:**

```ts
const Db = token<Database>('Db');
const db = await connectDb();

container.value(Db, db, { dispose: (db) => db.close() });
```

---

### `container.factory()`

```ts
// Zero deps
factory<T>(tok: Token<T>, fn: () => T | Promise<T>, opts?: FactoryOptions<T>): this;

// With typed deps (inferred from the deps tuple — no manual generics needed)
factory<T, const D extends Token<any>[]>(
  tok: Token<T>,
  fn: (...deps: InferTokenTypes<D>) => T | Promise<T>,
  opts: FactoryOptions<T> & { deps: D },
): this;
```

Registers a lazy factory. The factory runs on first resolution and its result is cached according to `lifetime`.

**Throws:** `DuplicateRegistrationError` if the token is already registered.

**Parameters — `FactoryOptions<T>`:**

| Option     | Type                                              | Default       | Description                                         |
| ---------- | ------------------------------------------------- | ------------- | --------------------------------------------------- |
| `deps`     | `Token<any>[]`                                    | `[]`          | Tokens resolved and passed as factory arguments     |
| `lifetime` | `'singleton' \| 'transient' \| 'scoped' \| ScopeToken` | `'singleton'` | Caching strategy                            |
| `dispose`  | `(instance: T) => void \| Promise<void>`          | `undefined`   | Called during disposal if the instance was resolved |

**Returns:** `this` (chainable)

**Example:**

```ts
const Logger = token<{ log(msg: string): void }>('Logger');
const Service = token<{ run(): Promise<void> }>('Service');

container.value(Logger, console);
container.factory(
  Service,
  (logger) => ({ run: async () => logger.log('ok') }),
  { deps: [Logger] },
);
```

#### Lifetimes

| Value         | Behavior                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `'singleton'` | Factory runs once; the same instance is returned on every subsequent call. Shared across child containers. |
| `'transient'` | Factory runs on every resolution; result is never cached                                       |
| `'scoped'`    | One instance per child container; throws `ScopedResolutionError` from the root                 |
| `ScopeToken`  | One instance per matching scope container (created via `createScope(scopeToken)`)              |

#### Singleton failure caching

If a singleton factory rejects, the rejection is cached and rethrown on every subsequent `resolve()` call. The factory is **not** retried. This ensures deterministic, fail-fast behavior. To retry, re-register the factory on a new container.

---

### `container.load()`

```ts
load(...modules: ContainerModule[]): Promise<this>;
```

Applies one or more `ContainerModule` functions to the container **sequentially**. Each module may be async; `load()` awaits each in order. Returns `Promise<this>` for chaining.

**Throws:** `ContainerDisposedError` if called after disposal.

**Returns:** `Promise<this>`

**Example:**

```ts
import { token, createContainer, type ContainerModule } from '@vielzeug/conduit';

const Logger = token<{ log(msg: string): void }>('Logger');

const loggingModule: ContainerModule = (c) => {
  c.value(Logger, console);
};

const container = await createContainer().load(loggingModule);
```

---

### `container.loadAll()`

```ts
loadAll(...modules: ContainerModule[]): Promise<this>;
```

Applies all `ContainerModule` functions **in parallel** via `Promise.all`. Use for independent modules that register unrelated tokens. Order of registration is not guaranteed.

**Throws:** `ContainerDisposedError` if called after disposal.

**Returns:** `Promise<this>`

**Example:**

```ts
const container = await createContainer().loadAll(authModule, dbModule, cacheModule);
```

---

### `container.has()`

```ts
has<T>(tok: Token<T>): boolean;
```

Returns `true` if the token has a registered provider (walks the parent chain). Does not execute the factory.

**Returns:** `boolean`

**Throws:** `ContainerDisposedError`

---

### `container.resolve()`

```ts
resolve<T>(tok: Token<T>): Promise<T>;
```

Resolves the provider registered for `tok`. Concurrent calls for a singleton or scoped token share the same in-flight promise.

**Returns:** `Promise<T>`

**Throws:** `ProviderNotFoundError`, `CircularDependencyError`, `ScopedResolutionError`, `ContainerDisposedError`

---

### `container.resolveSync()`

```ts
resolveSync<T>(tok: Token<T>): T;
```

Resolves synchronously. Works for value providers (always) and singleton/scoped instances that have already been resolved at least once.

**Returns:** `T`

**Throws:**
- `SyncResolutionError` — transient factory, or unresolved singleton/scoped instance
- `ScopedResolutionError` — scoped token called on the root container
- `ProviderNotFoundError`, `ContainerDisposedError`

**Recommended pattern:**

```ts
// Warm all singletons once at startup
await container.resolveAll();

// Then resolve synchronously in hot paths
const config = container.resolveSync(Config);
```

---

### `container.resolveOptional()`

```ts
resolveOptional<T>(tok: Token<T>): Promise<T | undefined>;
```

Resolves the token when available. Returns `undefined` when no provider is registered. Re-throws all other errors including `ContainerDisposedError`.

**Returns:** `Promise<T | undefined>`

---

### `container.resolveAll()`

```ts
resolveAll(): Promise<void>;
```

Eagerly resolves all **singleton** factory registrations in parallel — including singletons inherited from parent containers. Value registrations and transient/scoped factories are skipped.

Useful for:
- **Startup validation** — fail fast if any factory throws
- **Pre-warming** — populate the cache so `resolveSync()` is available immediately

**Returns:** `Promise<void>`

**Throws:** `ContainerDisposedError`

**Example:**

```ts
const container = createContainer();
// ... register providers ...

await container.resolveAll(); // warms all singletons (including parent's)
const config = container.resolveSync(Config);
```

---

### `container.deferred()`

```ts
deferred<T extends object>(tok: Token<T>): T;
```

Returns a `Proxy` that defers resolution until the first property access. The token is resolved synchronously via `resolveSync()` on first access — so the token must be registered and already resolved (or a value) at access time.

Useful for optional dependencies that are used rarely and should not force async ceremony at the call site.

**Returns:** `T` (deferred proxy)

**Throws on first access:** `ProviderNotFoundError`, `SyncResolutionError`, `ContainerDisposedError`

**Example:**

```ts
const Telemetry = token<{ track(event: string): void }>('Telemetry');

// Get the proxy early — no resolution yet
const telemetry = container.deferred(Telemetry);

// Registration and resolution happen later
container.value(Telemetry, analytics);
await container.resolve(Telemetry); // warm the cache

// First property access triggers synchronous resolution
telemetry.track('page_view');
```

---

### `container.inspect()`

```ts
inspect(opts?: { deep?: boolean }): ContainerGraph;
```

Returns a serializable description of every registered token. By default traverses the full parent chain (`deep: true`). Pass `{ deep: false }` to limit to this container's own registry.

**Parameters:**

| Option  | Type      | Default | Description                                |
| ------- | --------- | ------- | ------------------------------------------ |
| `deep`  | `boolean` | `true`  | Whether to include parent chain registrations |

**Returns:** `ContainerGraph`

```ts
type ContainerNode = {
  description: string;
  kind: 'value' | 'factory';
  deps: string[];
  /** 'singleton', 'transient', 'scoped', or 'scope:<name>' for named scopes. */
  lifetime?: string;
};

type ContainerGraph = {
  nodes: ContainerNode[];
};
```

**Example:**

```ts
const graph = container.inspect();

for (const node of graph.nodes) {
  console.log(`${node.description} (${node.kind})`);
  if (node.deps.length > 0) console.log('  deps:', node.deps.join(', '));
}
```

---

### `container.validate()`

```ts
validate(): this;
```

Performs registration-time cycle detection across the full dependency graph using depth-first search. Returns `this` for chaining. Safe to call after every `factory()` call during setup.

**Returns:** `this` (chainable)

**Throws:** `CircularDependencyError` if any cycle is detected.

**Example:**

```ts
container
  .factory(A, (b) => ..., { deps: [B] })
  .factory(B, (c) => ..., { deps: [C] })
  .value(C, 'leaf')
  .validate(); // ✓ no cycles
```

---

### `container.createChild()`

```ts
createChild(): Container;
```

Creates a generic child container that inherits the parent's registrations. Local registrations on the child shadow the parent for that token. The child maintains its own `scoped` cache — separate from the parent and all siblings.

**Returns:** `Container`

**Example:**

```ts
const Session = token<{ id: string }>('Session');
container.factory(Session, () => ({ id: crypto.randomUUID() }), { lifetime: 'scoped' });

const requestContainer = container.createChild();
const session = await requestContainer.resolve(Session);

await requestContainer.dispose();
```

---

### `container.createScope()`

```ts
createScope(scopeToken: ScopeToken): Container;
```

Creates a named-scope child container tagged with `scopeToken`. Factories registered with this `ScopeToken` as their lifetime will be resolved and cached within this scope container.

**Returns:** `Container`

**Throws:** `ContainerDisposedError`

**Example:**

```ts
const RequestScope = scope('request');
const Session = token<{ id: string }>('Session');

const root = createContainer();
root.factory(Session, () => ({ id: crypto.randomUUID() }), { lifetime: RequestScope });

// Each request gets its own scope container
function handleRequest() {
  const requestContainer = root.createScope(RequestScope);
  return requestContainer.resolve(Session);
}
```

---

### `container.on()`

```ts
on(listener: ContainerEventListener): () => void;
```

Subscribes to container lifecycle events. The listener receives events synchronously when they occur. Errors thrown by listeners are silently swallowed to protect container operation.

**Returns:** An unsubscribe function — call it to stop receiving events.

**Event types:**

| Event type   | Shape                                                       | When                                         |
| ------------ | ----------------------------------------------------------- | -------------------------------------------- |
| `'register'` | `{ type: 'register', description, kind: 'value'|'factory' }` | `value()` or `factory()` is called          |
| `'resolve'`  | `{ type: 'resolve', description }`                          | `resolve()` or `resolveSync()` completes     |
| `'dispose'`  | `{ type: 'dispose' }`                                       | `dispose()` is called                        |

**Example:**

```ts
const unsubscribe = container.on((event) => {
  if (event.type === 'register') {
    console.log(`Registered ${event.description} (${event.kind})`);
  }
  if (event.type === 'resolve') {
    console.log(`Resolved ${event.description}`);
  }
});

// Later:
unsubscribe();
```

---

### `container.dispose()`

```ts
dispose(): Promise<void>;
[Symbol.asyncDispose](): Promise<void>;
```

Disposes the container. Runs all registered cleanup hooks in parallel. Factory hooks fire only for resolved instances. Value hooks always fire. Collects failures into an `AggregateError`. Idempotent — multiple calls are safe.

**Returns:** `Promise<void>`

**Throws:** `AggregateError` if one or more hooks reject.

**Example:**

```ts
await container.dispose();

// With explicit resource management:
await using container = createContainer();
// dispose() called automatically at block exit
```

---

### `container.disposed`

```ts
get disposed(): boolean;
```

Returns `true` after `dispose()` has been called. All container operations throw `ContainerDisposedError` when `disposed` is `true`.

---

## Types

```ts
/** Symbol carrying T as a phantom type. Created via token(). */
type Token<T = unknown> = symbol & { __type?: T };

/** A named scope identifier. Created via scope(). */
type ScopeToken = symbol & { __scopeToken?: never };

/** Caching strategy for factory registrations. */
type Lifetime = 'singleton' | 'transient' | 'scoped' | ScopeToken;

/** Options for container.value(). */
type ValueOptions<T> = {
  dispose?: (instance: T) => void | Promise<void>;
};

/** Options for container.factory(). */
type FactoryOptions<T> = {
  dispose?: (instance: T) => void | Promise<void>;
  lifetime?: Lifetime;
};

/** A function that registers providers on a container. May be async. */
type ContainerModule = (container: Container) => Promise<void> | void;

/** A lifecycle event emitted by the container. */
type ContainerEvent =
  | { description: string; kind: 'factory' | 'value'; type: 'register' }
  | { description: string; type: 'resolve' }
  | { type: 'dispose' };

/** Listener function for container events. */
type ContainerEventListener = (event: ContainerEvent) => void;

/** Serializable node in the dependency graph returned by inspect(). */
type ContainerNode = {
  description: string;
  kind: 'value' | 'factory';
  deps: string[];
  /** 'singleton', 'transient', 'scoped', or 'scope:<name>' for named scopes. */
  lifetime?: string;
};

/** Serializable graph returned by inspect(). */
type ContainerGraph = {
  nodes: ContainerNode[];
};
```

---

## Errors

| Error                        | When thrown                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `CircularDependencyError`    | Dependency graph contains a cycle; message includes the full cycle path                  |
| `ProviderNotFoundError`      | `resolve()` / `resolveSync()` called for an unregistered token                           |
| `DuplicateRegistrationError` | `value()` or `factory()` called for a token that is already registered                   |
| `SyncResolutionError`        | `resolveSync()` called for a transient factory or an unresolved singleton/scoped factory  |
| `ScopedResolutionError`      | `resolve()` / `resolveSync()` called on the root for a scoped or named-scope token       |
| `ContainerDisposedError`     | Any operation called after `dispose()`                                                   |
