---
title: Courier — API Reference
description: Complete API reference for the Courier HTTP client, query client, unified client, SSE, and streaming APIs.
---

[[toc]]

## API Overview

| Symbol                  | Purpose                                                | Execution mode | Common gotcha                                                        |
| ----------------------- | ------------------------------------------------------ | -------------- | -------------------------------------------------------------------- |
| `createApi()`           | Create an HTTP client with defaults and interceptors   | Sync           | Uses `TransportOptions`, not `ApiClientOptions`                      |
| `createQuery()`         | Create cache/query orchestration utilities             | Sync           | Use `fetch()`, not `query()`                                         |
| `createMutation()`      | Create tracked write handles with cancellation         | Sync           | `times: 1` means no retries; lifecycle callbacks receive `variables` |
| `createCourier()`       | Create a unified client with shared transport          | Sync           | REST timeout defaults to 30s; streams default to `Infinity`          |
| `createStream()`        | Open SSE or readable HTTP streams                      | Sync           | `reconnect: true` means up to 5 reconnects after a failure           |
| `bindRefetch()`         | Opt-in focus/reconnect revalidation binding            | Sync           | Returns unbind fn; call it on cleanup                                |
| `withBearerAuth()`      | Interceptor preset for Bearer token injection          | Sync           | Accepts static string or async token factory                         |
| `withRequestId()`       | Interceptor preset adding a unique request ID header   | Sync           | Defaults to `x-request-id` with `crypto.randomUUID()`                |
| `withLogging()`         | Interceptor preset logging method/URL/status/ms        | Sync           | Defaults to `console.debug`; override with `logger` option           |
| `toSyncStore()`         | Convert any `peek()`/`subscribe()` source to `SyncStore` | Sync          | Useful for framework adapters that accept a `SyncStore` directly     |
| `createBatcher()`      | DataLoader-style batcher coalescing `load()` calls      | Sync           | Exactly one of `resolve`/`resolveSettled` must be provided            |
| `persistQueryCache()`   | Subscribe to cache and write successful entries        | Sync           | Eagerly persists existing successful entries on setup                |
| `hydrateQueryCache()`   | Read persisted entries and seed the cache              | Async          | Runs all keys in parallel; restores original `updatedAt`             |
| `debugCourier()`       | Create a `Courier` with logging pre-wired (dev only)    | Sync           | Import from `@vielzeug/courier/devtools`, not the main entry point    |
| `CourierError`          | Base class for all courier errors                      | —              | `CourierError.is(e)` catches any courier error; narrow further after |
| `CourierHttpError`             | Structured non-2xx HTTP error with status + body       | —              | Use `CourierHttpError.is(err, status?)` for narrowing                       |
| `CourierNetworkError`          | Connection-level failure (no response received)        | —              | Use `instanceof CourierNetworkError` for narrowing                          |
| `CourierTimeoutError`          | Request timed out via transport or `AbortSignal`       | —              | Use `instanceof CourierTimeoutError` for narrowing                          |
| `CourierAbortError`            | Request was cancelled via `cancel()` or signal         | —              | Use `instanceof CourierAbortError` for narrowing                            |
| `CourierSchemaValidationError` | Thrown when `schema.parse()` rejects the response body | —              | Wraps the original parse error; `data` holds the raw pre-parse body  |
| `CourierDisposedError`  | Thrown by any primitive's primary method after `dispose()` | —          | Use `instanceof CourierDisposedError` for narrowing                  |
| `CourierBatcherError`   | Thrown when a batcher's `resolve`/`resolveSettled` misbehaves | —        | Covers wrong result-array length and synchronous throws              |
| `CourierParseError`     | Thrown when a response body or path param cannot be parsed | —          | Use `instanceof CourierParseError` for narrowing                     |

## Package Entry Points

| Import                       | Purpose                                     |
| ----------------------------- | -------------------------------------------- |
| `@vielzeug/courier`           | Main API and types                          |
| `@vielzeug/courier/devtools`  | `debugCourier` — request logger (dev only)  |

## Core Functions

### `createApi()`

```ts
createApi(opts?: TransportOptions): ApiClient;
```

Creates an HTTP client. Use `createCourier()` to share one transport across REST, streams, and the query cache.

**Returns:** `ApiClient`

**Parameters — `TransportOptions`:**

| Option    | Type                      | Default            | Description                                        |
| --------- | ------------------------- | ------------------ | -------------------------------------------------- |
| `baseUrl` | `string`                  | `''`               | Base URL prepended to every request                |
| `fetch`   | `typeof globalThis.fetch` | `globalThis.fetch` | Optional custom fetch implementation               |
| `headers` | `Record<string, string>`  | `{}`               | Default headers sent with every request            |
| `timeout` | `number`                  | `30000`            | Request timeout in ms; must be `> 0` or `Infinity` |

**Methods:**

