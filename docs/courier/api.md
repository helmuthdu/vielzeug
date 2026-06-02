---
title: Courier — API Reference
description: Complete API reference for the Courier HTTP client, query client, unified client, SSE, and streaming APIs.
---

[[toc]]

## API At a Glance

| Symbol                  | Purpose                                              | Execution mode | Common gotcha                                                |
| ----------------------- | ---------------------------------------------------- | -------------- | ------------------------------------------------------------ |
| `createApi()`           | Create an HTTP client with defaults and interceptors | Sync           | Uses `TransportOptions`, not `ApiClientOptions`              |
| `createQuery()`         | Create cache/query orchestration utilities           | Sync           | Use `fetch()`, not `query()`                                 |
| `createMutation()`      | Create tracked write handles with cancellation       | Sync           | `times: 1` means no retries; lifecycle callbacks receive `variables` |
| `createCourier()`       | Create a unified client with shared transport        | Sync           | REST timeout defaults to 30s; streams default to `Infinity`  |
| `createStream()`        | Open SSE or readable HTTP streams                    | Sync           | `reconnect: true` means up to 5 reconnects after a failure   |
| `createTransportCore()` | Expose the shared transport internals                | Sync           | Advanced use only; powers both `createApi()` and `createStream()` |
| `bindRefetch()`         | Opt-in focus/reconnect revalidation binding          | Sync           | Returns unbind fn; call it on cleanup                        |
| `createBatcher()`       | DataLoader-style request coalescing                  | Sync           | `resolve()` must return results in the same order as keys    |
| `withBearerAuth()`      | Interceptor preset for Bearer token injection        | Sync           | Accepts static string or async token factory                 |
| `withRequestId()`       | Interceptor preset adding a unique request ID header | Sync           | Defaults to `x-request-id` with `crypto.randomUUID()`        |
| `withLogging()`         | Interceptor preset logging method/URL/status/ms      | Sync           | Defaults to `console.debug`; override with `logger` option   |
| `persistQueryCache()`   | Subscribe to cache and write successful entries      | Sync           | Eagerly persists existing successful entries on setup        |
| `hydrateQueryCache()`   | Read persisted entries and seed the cache            | Async          | Runs all keys in parallel; restores original `updatedAt`     |
| `resolveRetryDelay()`   | Compute a jitter-based retry delay for a given attempt | Sync         | Useful for custom retry strategies consistent with Courier defaults |
| `NO_RETRY`              | Constant (`1`) for "no retries" — one attempt total  | —              | Equivalent to `times: 1`; exported for explicit, readable code  |
| `HttpError`             | Structured HTTP/network/abort/timeout errors         | Sync           | Prefer `HttpError.is(err, status?)` for narrowing            |

## Package Entry Point

| Import              | Purpose            |
| ------------------- | ------------------ |
| `@vielzeug/courier` | Main API and types |

## Core Functions

### `createApi()`

```ts
createApi(opts?: TransportOptions, sharedTransport?: TransportCore): ApiClient;
```

Creates an HTTP client. When `sharedTransport` is provided, the client reuses the same interceptor pipeline, headers, timeout, and cancellation lifecycle as other Courier clients.

**Returns:** `ApiClient`

**Parameters — `TransportOptions`:**

| Option    | Type                      | Default            | Description                                        |
| --------- | ------------------------- | ------------------ | -------------------------------------------------- |
| `baseUrl` | `string`                  | `''`               | Base URL prepended to every request                |
| `fetch`   | `typeof globalThis.fetch` | `globalThis.fetch` | Optional custom fetch implementation               |
| `headers` | `Record<string, string>`  | `{}`               | Default headers sent with every request            |
| `timeout` | `number`                  | `30000`            | Request timeout in ms; must be `> 0` or `Infinity` |

**Methods:**

