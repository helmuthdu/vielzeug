---
title: Conduit — API Reference
description: Complete API reference for @vielzeug/conduit.
---

[[toc]]

## API At a Glance

| Symbol                     | Purpose                                                       | Mode        | Common gotcha                                                              |
| -------------------------- | ------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `token()`                  | Create a typed DI token (Symbol-backed)                       | Sync        | Each call produces a distinct symbol                                       |
| `scope()`                  | Create a named scope token for lifecycle-scoped instances     | Sync        | Register factories with a `ScopeToken` as their lifetime                   |
| `createContainer()`        | Create a new root DI container                                | Sync        | Register all providers before resolving                                    |
| `loadModules()`            | Apply `ContainerModule` functions to a container              | **Async**   | Free function; modules run sequentially; returns `Promise<Container>`      |
| `resolveOptional()`        | Resolve, returning `undefined` if not registered              | **Async**   | Free function; re-throws all other errors                                  |
| `resolveOrDefault()`       | Resolve, returning a fallback if not registered               | **Async**   | Free function; same re-throw semantics as `resolveOptional`                |
| `tryResolve()`             | Resolve, returning `{ ok, value/error }` instead of throwing  | **Async**   | Free function                                                              |
| `resolveSyncOptional()`    | Resolve synchronously, returning `undefined` if not found     | Sync        | Free function; re-throws `SyncResolutionError`, `ContainerDisposedError`   |
| `resolveSyncOrDefault()`   | Resolve synchronously, returning a fallback if not found      | Sync        | Free function; `null` from factory is preserved, not replaced by default   |
| `container.value()`        | Register a static value                                       | Sync        | Throws `DuplicateRegistrationError` if token already used                  |
| `container.factory()`      | Register a lazy factory (sync or async)                       | Sync        | Receives a `FactoryResolver`; factory does not run until first `resolve()` |
| `container.has()`          | Check if a token is registered (walks parent chain)           | Sync        | Does not execute the factory                                               |
| `container.resolve()`      | Resolve a single provider                                     | **Async**   | Throws `ProviderNotFoundError` if token not registered                     |
| `container.resolveSync()`  | Resolve synchronously from cache                              | Sync        | Throws for transient and not-yet-resolved; rethrows cached rejections      |
| `container.resolveMany()`  | Resolve multiple tokens in parallel, returning a typed tuple  | **Async**   | Rejects if any token fails                                                 |
| `container.resolveAll()`   | Eagerly resolve all singleton factories (walks parent chain)  | **Async**   | Pass `{ includeScoped: true }` to also pre-warm named-scope factories      |
| `container.inspect()`      | Return a serializable graph of registered tokens              | Sync        | Defaults to deep traversal of the full parent chain                        |
| `container.freeze()`       | Lock registrations; validate completeness                     | Sync        | Detects declared-dep cycles; lazy cycles caught at resolve time            |
| `container.createScope()`  | Create a child container, optionally tagged with a scope      | Sync        | Pass a `ScopeToken` to activate named-scope lifecycle                      |
| `container.on()`           | Subscribe to container events (register / resolve / dispose)  | Sync        | Events carry a `source` field; propagate up to parent listeners            |
| `container.onResolve()`    | Register an interceptor called after every successful resolve | Sync        | Returns unsubscribe fn; errors swallowed; propagates to parent             |
| `container.dispose()`      | Dispose container and run cleanup hooks                       | **Async**   | Hook failures warn in dev — never rethrow                                  |
| `container.disposalSignal` | `AbortSignal` aborted when the container is disposed          | Sync getter | Tie external resource lifetimes to this container                          |
| `container.disposed`       | Whether the container has been disposed                       | Sync getter | —                                                                          |
| `container.name`           | Human-readable container identifier                           | Sync getter | Set via `createContainer({ name })` or `createScope(token, { name })`      |

## Package Entry Point

```ts
import { token, scope, createContainer, loadModules } from '@vielzeug/conduit';
import {
  resolveOptional,
  resolveOrDefault,
  tryResolve,
  resolveSyncOptional,
  resolveSyncOrDefault,
} from '@vielzeug/conduit';
```

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
function createContainer(opts?: { name?: string }): Container;
```

Creates a new root container with an empty registry.

**Parameters:**

| Option | Type     | Default  | Description                                                   |
| ------ | -------- | -------- | ------------------------------------------------------------- |
| `name` | `string` | `'root'` | Human-readable identifier for the container (shown in errors) |

**Returns:** `Container`

**Example:**

```ts
import { createContainer } from '@vielzeug/conduit';