| Method             | Signature                                                | Description                                                           |
| ------------------ | -------------------------------------------------------- | --------------------------------------------------------------------- |
| `get`              | `<T, P>(url: P, cfg?) => Promise<T>`                     | GET request                                                           |
| `post`             | `<T, P>(url: P, cfg?) => Promise<T>`                     | POST request                                                          |
| `put`              | `<T, P>(url: P, cfg?) => Promise<T>`                     | PUT request                                                           |
| `patch`            | `<T, P>(url: P, cfg?) => Promise<T>`                     | PATCH request                                                         |
| `delete`           | `<T, P>(url: P, cfg?) => Promise<T>`                     | DELETE request                                                        |
| `request`          | `<T, P>(method, url: P, cfg?) => Promise<T>`             | Custom HTTP method                                                    |
| `cancelAll`        | `() => void`                                             | Abort every active request without disposing the client               |
| `getHeaders`       | `() => Readonly<Record<string, string>>`                 | Returns a **snapshot copy** — mutating it has no effect on the client |
| `headers`          | `(updates: Record<string, string \| undefined>) => void` | Update global headers; `undefined` removes a header                   |
| `use`              | `(interceptor: Interceptor) => () => void`               | Add an interceptor; returns a dispose function                        |
| `disposalSignal`   | `AbortSignal` (getter)                                   | Aborted when `dispose()` is called; use to tie external lifetimes     |
| `dispose`          | `() => void`                                             | Dispose the underlying transport when owned by this client            |
| `disposed`         | `boolean` (getter)                                       | Whether `dispose()` has been called                                   |
| `[Symbol.dispose]` | —                                                        | Delegates to `dispose()`; enables `using` declarations                |

**Example:**

```ts
import { createApi } from '@vielzeug/courier';

const api = createApi({ baseUrl: 'https://api.example.com', timeout: 30_000 });
const user = await api.get<User>('/users/{id}', { params: { id: 1 } });
```

---

### `createQuery()`

```ts
createQuery(options?: QueryClientOptions): QueryClient;
```

Creates a query client with caching, deduplication, prefix invalidation, and reactive subscriptions.

`fetch()` always throws on error. Use `observe()` for reactive subscriptions that surface errors as store state.

**Returns:** `QueryClient`

**Parameters — `QueryClientOptions`:**

| Option        | Type                            | Default     | Description                                                                    |
| ------------- | ------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `staleTime`   | `number`                        | `0`         | ms a successful entry is served from cache before the next `fetch()` refetches |
| `gcTime`      | `number`                        | `300000`    | ms before an unobserved cache entry is collected; `Infinity` disables GC       |
| `times`       | `number`                        | `1`         | Total attempts per fetch; `1` means a single try with no retries               |
| `delay`       | `number \| (attempt) => number` | full jitter | Delay between retries; `attempt` is **zero-based** (0 = before the 2nd try)    |
| `shouldRetry` | `(error, attempt) => boolean`   | —           | Return `false` to stop retrying; `attempt` is **zero-based**                   |

**Methods:**

| Method             | Signature                                                               | Description                                                                          |
| ------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `fetch`            | `<T>(options: QueryOptions<T>) => Promise<T>`                           | Fetch with caching, deduplication, and retry; always throws on error                 |
| `fetchMany`        | `<T>(queries: QueryOptions<T>[]) => Promise<T[]>`                       | Parallel fetch for multiple keys; throws if any query fails                          |
| `observe`          | `<T, S = T>(options: ObserveOptions<T, S>) => SyncStore<QueryState<S>>` | Return a store and trigger a background fetch; pass `fetch: false` to skip the fetch |
| `get`              | `<T>(key) => T \| undefined`                                            | Read cached data                                                                     |
| `set`              | `<T>(key, data \| updater, opts?) => void`                              | Set or update cached data; `opts.updatedAt` restores a historical timestamp          |
| `getState`         | `<T>(key) => QueryState<T> \| null`                                     | Full state snapshot                                                                  |
| `observeMany`      | `<T>(keys: QueryKey[]) => SyncStore<QueryState<T>[]>`                   | Observe multiple keys as one combined store; updates on any key change               |
| `invalidate`       | `(key) => void`                                                         | Evict or background-revalidate a key/prefix                                          |
| `remove`           | `(key: QueryKey) => void`                                               | Evict a single entry; aborts any in-flight fetch; resets observers to `'loading'` if active |
| `cancel`           | `(key) => void`                                                         | Cancel an in-flight fetch; entry returns to `'loading'` or retains prior success data |
| `clear`            | `() => void`                                                            | Clear all entries; active subscribers see `'loading'`                                |
| `refetchStale`     | `() => void`                                                            | Manually revalidate all stale observed entries                                       |
| `keys`             | `() => QueryKey[]`                                                      | Returns all currently cached keys — useful for SSR serialization                     |
| `size`             | `number` (getter)                                                       | Number of entries currently held in the cache                                        |
| `cancelAll`        | `() => void`                                                            | Abort all in-flight cache fetches without disposing the client                       |
| `disposalSignal`   | `AbortSignal` (getter)                                                  | Aborted when `dispose()` is called; use to tie external lifecycles                   |
| `dispose`          | `() => void`                                                            | Cancel all in-flight requests and clear all timers                                   |
| `disposed`         | `boolean` (getter)                                                      | Whether `dispose()` has been called                                                  |
| `[Symbol.dispose]` | —                                                                       | Delegates to `dispose()`                                                             |

**Example:**

```ts
import { createQuery } from '@vielzeug/courier';

const qc = createQuery({ staleTime: 30_000 });
const user = await qc.fetch({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
});
```

---

### `createMutation()`

```ts
createMutation<TData, TVariables = void>(
  fn: (input: TVariables, signal: AbortSignal) => Promise<TData>,
  options?: MutationOptions<TData, TVariables>,
): Mutation<TData, TVariables>;
```