| Method             | Signature                                                | Description                                                            |
| ------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `get`              | `<T, P>(url: P, cfg?) => Promise<T>`                     | GET request                                                            |
| `post`             | `<T, P>(url: P, cfg?) => Promise<T>`                     | POST request                                                           |
| `put`              | `<T, P>(url: P, cfg?) => Promise<T>`                     | PUT request                                                            |
| `patch`            | `<T, P>(url: P, cfg?) => Promise<T>`                     | PATCH request                                                          |
| `delete`           | `<T, P>(url: P, cfg?) => Promise<T>`                     | DELETE request                                                         |
| `request`          | `<T, P>(method, url: P, cfg?) => Promise<T>`             | Custom HTTP method                                                     |
| `cancelAll`        | `() => void`                                             | Abort every active request without disposing the client                |
| `getHeaders`       | `() => Readonly<Record<string, string>>`                 | Returns a **snapshot copy** — mutating it has no effect on the client  |
| `headers`          | `(updates: Record<string, string \| undefined>) => void` | Update global headers; `undefined` removes a header                    |
| `use`              | `(interceptor: Interceptor) => () => void`               | Add an interceptor; returns a dispose function                         |
| `dispose`          | `() => void`                                             | Dispose the underlying transport when owned by this client             |
| `disposed`         | `boolean` (getter)                                       | Whether `dispose()` has been called                                    |
| `[Symbol.dispose]` | —                                                        | Delegates to `dispose()`; enables `using` declarations                 |

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

**Returns:** `QueryClient`

**Parameters — `QueryClientOptions`:**

| Option        | Type                            | Default     | Description                                                                     |
| ------------- | ------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| `staleTime`   | `number`                        | `0`         | ms a successful entry is served from cache before the next `fetch()` refetches  |
| `gcTime`      | `number`                        | `300000`    | ms before an unobserved cache entry is collected; `Infinity` disables GC        |
| `times`       | `number`                        | `1`         | Total attempts per fetch; `1` means a single try with no retries                |
| `delay`       | `number \| (attempt) => number` | full jitter | Delay between retries                                                           |
| `shouldRetry` | `(error, attempt) => boolean`   | —           | Return `false` to stop retrying for a specific error                            |

**Methods:**

| Method             | Signature                                     | Description                                                                 |
| ------------------ | --------------------------------------------- | --------------------------------------------------------------------------- |
| `fetch`            | `<T>(options: QueryOptions<T>) => Promise<T \| undefined>` | Fetch with caching, deduplication, and retry                    |
| `prefetch`         | `(options) => Promise<void>`                  | Warm cache using fetch semantics                                            |
| `get`              | `<T>(key) => T \| undefined`                  | Read cached data                                                            |
| `set`              | `<T>(key, data \| updater, opts?) => void`    | Set or update cached data; `opts.updatedAt` restores a historical timestamp |
| `getState`         | `<T>(key) => QueryState<T> \| null`           | Full state snapshot                                                         |
| `subscribe`        | `<T, S>(key, listener, opts?) => Unsubscribe` | Subscribe to future state changes; **not** called immediately on attach     |
| `watch`            | `<T, S>(key, opts?) => SyncStore<QueryState<S>>` | Build a framework-friendly external store without an immediate callback  |
| `invalidate`       | `(key) => void`                               | Evict or background-revalidate a key/prefix                                 |
| `cancel`           | `(key) => void`                               | Cancel an in-flight fetch; state rolls back to `'idle'` or previous success |
| `clear`            | `() => void`                                  | Clear all entries; active subscribers see `'idle'`                          |
| `refetchStale`     | `() => void`                                  | Manually revalidate all stale observed entries                              |
| `dispose`          | `() => void`                                  | Cancel all in-flight requests and clear all timers                          |
| `disposed`         | `boolean` (getter)                            | Whether `dispose()` has been called                                         |
| `[Symbol.dispose]` | —                                             | Delegates to `dispose()`                                                    |

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

| Option            | Type                                                            | Default | Description                                                |
| ----------------- | --------------------------------------------------------------- | ------- | ---------------------------------------------------------- |
| `times`           | `number`                                                        | `1`     | Total attempts; `1` means a single try with no retries     |
| `delay`           | `number \| (attempt) => number`                                 | full jitter | Delay between retries                                   |
| `shouldRetry`     | `(error, attempt) => boolean`                                   | —       | Return `false` to skip retrying for a specific error class |
| `onSuccess`       | `(data: TData, variables: TVariables) => void \| Promise<void>` | —       | Called after a successful run                              |
| `onError`         | `(error: Error, variables: TVariables) => void \| Promise<void>` | —      | Called after a failed run; **not** called on abort         |
| `onSettled`       | `(data, error, variables: TVariables) => void \| Promise<void>` | —       | Called after every run including aborts (`error` is `null` for success and abort) |
| `onCallbackError` | `(error: Error) => void`                                        | —       | Called when `onSuccess`/`onError`/`onSettled` throws; does not affect `mutate()` result |