const container = createContainer({ name: 'app' });
```

## Container

### `container.value()`

```ts
value<T>(tok: Token<T>, value: T, opts?: ValueOptions<T>): this;
```

Registers a constant value. The value is returned as-is on every resolution. An optional `dispose` hook is always called on container disposal (regardless of whether the value was ever resolved).

**Throws:** `DuplicateRegistrationError` if the token is already registered.

**Parameters — `ValueOptions<T>`:**

| Option    | Type                                     | Default     | Description            |
| --------- | ---------------------------------------- | ----------- | ---------------------- |
| `dispose` | `(instance: T) => void \| Promise<void>` | `undefined` | Called during disposal |

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
factory<T>(tok: Token<T>, fn: (resolver: FactoryResolver) => Promise<T> | T, opts?: FactoryOptions<T>): this;
```

Registers a lazy factory. The factory receives a `FactoryResolver` and runs on first resolution; its result is cached according to `lifetime`.

**Throws:** `DuplicateRegistrationError` if the token is already registered.

**Parameters — `FactoryOptions<T>`:**

| Option     | Type                                       | Default       | Description                                                                                           |
| ---------- | ------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------- |
| `deps`     | `readonly Token<any>[]`                    | `undefined`   | Statically declared dependencies. Used by `freeze()` for early validation and static cycle detection. |
| `lifetime` | `'singleton' \| 'transient' \| ScopeToken` | `'singleton'` | Caching strategy                                                                                      |
| `dispose`  | `(instance: T) => void \| Promise<void>`   | `undefined`   | Called during disposal if the instance was resolved                                                   |

**Returns:** `this` (chainable)

**Example:**

```ts
const Logger = token<{ log(msg: string): void }>('Logger');
const Service = token<{ run(): Promise<void> }>('Service');

container.value(Logger, console);
container.factory(Service, async (r) => {
  const logger = await r.resolve(Logger);
  return { run: async () => logger.log('ok') };
});
```

#### Lifetimes

| Value         | Behavior                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `'singleton'` | Factory runs once; the same instance is returned on every subsequent call. Shared across scope containers. |
| `'transient'` | Factory runs on every resolution; result is never cached.                                                  |
| `ScopeToken`  | One instance per matching scope container (created via `createScope(scopeToken)`).                         |

#### Singleton failure caching

If a singleton factory rejects, the rejection is cached and rethrown on every subsequent `resolve()` call. The factory is **not** retried. To retry, create a new container.

---

### `loadModules()` (free function)

```ts
function loadModules(container: Container, ...modules: ContainerModule[]): Promise<Container>;
```

Applies one or more `ContainerModule` functions to a container **sequentially**. Each module may be async; `loadModules()` awaits each in order. Returns `Promise<Container>` (the same container) for chaining.

**Example:**

```ts
import { createContainer, loadModules, token, type ContainerModule } from '@vielzeug/conduit';

const Logger = token<{ log(msg: string): void }>('Logger');

const loggingModule: ContainerModule = (c) => {
  c.value(Logger, console);
};

const container = await loadModules(createContainer(), loggingModule);
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
- The **cached rejection** (original error) — if a singleton factory previously failed
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

### `resolveSyncOptional()` (free function)

```ts
function resolveSyncOptional<T>(container: Container, tok: Token<T>): T | undefined;
```

Resolves a token synchronously. Returns `undefined` when no provider is registered. Re-throws all other errors — including `SyncResolutionError` (unresolved singleton) and `ContainerDisposedError`.

**Returns:** `T | undefined`

**Example:**

```ts
import { resolveSyncOptional } from '@vielzeug/conduit';

await container.resolveAll();

const plugin = resolveSyncOptional(container, OptionalPlugin);
if (plugin) plugin.init();
```

---

### `resolveSyncOrDefault()` (free function)

```ts
function resolveSyncOrDefault<T>(container: Container, tok: Token<T>, defaultValue: T): T;
```

Resolves a token synchronously. Returns `defaultValue` when no provider is registered. Equivalent to `resolveSyncOptional(container, tok) ?? defaultValue`.

**Returns:** `T`

**Example:**

```ts
import { resolveSyncOrDefault } from '@vielzeug/conduit';