Creates a standalone, observable mutation handle.

**Returns:** `Mutation<TData, TVariables>`

**`MutationOptions<TData, TVariables>`:**

| Option            | Type                                                                  | Default     | Description                                                                                                     |
| ----------------- | --------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| `times`           | `number`                                                              | `1`         | Total attempts; `1` means a single try with no retries                                                          |
| `delay`           | `number \| (attempt) => number`                                       | full jitter | Delay between retries; `attempt` is **zero-based** (0 = before the 2nd try)                                     |
| `shouldRetry`     | `(error, attempt) => boolean`                                         | —           | Return `false` to skip retrying; `attempt` is **zero-based**                                                    |
| `onSuccess`       | `(data: TData, variables: TVariables) => void \| Promise<void>`       | —           | Called after a successful run                                                                                   |
| `onError`         | `(error: Error, variables: TVariables) => void \| Promise<void>`      | —           | Called after a failed run; **not** called on abort                                                              |
| `onFinally`       | `(variables: TVariables) => void \| Promise<void>`                    | —           | Called after every run (success, error, abort) before `onSettled`; use for cleanup that does not need the result |
| `onSettled`       | `(result: SettledResult<TData, TVariables>) => void \| Promise<void>` | —           | Called after every run; switch on `result.status` (`'success'`, `'error'`, `'aborted'`) for exhaustive handling |
| `onCallbackError` | `(error: Error) => void`                                              | —           | Called when any lifecycle callback throws; does not affect `mutate()` result                                     |

**Mutation methods:**

| Method             | Signature                                    | Description                                             |
| ------------------ | -------------------------------------------- | ------------------------------------------------------- |
| `mutate`           | `(variables, opts?) => Promise<TData>`       | Execute a run                                           |
| `cancel`           | `() => Promise<void>`                        | Abort the active run and wait for it to settle          |
| `peek`             | `() => MutationState<TData>`                 | Read current state snapshot                             |
| `subscribe`        | `(cb: () => void) => () => void`             | Subscribe to state changes; returns unsubscribe fn      |
| `store`            | `SyncStore<MutationState<TData>>` (property) | Framework-friendly external store; stable reference     |
| `reset`            | `() => void`                                 | Reset back to the `'loading'` baseline state            |
| `dispose`          | `() => void`                                 | Abort active run, clear observers, and mark as disposed |
| `disposed`         | `boolean` (getter)                           | Whether `dispose()` has been called                     |
| `[Symbol.dispose]` | —                                            | Delegates to `dispose()`; enables `using` declarations  |

**Example:**

```ts
import { createMutation } from '@vielzeug/courier';

const addUser = createMutation(
  (input: NewUser, signal: AbortSignal) => api.post<User>('/users', { body: input, signal }),
  {
    onSuccess: (user, variables) => {
      qc.set(['users', user.id], user);
      console.log('Created user with input:', variables);
    },
    onError: (err, variables) => console.error('Failed for input:', variables, err),
    onSettled: (result) => {
      if (result.status === 'success') console.log('Done:', result.data);
      else if (result.status === 'error') console.error('Error:', result.error);
      // result.status === 'aborted' — user cancelled
    },
  },
);

await addUser.mutate({ name: 'Alice' });
```

::: tip Concurrent mutations
When multiple `mutate()` calls run simultaneously, state updates reflect the **latest** call. Lifecycle callbacks (`onSuccess`, `onError`, `onSettled`) fire independently for **every** call — not just the last one. Use `mutation.cancel()` before calling `mutate()` again if you need last-call-wins semantics.
:::

`mutate()` throws `CourierDisposedError` if called after `dispose()` — the mutation function never runs and no lifecycle callbacks fire, matching `createApi`/`createQuery`/`createStream`.

---

### `createCourier()`

```ts
createCourier(opts?: CourierOptions): Courier;
```

Creates a unified Courier client backed by one shared transport.

**Returns:** `Courier`

**`CourierOptions`:**

| Option             | Type                                                                              | Default | Description                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `baseUrl`          | `string`                                                                          | `''`    | Shared base URL for `api` and `stream`                                                                                                     |
| `fetch`            | `typeof fetch`                                                                    | global  | Shared fetch implementation                                                                                                                |
| `headers`          | `Record<string,string>`                                                           | `{}`    | Shared global headers                                                                                                                      |
| `timeout`          | `number`                                                                          | `30000` | REST timeout; streaming connections still default to `Infinity`                                                                            |
| `query`            | `QueryClientOptions`                                                              | —       | Defaults for the embedded query client                                                                                                     |
| `mutationDefaults` | `Pick<MutationOptions, 'times' \| 'delay' \| 'shouldRetry' \| 'onCallbackError'>` | —       | Retry/error-handling defaults merged into every `mutation()` call; lifecycle callbacks are per-mutation since they receive typed variables |

**Courier interface:**