**Mutation methods:**

| Method      | Signature                                         | Description                                            |
| ----------- | ------------------------------------------------- | ------------------------------------------------------ |
| `mutate`    | `(variables, opts?) => Promise<TData>`            | Execute a run                                           |
| `cancel`    | `() => Promise<void>`                             | Abort the active run and wait for it to settle          |
| `getState`  | `() => MutationState<TData>`                      | Read current state                                      |
| `subscribe` | `(listener) => Unsubscribe`                       | Subscribe immediately to mutation state                 |
| `toStore`   | `() => SyncStore<MutationState<TData>>`           | Build a framework-friendly external store               |
| `reset`     | `() => void`                                      | Reset back to the idle state                            |

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
  },
);

await addUser.mutate({ name: 'Alice' });
```

::: tip Concurrent mutations
When multiple `mutate()` calls run simultaneously, state updates reflect the **latest** call. Lifecycle callbacks (`onSuccess`, `onError`, `onSettled`) fire independently for **every** call — not just the last one. Use `mutation.cancel()` before calling `mutate()` again if you need last-call-wins semantics.
:::

---

```ts
createCourier(opts?: CourierOptions): Courier;
```

Creates a unified Courier client backed by one shared transport.

**Returns:** `Courier`

**`CourierOptions`:**

| Option             | Type                 | Default | Description                                                       |
| ------------------ | -------------------- | ------- | ----------------------------------------------------------------- |
| `baseUrl`          | `string`             | `''`    | Shared base URL for `api` and `stream`                            |
| `fetch`            | `typeof fetch`       | global  | Shared fetch implementation                                       |
| `headers`          | `Record<string,string>` | `{}` | Shared global headers                                             |
| `timeout`          | `number`             | `30000` | REST timeout; streaming connections still default to `Infinity`   |
| `query`            | `QueryClientOptions` | —       | Defaults for the embedded query client                            |
| `mutationDefaults` | `Pick<MutationOptions, 'times' \| 'delay' \| 'shouldRetry' \| 'onCallbackError'>` | — | Retry/error-handling defaults merged into every `mutation()` call; lifecycle callbacks are per-mutation since they receive typed variables |

**Courier interface:**

| Property / Method  | Type / Signature                                | Description                                              |
| ------------------ | ----------------------------------------------- | -------------------------------------------------------- |
| `api`              | `ApiClient`                                     | Shared REST client                                       |
| `stream`           | `StreamClient`                                  | Shared SSE/readable stream client                        |
| `query`            | `QueryClient`                                   | Embedded query client                                    |
| `mutation`         | `(fn, opts?) => Mutation`                       | Create a mutation using optional shared defaults         |
| `use`              | `(interceptor) => () => void`                   | Register an interceptor shared by `api` and `stream`     |
| `headers`          | `(updates) => void`                             | Update shared global headers                             |
| `cancelAll`        | `() => void`                                    | Abort all active transport-backed requests and streams   |
| `dispose`          | `() => void`                                    | Dispose the transport and embedded query client          |
| `disposed`         | `boolean`                                       | Whether the shared transport is disposed                 |
| `[Symbol.dispose]` | —                                               | Delegates to `dispose()`                                 |

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
createStream(opts?: TransportOptions, sharedTransport?: TransportCore): StreamClient;
```

Creates a streaming client for SSE and readable HTTP responses. Like `createApi()`, it can reuse a shared `TransportCore`.

**Returns:** `StreamClient`

**Stream methods:**

| Method             | Signature                                                | Description                                                      |
| ------------------ | -------------------------------------------------------- | ---------------------------------------------------------------- |
| `sse`              | `<TEvents>(url, opts?) => SseSource<TEvents>`            | Open a Server-Sent Events connection                             |
| `readable`         | `<T>(url, opts?) => AsyncGenerator<T>`                   | Stream text or NDJSON chunks                                     |
| `cancelAll`        | `() => void`                                             | Abort every active SSE or readable stream                        |
| `getHeaders`       | `() => Readonly<Record<string, string>>`                 | Read current global headers                                      |
| `headers`          | `(updates: Record<string, string \| undefined>) => void` | Update shared global headers                                     |
| `use`              | `(interceptor: Interceptor) => () => void`               | Add an interceptor shared by all stream requests                 |
| `dispose`          | `() => void`                                             | Dispose the underlying transport when owned by this client       |
| `disposed`         | `boolean` (getter)                                       | Whether `dispose()` has been called                              |
| `[Symbol.dispose]` | —                                                        | Delegates to `dispose()`                                         |