await container.resolveAll();

const timeout = resolveSyncOrDefault(container, RequestTimeout, 5000);
```

---

### `resolveOptional()` (free function)

```ts
function resolveOptional<T>(container: Container, tok: Token<T>): Promise<T | undefined>;
```

Resolves the token when available. Returns `undefined` when no provider is registered. Re-throws all other errors including `ContainerDisposedError`.

**Returns:** `Promise<T | undefined>`

---

### `resolveOrDefault()` (free function)

```ts
function resolveOrDefault<T>(container: Container, tok: Token<T>, defaultValue: T): Promise<T>;
```

Resolves the token when available. Returns `defaultValue` when no provider is registered. Re-throws all other errors including `ContainerDisposedError`.

**Returns:** `Promise<T>`

**Example:**

```ts
import { resolveOrDefault } from '@vielzeug/conduit';

const Telemetry = token<Telemetry>('Telemetry');
const noop: Telemetry = { track: () => {} };

const telemetry = await resolveOrDefault(container, Telemetry, noop);
telemetry.track('app-start');
```

---

### `container.resolveAll()`

```ts
resolveAll(opts?: { includeScoped?: boolean }): Promise<void>;
```

Eagerly resolves factory registrations in parallel — including those inherited from parent containers.

- By default, only **singleton** factories are resolved. Value registrations and transient factories are always skipped.
- Pass `{ includeScoped: true }` to also pre-warm **named-scope** factories registered on the current scope container (i.e., the container must be a scope container tagged with the matching `ScopeToken`).

Useful for:

- **Startup validation** — fail fast if any factory throws
- **Pre-warming** — populate the cache so `resolveSync()` is available immediately

**Returns:** `Promise<void>`

**Throws:** `ContainerDisposedError`

**Example:**

```ts
const container = createContainer();
// ... register providers ...

await container.resolveAll(); // warms all singletons
const config = container.resolveSync(Config);

// Pre-warm a named-scope container:
const sc = root.createScope(RequestScope);
await sc.resolveAll({ includeScoped: true }); // also warms RequestScope factories
```

---

### `tryResolve()` (free function)

```ts
function tryResolve<T>(container: Container, tok: Token<T>): Promise<ResolveResult<T>>;
```

Resolves a token, returning a discriminated union result object instead of throwing. Useful when provider absence is expected.

```ts
type ResolveResult<T> = { ok: true; value: T } | { ok: false; error: unknown };
```

**Returns:** `Promise<ResolveResult<T>>`

**Example:**

```ts
import { tryResolve } from '@vielzeug/conduit';

const result = await tryResolve(container, OptionalPlugin);
if (result.ok) {
  result.value.init();
}
```

---

### `container.resolveMany()`

```ts
resolveMany<const D extends Token<any>[]>(toks: D): Promise<InferTokenTypes<D>>;
```

Resolves multiple tokens in parallel and returns a typed tuple. Equivalent to `Promise.all(toks.map(t => container.resolve(t)))` but with full type inference.

**Returns:** `Promise<InferTokenTypes<D>>` — a tuple typed to each token's `T`.

**Throws:** `ProviderNotFoundError`, `CircularDependencyError`, `ContainerDisposedError` (first rejection wins).

**Example:**

```ts
const [db, cache, logger] = await container.resolveMany([Db, Cache, Logger] as const);
```

---

### `container.inspect()`

```ts
inspect(opts?: { deep?: boolean }): ContainerGraph;
```

Returns a serializable description of every registered token. By default traverses the full parent chain (`deep: true`). Pass `{ deep: false }` to limit to this container's own registry.

**Throws:** `ContainerDisposedError`

**Parameters:**

| Option | Type      | Default | Description                                   |
| ------ | --------- | ------- | --------------------------------------------- |
| `deep` | `boolean` | `true`  | Whether to include parent chain registrations |

**Returns:** `ContainerGraph`

```ts
type ContainerNode = {
  description: string;
  kind: 'value' | 'factory';
  /** 'singleton', 'transient', or 'scope:<name>' for named-scope factories. */
  lifetime?: 'singleton' | 'transient' | `scope:${string}`;
};