| Property / Method  | Type / Signature              | Description                                                                                           |
| ------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| `api`              | `ApiClient`                   | Shared REST client                                                                                    |
| `stream`           | `StreamClient`                | Shared SSE/readable stream client                                                                     |
| `query`            | `QueryClient`                 | Embedded query client                                                                                 |
| `mutation`         | `(fn, opts?) => Mutation`     | Create a mutation; accepts `invalidates` and `sets` cache shorthands in addition to `MutationOptions` |
| `use`              | `(interceptor) => () => void` | Register an interceptor shared by `api` and `stream`                                                  |
| `headers`          | `(updates) => void`           | Update shared global headers                                                                          |
| `cancelAll`        | `() => void`                  | Abort all active transport-backed requests and streams                                                |
| `disposalSignal`   | `AbortSignal`                 | Aborted when the client is disposed. Use to tie external lifetimes to this client.                    |
| `dispose`          | `() => void`                  | Dispose the transport and embedded query client. Idempotent.                                          |
| `disposed`         | `boolean`                     | `true` after `dispose()` is called                                                                    |
| `[Symbol.dispose]` | —                             | Delegates to `dispose()`                                                                              |

**Example:**

```ts
import { createCourier } from '@vielzeug/courier';

const client = createCourier({
  baseUrl: 'https://api.example.com',
  query: { staleTime: 30_000 },
});

const user = await client.query.fetch({
  key: ['users', 1],
  fn: ({ signal }) => client.api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
});
```

---

### `createStream()`

```ts
createStream(opts?: TransportOptions): StreamClient;
```

Creates a streaming client for SSE and readable HTTP responses. Use `createCourier()` to share one transport across REST, streams, and the query cache.

**Returns:** `StreamClient`

**Stream methods:**

| Method             | Signature                                                | Description                                                       |
| ------------------ | -------------------------------------------------------- | ----------------------------------------------------------------- |
| `sse`              | `<TEvents>(url, opts?) => SseSource<TEvents>`            | Open a Server-Sent Events connection                              |
| `readable`         | `<T>(url, opts?) => AsyncGenerator<T>`                   | Stream text or NDJSON chunks                                      |
| `cancelAll`        | `() => void`                                             | Abort every active SSE or readable stream                         |
| `getHeaders`       | `() => Readonly<Record<string, string>>`                 | Read current global headers                                       |
| `headers`          | `(updates: Record<string, string \| undefined>) => void` | Update shared global headers                                      |
| `use`              | `(interceptor: Interceptor) => () => void`               | Add an interceptor shared by all stream requests                  |
| `disposalSignal`   | `AbortSignal` (getter)                                   | Aborted when `dispose()` is called; use to tie external lifetimes |
| `dispose`          | `() => void`                                             | Dispose the underlying transport when owned by this client        |
| `disposed`         | `boolean` (getter)                                       | Whether `dispose()` has been called                               |
| `[Symbol.dispose]` | —                                                        | Delegates to `dispose()`                                          |

**Example:**

```ts
import { createStream } from '@vielzeug/courier';

const stream = createStream({ baseUrl: 'https://api.example.com' });
const source = stream.sse<{ message: { text: string } }>('/events', { reconnect: true });
source.on('message', (data) => console.log(data.text));
source.dispose();
```

## Errors

### `CourierError`

Base class for all courier errors. Catch with `CourierError.is(e)` to handle any courier error in one branch, then narrow further.

- `name`: `'CourierError'` (overridden by subclasses to their own class name)
- `message`: not auto-prefixed by the base class — classified request/response errors (`CourierHttpError`, `CourierNetworkError`, `CourierTimeoutError`, `CourierAbortError`, `CourierSchemaValidationError`) carry the underlying platform/response message as-is; internally-thrown validation and disposal errors (e.g. `CourierDisposedError`) include a `[courier]` prefix
- Static helper: `CourierError.is(err)` — inherited by every subclass; only checks `instanceof CourierError`, so it does **not** narrow to a specific subclass (use `instanceof <Subclass>` for that, or `CourierHttpError.is(err, status?)` for status-code narrowing)

Hierarchy:

```
CourierError
├── CourierHttpError            — non-2xx response (has status + body)
├── CourierNetworkError         — connection failed, no response received
├── CourierTimeoutError         — request aborted by timeout
├── CourierAbortError           — request cancelled via signal or cancel()
├── CourierSchemaValidationError — schema.parse() rejected the response body
├── CourierDisposedError        — a primitive's primary method was called after dispose()
├── CourierBatcherError         — a batcher's resolve()/resolveSettled() misbehaved
└── CourierParseError           — a response body or path param could not be parsed
```

### `CourierHttpError`

Thrown for non-2xx HTTP responses. Carries the full response metadata.

- `status`, `method`, `url`, `data`, `headers`
- Static helpers: `fromResponse()`, `is(err, status?)`

```ts
import { CourierHttpError } from '@vielzeug/courier';

try {
  await api.get('/users/1');
} catch (err) {
  if (CourierHttpError.is(err, 404)) console.log('Not found');
  else if (CourierHttpError.is(err)) {
    console.log(err.status, err.method, err.url);
    console.log(err.headers?.get('x-request-id'));
  }
}
```

### `CourierNetworkError`

Thrown when the connection fails before any response is received (e.g. DNS failure, refused connection).

- `method`, `url`, `cause`
- Use `instanceof CourierNetworkError` for narrowing.

### `CourierTimeoutError`

Thrown when the request is aborted by the timeout (transport-level or via a timeout `AbortSignal`).

- `method`, `url`, `cause`
- Use `instanceof CourierTimeoutError` for narrowing.

### `CourierAbortError`

Thrown when the request is cancelled explicitly via `cancel()`, `cancelAll()`, or an external `AbortSignal`.

- `method`, `url`
- Use `instanceof CourierAbortError` for narrowing.