**Example:**

```ts
import { createStream } from '@vielzeug/courier';

const stream = createStream({ baseUrl: 'https://api.example.com' });
const source = stream.sse<{ message: { text: string } }>('/events', { reconnect: true });
source.on('message', (data) => console.log(data.text));
source.close();
```

---

### `createTransportCore()`

```ts
createTransportCore(opts?: TransportOptions): TransportCore;
```

Exposes the shared transport used internally by both `createApi()` and `createStream()`.

**Returns:** `TransportCore`

**TransportCore methods:**

| Method       | Signature                                                | Description                                  |
| ------------ | -------------------------------------------------------- | -------------------------------------------- |
| `dispatch`   | `(ctx: FetchContext) => Promise<Response>`               | Run a request through the interceptor chain  |
| `mergeHeaders` | `(perRequest?, extra?) => Record<string, string>`      | Merge normalized headers                     |
| `getHeaders` | `() => Readonly<Record<string, string>>`                 | Read current global headers                  |
| `headers`    | `(updates: Record<string, string \| undefined>) => void` | Update global headers                        |
| `use`        | `(interceptor: Interceptor) => () => void`               | Add an interceptor                           |
| `track`      | `(controller: AbortController) => () => void`            | Register an AbortController for lifecycle tracking |
| `cancelAll`  | `() => void`                                             | Abort all tracked controllers                |
| `dispose`    | `() => void`                                             | Abort controllers and clear interceptors     |
| `baseUrl`    | `string`                                                 | Shared base URL                              |
| `timeout`    | `number`                                                 | Shared default timeout                       |
| `disposed`   | `boolean`                                                | Whether the transport is disposed            |

**Example:**

```ts
import { createApi, createStream, createTransportCore } from '@vielzeug/courier';

// Share one interceptor pipeline across api and stream
const transport = createTransportCore({ baseUrl: 'https://api.example.com' });
transport.use(async (ctx, next) => { /* shared middleware */ return next(ctx); });

const api = createApi({}, transport);
const stream = createStream({}, transport);
```

## Errors

### `HttpError`

Thrown for non-2xx HTTP responses, network failures, abort, and timeout.

- `kind`: `'http' | 'network' | 'abort' | 'timeout'`
- `status`, `method`, `url`, `data`, `headers`
- `isTimeout` and `isAborted`
- Static helpers: `fromResponse()`, `fromCause()`, `is()`

```ts
import { HttpError } from '@vielzeug/courier';

try {
  await api.get('/users/1');
} catch (err) {
  if (HttpError.is(err, 404)) console.log('Not found');
  else if (HttpError.is(err)) {
    console.log(err.status, err.method, err.url);
    console.log(err.headers?.get('x-request-id'));
  }
}
```

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

| Field          | Type             | Description                                                             |
| -------------- | ---------------- | ----------------------------------------------------------------------- |
| `body`         | `unknown`        | Plain objects are serialized as JSON; `BodyInit` values pass through    |
| `dedupe`       | `boolean`        | Set to `false` to opt out of in-flight deduplication                    |
| `dedupeKey`    | `StableValue`    | Explicit stable key for deduplicating non-idempotent writes             |
| `query`        | `Params`         | Query string parameters                                                 |
| `responseType` | `ResponseType`   | Response parsing strategy                                               |
| `timeout`      | `number`         | Per-request timeout override                                            |

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

### `SseOptions<P>`

```ts
type SseOptions<P extends string = string> = StreamRequestConfig<P> & {
  onError?: (error: Error) => void;
  reconnect?: boolean | ReconnectOptions;
};
```

| Field       | Type                              | Description                                                  |
| ----------- | --------------------------------- | ------------------------------------------------------------ |
| `reconnect` | `boolean \| ReconnectOptions`     | `true` uses 5 reconnect attempts with full-jitter backoff    |
| `onError`   | `(error: Error) => void`          | Called when reconnect budget is exhausted                    |

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

### `PrefetchOptions<T>`