type ContainerGraph = {
  nodes: ContainerNode[];
};
```

**Example:**

```ts
const graph = container.inspect();

for (const node of graph.nodes) {
  console.log(`${node.description} (${node.kind}, ${node.lifetime ?? 'singleton'})`);
}
```

---

### `container.freeze()`

```ts
freeze(): this;
```

Locks the container against further `value()` or `factory()` calls. Before locking, runs a validation pass:

1. **Registration completeness** — every registered token has a provider. Throws `ProviderNotFoundError` if any token is missing.
2. **Static dep cycle detection** — if factories were registered with `deps:` declared, checks those deps for cycles. Throws `CircularDependencyError` if a static cycle is found.

> **Note:** Lazy dependencies (accessed inside the factory via `resolver.resolve()`) that are _not_ listed in `deps:` are **not** checked by `freeze()`. Those cycles are caught at resolve time. Use `deps:` to opt in to early static validation.

`freeze()` is **local** — scope containers created after `freeze()` are not frozen.

**Returns:** `this` (chainable)

**Throws:**

- `ContainerDisposedError` — if the container has been disposed
- `ProviderNotFoundError` — if any registered token is missing a provider (or a declared `deps` dep is missing)
- `CircularDependencyError` — if declared `deps` form a cycle
- `ContainerFrozenError` — on any subsequent `value()` or `factory()` call

**Example:**

```ts
const container = createContainer({ name: 'app' });

// Declare deps for early static validation:
container.factory(Service, (r) => new Service(r.resolve(Logger)), { deps: [Logger] });

await loadModules(container, coreModule, dbModule);
container.freeze(); // validates static deps + seals

await container.resolveAll(); // pre-warm after freeze
```

---

### `container.createScope()`

```ts
createScope(scopeToken?: ScopeToken, opts?: { name?: string }): Container;
```

Creates a child container. When `scopeToken` is provided, the child is tagged with that scope — factories registered with this `ScopeToken` lifetime will resolve and cache within this container. Omitting `scopeToken` creates a plain child that inherits parent registrations.

**Returns:** `Container`

**Throws:** `ContainerDisposedError`

**Example:**

```ts
const RequestScope = scope('request');
const Session = token<{ id: string }>('Session');

const root = createContainer({ name: 'root' });
root.factory(Session, () => ({ id: crypto.randomUUID() }), { lifetime: RequestScope });

// Each request gets its own scope container
function handleRequest(id: string) {
  const requestContainer = root.createScope(RequestScope, { name: `req-${id}` });
  return requestContainer.resolve(Session);
}
```

---

### `container.onResolve()`

```ts
onResolve(interceptor: ResolveInterceptor): () => void;
```

Registers an interceptor called after every successful resolution — from both `resolve()` and `resolveSync()`. The interceptor receives the resolved `Token<T>` and the resolved value. Errors thrown by the interceptor are silently swallowed. Interceptors **propagate up** to parent containers (same semantics as `on()`).

**Returns:** An unsubscribe function.

**Throws:** `ContainerDisposedError` — if the container has been disposed.

**Example:**

```ts
import { createContainer, token, type ResolveInterceptor } from '@vielzeug/conduit';

const Logger = token<Logger>('Logger');
const container = createContainer();

const unsub = container.onResolve((tok, value) => {
  console.log(`Resolved: ${tok.description}`, value);
});

await container.resolve(Logger);
unsub();
```

---

### `container.on()`

```ts
on(listener: ContainerEventListener): () => void;
```

Subscribes to container lifecycle events. The listener receives events synchronously when they occur. Errors thrown by listeners are silently swallowed to protect container operation. Events **propagate up** to parent container listeners — a listener on the root container observes all events from children and scopes.

**Returns:** An unsubscribe function — call it to stop receiving events.

**Throws:** `ContainerDisposedError` — if the container has been disposed.

**Event types:**

| Event type   | Shape                                                                                   | When                                     |
| ------------ | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| `'register'` | `{ type: 'register', source: string, description: string, kind: 'value' \| 'factory' }` | `value()` or `factory()` is called       |
| `'resolve'`  | `{ type: 'resolve', source: string, description: string }`                              | `resolve()` or `resolveSync()` completes |
| `'dispose'`  | `{ type: 'dispose', source: string }`                                                   | `dispose()` is called                    |

The `source` field is the `name` of the container that emitted the event.

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

Disposes the container. Runs all registered cleanup hooks in parallel. Factory hooks fire only for resolved instances. Value hooks always fire. Hook failures are **warned in dev** (via the internal warn channel) — they do not throw. Idempotent — multiple calls are safe.

**Returns:** `Promise<void>`

**Example:**

```ts
await container.dispose();