```ts
import { CourierAbortError, CourierHttpError, CourierNetworkError, CourierTimeoutError } from '@vielzeug/courier';

try {
  await api.get('/data');
} catch (err) {
  if (CourierHttpError.is(err, 404)) console.log('Not found');
  else if (err instanceof CourierTimeoutError) console.log('Timed out');
  else if (err instanceof CourierAbortError) console.log('Cancelled');
  else if (err instanceof CourierNetworkError) console.log('Network failure:', (err as CourierNetworkError).cause);
}
```

### `CourierSchemaValidationError`

Thrown when `schema.parse()` rejects the parsed response body.

- `name`: `'CourierSchemaValidationError'`
- `data`: the raw (pre-validation) response body
- `cause`: the original error thrown by `schema.parse()`
- Use `instanceof CourierSchemaValidationError` for narrowing — `static is()` exists only on the base `CourierError` (any-courier-error check) and on `CourierHttpError` (status-code narrowing); it is inherited, not overridden, by every other subclass, so `CourierSchemaValidationError.is(err)` would match **any** courier error, not just this one.

```ts
import { CourierSchemaValidationError } from '@vielzeug/courier';

try {
  const user = await api.get<User>('/users/1', { schema: UserSchema });
} catch (err) {
  if (err instanceof CourierSchemaValidationError) {
    console.error('Validation failed for body:', err.data);
    console.error('Cause:', err.cause);
  }
}
```

### `CourierDisposedError`

Thrown when a primitive's primary method is called after its `dispose()` has been called — `api.request()` (and the `get`/`post`/etc. shorthands), `qc.fetch()`/`qc.observe()`, `stream.sse()`/`stream.readable()`, `mutation.mutate()`, and `batcher.load()` all guard against this.

- `message`: `` `[courier] ${clientName} disposed` `` — e.g. `'[courier] Mutation disposed'`
- Use `instanceof CourierDisposedError` for narrowing.

```ts
import { CourierDisposedError, createMutation } from '@vielzeug/courier';

const mutation = createMutation(saveUser);

mutation.dispose();

try {
  await mutation.mutate({ name: 'Alice' });
} catch (err) {
  if (err instanceof CourierDisposedError) console.log('Mutation was already disposed');
}
```

### `CourierBatcherError`

Thrown when a `createBatcher()` batch's `resolve`/`resolveSettled` returns a result array of the wrong length, or throws (synchronously or via a rejected promise) — in either case every pending `load()` call in that batch rejects with this error.

- Use `instanceof CourierBatcherError` for narrowing.

### `CourierParseError`

Thrown when a response body cannot be read or parsed, or when a `{param}` path placeholder cannot be resolved from `params`.

- Use `instanceof CourierParseError` for narrowing.

## Request and Stream Config

### `TransportOptions`

```ts
type TransportOptions = {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
  timeout?: number;
};
```

### `HttpRequestConfig<P>`

```ts
type HttpRequestConfig<P extends string = string> = CourierRequestConfig<P> & {
  fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};
```

`CourierRequestConfig<P>` adds:

| Field          | Type                          | Description                                                                                                |
| -------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `body`         | `unknown`                     | Plain objects are serialized as JSON; `BodyInit` values pass through                                       |
| `dedupe`       | `boolean`                     | Set to `false` to opt out of in-flight deduplication                                                       |
| `dedupeKey`    | `StableValue`                 | Explicit stable key for deduplicating non-idempotent writes                                                |
| `query`        | `Params`                      | Query string parameters                                                                                    |
| `responseType` | `ResponseType`                | Response parsing strategy                                                                                  |
| `schema`       | `{ parse(data: unknown): T }` | Response validation schema; `T` matches the request return type. Throws `CourierSchemaValidationError` on failure |
| `timeout`      | `number`                      | Per-request timeout override                                                                               |

Idempotent requests (`GET`, `HEAD`, `OPTIONS`) dedupe by **method + URL + responseType** automatically. `DELETE` does not auto-dedupe (it has side effects); provide an explicit `dedupeKey` to opt in. Request headers are not part of the automatic dedupe key.

---

### `StreamRequestConfig<P>`

```ts
type StreamRequestConfig<P extends string = string> = {
  body?: unknown;
  /** Raw fetch options for advanced use (credentials, cache, mode, referrer, etc.). */
  fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
  headers?: Record<string, string>;
  method?: string;
  params?: P extends string ? Record<string, string | number | boolean> : never;
  query?: Params;
  signal?: AbortSignal;
  timeout?: number;
};
```

Streaming requests default to `Infinity` timeout per connection when `timeout` is omitted.

### `ReadableConfig<P>`

```ts
type ReadableConfig<P extends string = string> = StreamRequestConfig<P> & {
  onError?: (error: Error) => void;
  parse?: 'ndjson' | 'text';
  reconnect?: boolean | ReconnectOptions;
};
```

- `parse: 'ndjson'` — splits by newline and JSON-parses each complete line, including any partial line at EOF.
- `reconnect` — auto-reconnect on connection loss using the same full-jitter backoff as `sse()`. `true` uses defaults (5 attempts). When the budget is exhausted: throws if `onError` is omitted, calls `onError` if provided.
- `onError` — called when the reconnect budget is exhausted or a non-retriable error occurs. Not called when aborted via signal or `cancelAll()`.