```ts
type PrefetchOptions<T> = QueryOptions<T> & {
  throwOnError?: boolean;
};
```

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
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void | Promise<void>;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
};
```

`onError` is not called when the mutation is aborted. `onSettled` is always called — `error` is `null` for both success and abort outcomes.

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

Returned by `mutation.toStore()` and `query.watch()`.

### `QueryKey`

```ts
type QueryKey = readonly StableValue[];
```

### `QueryFnContext`

```ts
type QueryFnContext = {
  key: QueryKey;
  signal: AbortSignal;
};
```

### `AsyncState<T>`

```ts
type AsyncState<T = unknown> =
  | { readonly data: undefined; readonly error: null; readonly isFetching: false; readonly status: 'idle'; readonly updatedAt: undefined }
  | { readonly data: T | undefined; readonly error: null; readonly isFetching: true; readonly status: 'pending'; readonly updatedAt: number | undefined }
  | { readonly data: T; readonly error: null; readonly isFetching: boolean; readonly status: 'success'; readonly updatedAt: number }
  | { readonly data: T | undefined; readonly error: Error; readonly isFetching: boolean; readonly status: 'error'; readonly updatedAt: number };
```

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
type SseSource<TEvents extends Record<string, unknown> = Record<string, string>> = {
  close(): void;
  on<K extends keyof TEvents & string>(event: K, handler: (data: TEvents[K]) => void): () => void;
};
```

```ts
type FetchContext = { init: RequestInit; url: string };
type Interceptor = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;
```

### Return Types

```ts
type ApiClient = ReturnType<typeof createApi>;
type QueryClient = ReturnType<typeof createQuery>;
type Mutation<TData, TVariables = void> = ReturnType<typeof createMutation<TData, TVariables>>;
type StreamClient = ReturnType<typeof createStream>;
type Courier = ReturnType<typeof createCourier>;
type TransportCore = ReturnType<typeof createTransportCore>;
```

### `BatcherOptions<K, V>`

```ts
type BatcherOptions<K, V> = {
  maxSize?: number;
  resolve: (keys: K[]) => Promise<V[]>;
  window?: number;
};
```

### `Batcher<K, V>`

```ts
type Batcher<K, V> = {
  dispose(): void;
  load(key: K): Promise<V>;
};
```

### `PersistOptions`

```ts
interface PersistOptions {
  include?: (key: QueryKey) => boolean;
  maxAge?: number;
  onError?: (err: unknown, key: QueryKey) => void;
  prefix?: string;
  storage: PersistStorage;
}
```

### `PersistStorage`

```ts
interface PersistStorage {
  getItem(key: string): Promise<string | null> | string | null;
  removeItem(key: string): Promise<void> | void;
  setItem(key: string, value: string): Promise<void> | void;
}
```

## Utility Functions

### `bindRefetch()`

```ts
bindRefetch(qc: { refetchStale(): void }): () => void;
```

Wires up `qc.refetchStale()` to browser lifecycle events — `document visibilitychange` (when tab becomes visible) and `window online`. Returns an unbind function. Fully opt-in.

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

### `NO_RETRY`

```ts
const NO_RETRY = 1;
```

A named constant for "no retries" — equivalent to `times: 1`. Use it in `RetryOptions` or `QueryClientOptions` for explicit, self-documenting code.

**Example:**

```ts
import { createQuery, NO_RETRY } from '@vielzeug/courier';

const qc = createQuery({ times: NO_RETRY });
```

---

### `createBatcher()`

```ts
createBatcher<K, V>(opts: BatcherOptions<K, V>): Batcher<K, V>;

type BatcherOptions<K, V> = {
  maxSize?: number;        // default: 25
  resolve: (keys: K[]) => Promise<V[]>;
  window?: number;         // ms, default: 0 (next microtask)
};

type Batcher<K, V> = {
  load(key: K): Promise<V>;
  dispose(): void;
};
```

`resolve()` must return results in the **same order** as `keys`. A length mismatch rejects all pending promises. After `dispose()`, any subsequent `load()` call rejects immediately.

**Returns:** `Batcher<K, V>`

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
  opts: PersistOptions & { keys: QueryKey[] },
): () => void;

hydrateQueryCache(
  qc: QueryClient,
  opts: PersistOptions & { keys: QueryKey[] },
): Promise<void>;

interface PersistOptions {
  include?: (key: QueryKey) => boolean;
  maxAge?: number;
  onError?: (err: unknown, key: QueryKey) => void;
  prefix?: string;       // default: 'courier:'
  storage: PersistStorage;
}

interface PersistStorage {
  getItem(key: string): Promise<string | null> | string | null;
  removeItem(key: string): Promise<void> | void;
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