// With explicit resource management:
await using container = createContainer();
// dispose() called automatically at block exit
```

---

### `container.disposalSignal`

```ts
get disposalSignal(): AbortSignal;
```

`AbortSignal` that is aborted when the container is disposed. Use it to tie the lifetime of external resources (e.g., SSE connections, polling loops) to the container.

```ts
const container = createContainer();
const resource = startPolling({ signal: container.disposalSignal });
// When container.dispose() is called, resource automatically stops.
```

---

### `container.disposed`

```ts
get disposed(): boolean;
```

Returns `true` after `dispose()` has been called. All container operations throw `ContainerDisposedError` when `disposed` is `true`.

## Types

```ts
/** Symbol carrying T as a phantom type. Created via token(). */
type Token<T = unknown> = symbol & { __type?: T };

/** A named scope identifier. Created via scope(). */
type ScopeToken = symbol & { __scopeToken?: never };

/** Caching strategy for factory registrations. */
type Lifetime = 'singleton' | 'transient' | ScopeToken;

/** Options for container.value(). */
type ValueOptions<T> = {
  dispose?: (instance: T) => void | Promise<void>;
};

/** Options for container.factory(). */
type FactoryOptions<T> = {
  /** Statically-declared dependencies for freeze() validation. */
  deps?: readonly Token<any>[];
  dispose?: (instance: T) => void | Promise<void>;
  lifetime?: Lifetime;
};

/**
 * Infer the resolved-value tuple from a readonly token array.
 * Mirrors the return type of resolveMany().
 */
type InferTokenTypes<T extends readonly Token<any>[]> = {
  [K in keyof T]: T[K] extends Token<infer U> ? U : never;
};

/** Interceptor called after every successful resolution. */
type ResolveInterceptor = <T>(tok: Token<T>, value: T) => void;

/** Passed to each factory function — resolves other tokens lazily. */
interface FactoryResolver {
  resolve<T>(tok: Token<T>): Promise<T>;
}

/** A function that registers providers on a container. May be async. */
type ContainerModule = (container: Container) => Promise<void> | void;

/** A lifecycle event emitted by the container. */
type ContainerEvent =
  | { description: string; kind: 'factory' | 'value'; source: string; type: 'register' }
  | { description: string; source: string; type: 'resolve' }
  | { source: string; type: 'dispose' };

/** Listener function for container events. */
type ContainerEventListener = (event: ContainerEvent) => void;

/** Result type returned by tryResolve(). */
type ResolveResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

/** Serializable node in the dependency graph returned by inspect(). */
type ContainerNode = {
  description: string;
  kind: 'value' | 'factory';
  /** 'singleton', 'transient', or 'scope:<name>' for named-scope factories. */
  lifetime?: 'singleton' | 'transient' | `scope:${string}`;
};

/** Serializable graph returned by inspect(). */
type ContainerGraph = {
  nodes: ContainerNode[];
};
```

## Errors

All conduit errors extend `ContainerError`. Use `instanceof ContainerError` to catch any conduit-originated error in one branch, or narrow further with specific subclass checks.

| Error                        | When thrown                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ContainerError`             | **Base class** for all conduit errors — catch with `instanceof ContainerError`                                       |
| `CircularDependencyError`    | `freeze()` detected a declared-dep cycle; lazy cycles detected at resolve time; message includes the full cycle path |
| `ProviderNotFoundError`      | `resolve()` / `resolveSync()` / `freeze()` — token not registered; message includes container name                   |
| `DuplicateRegistrationError` | `value()` or `factory()` called for a token that is already registered                                               |
| `SyncResolutionError`        | `resolveSync()` called for a transient factory or an unresolved singleton factory                                    |
| `ScopedResolutionError`      | `resolve()` / `resolveSync()` called outside a matching named-scope container                                        |
| `ContainerDisposedError`     | Any operation called after `dispose()` — message includes the container name                                         |
| `ContainerFrozenError`       | `value()` or `factory()` called after `freeze()` — message includes the container name                               |