Extends `StreamRequestConfig` with a `parse` option for `stream.readable()`. `'text'` (default) yields raw decoded string chunks; `'ndjson'` splits by newline and JSON-parses each complete line — use the type parameter `T` to type the parsed values.

### `SseOptions<P>`

```ts
type SseOptions<P extends string = string> = StreamRequestConfig<P> & {
  onError?: (error: Error) => void;
  reconnect?: boolean | ReconnectOptions;
};
```

| Field       | Type                          | Description                                               |
| ----------- | ----------------------------- | --------------------------------------------------------- |
| `reconnect` | `boolean \| ReconnectOptions` | `true` uses 5 reconnect attempts with full-jitter backoff |
| `onError`   | `(error: Error) => void`      | Called when reconnect budget is exhausted                 |

### `ReconnectOptions`

```ts
type ReconnectOptions = {
  times?: number;
  delay?: number | ((attempt: number) => number);
};
```

- `times` counts reconnects **after** the first failure
- default `times` is `5`
- clean server closes do **not** reset the reconnect budget

## Types

### `QueryOptions<T>`

```ts
type QueryOptions<T> = {
  enabled?: boolean;
  fn: (ctx: QueryFnContext) => Promise<T>;
  gcTime?: number;
  initialData?: T | (() => T | undefined);
  key: QueryKey;
  staleTime?: number;
} & RetryOptions;
```

`fetch()` always throws on error. Errors surface as rejected promises — no swallow option. For reactive subscriptions that surface errors as state, use `observe()`.

### `ObserveOptions<T, S = T>`

```ts
type ObserveOptions<T, S = T> =
  | ({ fetch?: true } & QueryOptions<T> & ObserveExtras<T, S>)
  | ({ fetch: false; key: QueryKey } & Partial<QueryOptions<T>> & ObserveExtras<T, S>);

type ObserveExtras<T, S> = {
  placeholderData?: S | (() => S | undefined);
  select?: (data: T | undefined) => S | undefined;
};
```

Two forms: `fetch?: true` (default) triggers a background fetch and requires `fn`; `fetch: false` is a read-only store — `fn` is not required or called. `placeholderData` and `select` do not affect the underlying cache or `fetch()` behaviour. `S` defaults to `T`; provide a second generic when using `select` (e.g. `ObserveOptions<User, string>` with `select: (u) => u?.name`).

### `QueryClientOptions`

```ts
type QueryClientOptions = {
  gcTime?: number;
  staleTime?: number;
} & RetryOptions;
```

### `MutationFn<TData, TVariables>`

```ts
type MutationFn<TData, TVariables = void> = (input: TVariables, signal: AbortSignal) => Promise<TData>;
```

### `MutationOptions<TData, TVariables>`

```ts
type MutationOptions<TData = unknown, TVariables = void> = RetryOptions & {
  onCallbackError?: (error: Error) => void;
  onError?: (error: Error, variables: TVariables) => void | Promise<void>;
  onFinally?: (variables: TVariables) => void | Promise<void>;
  onSettled?: (result: SettledResult<TData, TVariables>) => void | Promise<void>;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
};
```

`onError` is not called when the mutation is aborted. `onFinally` runs after `onSuccess`/`onError` and before `onSettled`. `onSettled` is always called — switch on `result.status` for exhaustive handling of `'success'`, `'error'`, and `'aborted'`.

### `CourierMutationOptions<TData, TVariables>`

```ts
type CourierMutationOptions<TData, TVariables> = MutationOptions<TData, TVariables> & {
  invalidates?: QueryKey[];
  sets?: (data: TData, variables: TVariables) => Array<[QueryKey, unknown]>;
};
```

Extra options accepted by `client.mutation()` (not `createMutation()`). Applied automatically on success before `onSuccess` fires.

| Option        | Type                                              | Description                                                                   |
| ------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `invalidates` | `QueryKey[]`                                      | Keys to invalidate in the embedded query cache after a successful run         |
| `sets`        | `(data, variables) => Array<[QueryKey, unknown]>` | Seed one or more cache entries; always return an array of `[key, data]` pairs |

**Example:**

```ts
const createUser = client.mutation(
  (input: NewUser, signal) => client.api.post<User>('/users', { body: input, signal }),
  {
    sets: (user) => [
      [['users', user.id], user],
      [['users', 'latest'], user],
    ],
    invalidates: [['users']],
  },
);
// On success: seeds ['users', user.id] and ['users', 'latest'], then invalidates ['users']
```

---

### `SettledResult<TData, TVariables>`

```ts
type SettledResult<TData, TVariables> =
  | { readonly data: TData; readonly status: 'success'; readonly variables: TVariables }
  | { readonly error: Error; readonly status: 'error'; readonly variables: TVariables }
  | { readonly status: 'aborted'; readonly variables: TVariables };
```

Discriminated union passed to `onSettled`. Switch on `status` for exhaustive handling:

```ts
onSettled: (result) => {
  if (result.status === 'success') console.log(result.data, result.variables);
  else if (result.status === 'error') console.error(result.error, result.variables);
  // 'aborted' — user cancelled; only result.variables is available
},
```

### `RetryOptions`

```ts
type RetryOptions = {
  delay?: number | ((attempt: number) => number);
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  times?: number;
};
```

`times: 1` (the default) means one try with no retries. `delay` defaults to full-jitter exponential backoff capped at 30 s.

### `SyncStore<T>`

```ts
interface SyncStore<T> {
  peek(): T;
  subscribe(onStoreChange: () => void): () => void;
}
```

Returned by `mutation.store` (property), `query.observe()`, and `query.observeMany()`.

### `QueryFn<T>`

```ts
type QueryFn<T> = (ctx: QueryFnContext) => Promise<T>;
```

### `QueryKey`

```ts
type QueryKeyAtom = string | number | boolean | null | { readonly [k: string]: string | number | boolean | null };
type QueryKey = readonly [QueryKeyAtom, ...QueryKeyAtom[]];
```

`QueryKeyAtom` is exported separately for use in factory helpers and key-building utilities.

A non-empty tuple of JSON-safe atoms. Object atoms are allowed and serialized stably — no `Date`, `Map`, `Set`, or `bigint`. This prevents silent serialization bugs when keys are used in persistence.

### `QueryFnContext`

```ts
type QueryFnContext = {
  key: QueryKey;
  signal: AbortSignal;
};
```

### `AsyncStatus`

```ts
type AsyncStatus = 'loading' | 'success' | 'error';
```

- `'loading'` — no data yet; a fetch may or may not be in-flight
- `'success'` — data available; `isFetching` may be `true` during background revalidation
- `'error'` — last operation failed; stale `data` from a prior success may still be present

### `AsyncState<T>`

```ts
type AsyncState<T = unknown> = {
  readonly isFetching: boolean;
  readonly isLoading: boolean; // shorthand for status === 'loading'
} & (
  | { readonly data: undefined; readonly error: null; readonly status: 'loading'; readonly updatedAt: undefined }
  | { readonly data: T; readonly error: null; readonly status: 'success'; readonly updatedAt: number }
  | { readonly data: T | undefined; readonly error: Error; readonly status: 'error'; readonly updatedAt: number }
);
```

`isLoading` is a convenience shorthand for `status === 'loading'`. Use it as a loading-spinner predicate.

### `QueryState<T>`

```ts
type QueryState<T = unknown> = AsyncState<T>;
```

### `MutationState<TData>`

```ts
type MutationState<TData = unknown> = AsyncState<TData>;
```

### `SseSource<TEvents>`

```ts
type SseStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

type SseSource<TEvents extends Record<string, unknown> = Record<string, string>> = {
  readonly closed: boolean;
  readonly status: SseStatus;
  [Symbol.dispose](): void;
  dispose(): void;
  on<K extends keyof TEvents & string>(event: K, handler: (data: TEvents[K]) => void): () => void;
};
```

- `status` transitions: `connecting` → `open` → (`reconnecting` → `connecting`)\* → `closed`
- `closed` is a shorthand for `status === 'closed'`

```ts
type FetchContext = {
  headers: Record<string, string>;
  init: Omit<RequestInit, 'headers'>;
  url: string;
  withHeaders(updates: Record<string, string>): FetchContext;
};
type Interceptor = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;
```

Interceptors must use `ctx.withHeaders(updates)` to add or override headers — this returns a new immutable `FetchContext` and prevents interceptors from stomping each other.

### Return Types

```ts
type ApiClient = ReturnType<typeof createApi>;
type QueryClient = ReturnType<typeof createQuery>;
type Mutation<TData, TVariables = void> = ReturnType<typeof createMutation<TData, TVariables>>;
type StreamClient = ReturnType<typeof createStream>;
type Courier = ReturnType<typeof createCourier>;
```

### `PersistOptions`

```ts
interface PersistOptions {
  /**
   * Keys to persist/hydrate. Either:
   * - `QueryKey[]` — explicit list of keys.
   * - `(key: QueryKey) => boolean` — predicate applied to all cached keys.
   */
  keys: QueryKey[] | ((key: QueryKey) => boolean);
  maxAge?: number;
  onError?: (err: unknown, key: QueryKey) => void;
  prefix?: string; // default: 'courier:'
  storage: PersistStorage;
}
```

- **`keys`** — required. Pass an array of explicit keys or a predicate function filtered against all cached keys.

### `PersistStorage`

```ts
interface PersistStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
}
```

## Utility Functions

### `bindRefetch()`

```ts
bindRefetch(qc: { refetchStale(): void }, opts?: { signal?: AbortSignal }): () => void;
```

Wires up `qc.refetchStale()` to browser lifecycle events — `document visibilitychange` (when tab becomes visible) and `window online`. Returns an unbind function. Fully opt-in.

Pass `opts.signal` (e.g. `qc.disposalSignal`) to automatically remove listeners when the signal aborts — eliminating the need to call the returned unbind function manually on teardown.

**Returns:** `() => void` (unbind function)

**Example:**

```ts
import { bindRefetch, createQuery } from '@vielzeug/courier';

const qc = createQuery({ staleTime: 30_000 });
const unbind = bindRefetch(qc);

// On cleanup:
unbind();
```

---

### `toSyncStore()`

```ts
toSyncStore<T>(source: { peek(): T; subscribe(cb: () => void): Unsubscribe }): SyncStore<T>;
```

Converts any object with `peek()` and `subscribe()` to a plain `SyncStore<T>`. Use when a framework adapter accepts a `SyncStore` directly rather than consuming `peek`/`subscribe` separately.

**Example:**

```ts
import { createMutation, toSyncStore } from '@vielzeug/courier';

const mutation = createMutation(async (input: NewUser) => api.post<User>('/users', { body: input }));

// React
const state = useSyncExternalStore(mutation.store.subscribe, mutation.store.peek);

// Or use toSyncStore to wrap a custom peek/subscribe object
const store = toSyncStore(mutation);
const state2 = useSyncExternalStore(store.subscribe, store.peek);
```

---

### `createBatcher()`

```ts
createBatcher<K, V>(opts: BatcherOptions<K, V>): Batcher<K, V>;
```

`BatcherOptions` requires exactly one of `resolve` or `resolveSettled` (mutually exclusive). `resolve()` must return results in the **same order** as `keys`. A length mismatch, or a throw — synchronous or via a rejected promise — rejects every pending `load()` call in that batch with `CourierBatcherError` (or the thrown value) rather than leaving any of them hanging. `resolveSettled` returns `PromiseSettledResult<V>[]` for per-key error isolation — each `load()` fulfills or rejects independently. After `dispose()`, any subsequent `load()` call rejects immediately.

**Returns:** `Batcher<K, V>`

| Member              | Type                    | Description                                                              |
| ------------------- | ----------------------- | ------------------------------------------------------------------------ |
| `load(key)`         | `Promise<V>`            | Enqueues `key`; returns a promise fulfilled with its result              |
| `dispose()`         | `void`                  | Cancels pending promises, stops scheduled flushes. Idempotent.           |
| `[Symbol.dispose]`  | `void`                  | Alias for `dispose()` — supports `using` declarations                    |
| `disposalSignal`    | `AbortSignal` (getter)  | Aborted when `dispose()` is called; use to tie external lifetimes        |
| `disposed`          | `boolean` (getter)      | `true` after `dispose()`                                                 |

**Example:**

```ts
import { createBatcher } from '@vielzeug/courier';

const userLoader = createBatcher<number, User>({
  resolve: async (ids) => api.post<User[]>('/users/batch', { body: { ids } }),
});

const [alice, bob] = await Promise.all([userLoader.load(1), userLoader.load(2)]);
```

---

### Built-in Interceptor Presets

```ts
withBearerAuth(token: string | (() => string | Promise<string>)): Interceptor;
withRequestId(opts?: { header?: string; generate?: () => string }): Interceptor;
withLogging(opts?: {
  logger?: (msg: string, meta: { duration: number; method: string; status: number; url: string }) => void;
}): Interceptor;
```

`withBearerAuth` accepts a static token or an async factory (for token refresh flows). It correctly handles all `HeadersInit` forms — plain object, `Headers` instance, or array of tuples.

`withRequestId` defaults to `x-request-id` populated with `crypto.randomUUID()`.

`withLogging` defaults to `console.debug`.

**Example:**

```ts
import { withBearerAuth, withLogging, withRequestId } from '@vielzeug/courier';

api.use(withBearerAuth(async () => tokenStore.getAccessToken()));
api.use(withRequestId());
api.use(withLogging());
```

---

### `persistQueryCache()` and `hydrateQueryCache()`

```ts
persistQueryCache(
  qc: QueryClient,
  opts: PersistOptions,
): () => void;

hydrateQueryCache(
  qc: QueryClient,
  opts: PersistOptions,
): Promise<void>;

interface PersistOptions {
  /** Keys to persist/hydrate: explicit `QueryKey[]` list or predicate function. */
  keys: QueryKey[] | ((key: QueryKey) => boolean);
  maxAge?: number;
  onError?: (err: unknown, key: QueryKey) => void;
  prefix?: string;       // default: 'courier:'
  storage: PersistStorage;
}

interface PersistStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
}
```

- `persistQueryCache` returns a stop function. It eagerly persists any already-successful entries on setup.
- `hydrateQueryCache` restores the original `updatedAt` timestamp so staleTime checks are accurate after hydration.
- `maxAge` (ms) — entries older than `Date.now() - maxAge` are skipped during hydration.
- `onError` is called for each failing storage operation; errors are silently swallowed when omitted.

**Returns:** `persistQueryCache` returns `() => void` (stop function); `hydrateQueryCache` returns `Promise<void>`

**Example:**

```ts
import { createQuery, hydrateQueryCache, persistQueryCache } from '@vielzeug/courier';

const qc = createQuery({ staleTime: 60_000 });

await hydrateQueryCache(qc, {
  keys: [['users', userId]],
  maxAge: 24 * 60 * 60_000,
  storage: localStorage,
});

const stop = persistQueryCache(qc, {
  keys: [['users', userId]],
  storage: localStorage,
});
```

---

### `debugCourier()` <Badge type="tip" text="@vielzeug/courier/devtools" />

```ts
debugCourier(options?: CourierOptions): Courier;
```

Equivalent to `createCourier(options)` with `client.use(withLogging())` already registered. Returns the same `Courier` instance — every method is identical to `createCourier()`. Import from the dedicated sub-path so the `console.debug` reference is tree-shaken from production bundles when not imported.

::: warning Development only
`withLogging()` logs the full request URL, including any query parameters — if those may contain tokens or PII, use `createCourier()` with a custom `withLogging({ logger })` that sanitizes the URL instead, or none at all in production.
:::

**Example:**

```ts
import { debugCourier } from '@vielzeug/courier/devtools';

const client = debugCourier({ baseUrl: 'https://api.example.com' });

await client.api.get('/users');
// GET https://api.example.com/users 200 (42ms)
```
