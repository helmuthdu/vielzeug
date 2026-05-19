---
title: Fetchit — API Reference
description: Complete API reference for the Fetchit HTTP client, query client, unified client, SSE, and streaming APIs.
---

[[toc]]

## API At a Glance

| Symbol                  | Purpose                                              | Execution mode | Common gotcha                                                |
| ----------------------- | ---------------------------------------------------- | -------------- | ------------------------------------------------------------ |
| `createApi()`           | Create an HTTP client with defaults and interceptors | Sync           | Uses `TransportOptions`, not `ApiClientOptions`              |
| `createQuery()`         | Create cache/query orchestration utilities           | Sync           | Use `fetch()`, not `query()`                                 |
| `createMutation()`      | Create tracked write handles with cancellation       | Sync           | `maxAttempts: 1` means no retries                            |
| `createFetchit()`       | Create a unified client with shared transport        | Sync           | REST timeout defaults to 30s; streams default to `Infinity`  |
| `createStream()`        | Open SSE or readable HTTP streams                    | Sync           | `reconnect: true` means up to 5 reconnects after a failure   |
| `createTransportCore()` | Expose the shared transport internals                | Sync           | Advanced use only; powers both `createApi()` and `createStream()` |
| `HttpError`             | Structured HTTP/network/abort/timeout errors         | Sync           | Prefer `HttpError.is(err, status?)` for narrowing            |

## Package Entry Points

| Import              | Purpose            |
| ------------------- | ------------------ |
| `@vielzeug/fetchit` | Main API and types |

## Core Functions

### `createApi()`

```ts
createApi(opts?: TransportOptions, sharedTransport?: TransportCore): ApiClient;
```

Creates an HTTP client. When `sharedTransport` is provided, the client reuses the same interceptor pipeline, headers, timeout, and cancellation lifecycle as other Fetchit clients.

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
| `getHeaders`       | `() => Readonly<Record<string, string>>`                 | Read current global headers                                            |
| `headers`          | `(updates: Record<string, string \| undefined>) => void` | Update global headers; `undefined` removes a header                    |
| `use`              | `(interceptor: Interceptor) => () => void`               | Add an interceptor; returns a dispose function                         |
| `dispose`          | `() => void`                                             | Dispose the underlying transport when owned by this client             |
| `disposed`         | `boolean` (getter)                                       | Whether `dispose()` has been called                                    |
| `[Symbol.dispose]` | —                                                        | Delegates to `dispose()`; enables `using` declarations                 |

### `createQuery()`

```ts
createQuery(options?: QueryClientOptions): QueryClient;
```

Creates a query client with caching, deduplication, prefix invalidation, and reactive subscriptions.

**Parameters — `QueryClientOptions`:**

| Option               | Type                            | Default     | Description                                                                |
| -------------------- | ------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `staleTime`          | `number`                        | `0`         | ms a successful entry is served from cache before the next `fetch()` refetches |
| `gcTime`             | `number`                        | `300000`    | ms before an unobserved cache entry is collected; `Infinity` disables GC   |
| `maxAttempts`        | `number`                        | `1`         | Total attempts per fetch; `1` means a single try with no retries           |
| `retryDelay`         | `number \| (attempt) => number` | full jitter | Delay between retries                                                      |
| `shouldRetry`        | `(error, attempt) => boolean`   | —           | Return `false` to stop retrying for a specific error                       |
| `refetchOnFocus`     | `boolean`                       | `false`     | Revalidate stale observed entries when the document regains focus          |
| `refetchOnReconnect` | `boolean`                       | `false`     | Revalidate stale observed entries when the network comes back online       |

**Methods:**

| Method             | Signature                                     | Description                                                                 |
| ------------------ | --------------------------------------------- | --------------------------------------------------------------------------- |
| `fetch`            | `<T>(options: QueryOptions<T>) => Promise<T \| undefined>` | Fetch with caching, deduplication, and retry                              |
| `prefetch`         | `(options) => Promise<void>`                  | Warm cache using fetch semantics                                            |
| `get`              | `<T>(key) => T \| undefined`                  | Read cached data                                                            |
| `set`              | `<T>(key, data \| updater, opts?) => void`   | Set or update cached data                                                   |
| `getState`         | `<T>(key) => QueryState<T> \| null`           | Full state snapshot                                                         |
| `subscribe`        | `<T, S>(key, listener, opts?) => Unsubscribe` | Subscribe immediately to state changes                                      |
| `watch`            | `<T, S>(key, opts?) => SyncStore<QueryState<S>>` | Build a framework-friendly external store without an immediate callback  |
| `invalidate`       | `(key) => void`                               | Evict or background-revalidate a key/prefix                                 |
| `cancel`           | `(key) => void`                               | Cancel an in-flight fetch; state rolls back to `'idle'` or previous success |
| `clear`            | `() => void`                                  | Clear all entries; active subscribers see `'idle'`                          |
| `dispose`          | `() => void`                                  | Cancel all in-flight requests and clear all timers                          |
| `disposed`         | `boolean` (getter)                            | Whether `dispose()` has been called                                         |
| `[Symbol.dispose]` | —                                             | Delegates to `dispose()`                                                    |

### `createMutation()`

```ts
createMutation<TData, TVariables = void>(
  fn: (input: TVariables, signal: AbortSignal) => Promise<TData>,
  options?: MutationOptions<TData>,
): Mutation<TData, TVariables>;
```

Creates a standalone, observable mutation handle.

**`MutationOptions<TData>`:**

| Option            | Type                                      | Default | Description                                                |
| ----------------- | ----------------------------------------- | ------- | ---------------------------------------------------------- |
| `maxAttempts`     | `number`                                  | `1`     | Total attempts; `1` means a single try with no retries     |
| `retryDelay`      | `number \| (attempt) => number`           | full jitter | Delay between retries                                   |
| `shouldRetry`     | `(error, attempt) => boolean`             | —       | Return `false` to skip retrying for a specific error class |
| `onSuccess`       | `(data: TData) => void \| Promise<void>`  | —       | Called after a successful run                              |
| `onError`         | `(error: Error) => void \| Promise<void>` | —       | Called after a failed run, excluding aborts                |
| `onSettled`       | `(data, error) => void \| Promise<void>`  | —       | Called after every run                                     |
| `onCallbackError` | `(error: Error) => void`                  | —       | Optional development hook for callback failures            |

**Mutation methods:**

| Method      | Signature                                         | Description                                            |
| ----------- | ------------------------------------------------- | ------------------------------------------------------ |
| `mutate`    | `(variables, opts?) => Promise<TData>`            | Execute a run                                           |
| `cancel`    | `() => Promise<void>`                             | Abort the active run and wait for it to settle          |
| `getState`  | `() => MutationState<TData>`                      | Read current state                                      |
| `subscribe` | `(listener) => Unsubscribe`                       | Subscribe immediately to mutation state                 |
| `toStore`   | `() => SyncStore<MutationState<TData>>`           | Build a framework-friendly external store               |
| `reset`     | `() => void`                                      | Reset back to the idle state                            |

### `createFetchit()`

```ts
createFetchit(opts?: FetchitOptions): Fetchit;
```

Creates a unified Fetchit client backed by one shared transport.

**`FetchitOptions`:**

| Option             | Type                 | Default | Description                                                       |
| ------------------ | -------------------- | ------- | ----------------------------------------------------------------- |
| `baseUrl`          | `string`             | `''`    | Shared base URL for `api` and `stream`                            |
| `fetch`            | `typeof fetch`       | global  | Shared fetch implementation                                       |
| `headers`          | `Record<string,string>` | `{}` | Shared global headers                                             |
| `timeout`          | `number`             | `30000` | REST timeout; streaming connections still default to `Infinity`   |
| `query`            | `QueryClientOptions` | —       | Defaults for the embedded query client                            |
| `mutationDefaults` | `MutationOptions`    | —       | Defaults merged into every `mutation()` call                      |

**Fetchit interface:**

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

### `createStream()`

```ts
createStream(opts?: TransportOptions, sharedTransport?: TransportCore): StreamClient;
```

Creates a streaming client for SSE and readable HTTP responses. Like `createApi()`, it can reuse a shared `TransportCore`.

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

### `createTransportCore()`

```ts
createTransportCore(opts?: TransportOptions): TransportCore;
```

Exposes the shared transport used internally by both `createApi()` and `createStream()`.

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

## `HttpError`

Thrown for non-2xx HTTP responses and network-level failures.

- `kind`: `'http' | 'network' | 'abort' | 'timeout'`
- `status`, `method`, `url`, `data`, `response`, `headers`
- `isTimeout` and `isAborted`
- Static helpers: `fromResponse()`, `fromCause()`, `is()`

```ts
import { HttpError } from '@vielzeug/fetchit';

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
type HttpRequestConfig<P extends string = string> = FetchitRequestConfig<P> &
  Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'> & {
    headers?: Record<string, string>;
    signal?: AbortSignal;
  };
```

`FetchitRequestConfig<P>` adds:

| Field          | Type             | Description                                                             |
| -------------- | ---------------- | ----------------------------------------------------------------------- |
| `body`         | `unknown`        | Plain objects are serialized as JSON; `BodyInit` values pass through    |
| `dedupe`       | `boolean`        | Set to `false` to opt out of in-flight deduplication                    |
| `dedupeKey`    | `StableValue`    | Explicit stable key for deduplicating non-idempotent writes             |
| `query`        | `Params`         | Query string parameters                                                 |
| `responseType` | `ResponseType`   | Response parsing strategy                                               |
| `timeout`      | `number`         | Per-request timeout override                                            |

Idempotent requests (`GET`, `HEAD`, `OPTIONS`, `DELETE`) dedupe by **method + URL + responseType**. Request headers are no longer part of the automatic dedupe key.

### `StreamRequestConfig<P>`

```ts
type StreamRequestConfig<P extends string = string> = {
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
  params?: P extends string ? Record<string, string | number | boolean> : never;
  query?: Params;
  signal?: AbortSignal;
  timeout?: number;
} & Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
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
  maxAttempts?: number;
  retryDelay?: number | ((attempt: number) => number);
};
```

- `maxAttempts` counts reconnects **after** the first failure
- default `maxAttempts` is `5`
- clean server closes do **not** reset the reconnect budget

## Query and Mutation Types

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
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
  staleTime?: number;
} & RetryOptions;
```

### `MutationFn<TData, TVariables>`

```ts
type MutationFn<TData, TVariables = void> = (input: TVariables, signal: AbortSignal) => Promise<TData>;
```

### `MutationOptions<TData>`

```ts
type MutationOptions<TData = unknown> = RetryOptions & {
  onCallbackError?: (error: Error) => void;
  onError?: (error: Error) => void | Promise<void>;
  onSettled?: (data: TData | undefined, error: Error | null) => void | Promise<void>;
  onSuccess?: (data: TData) => void | Promise<void>;
};
```

### `RetryOptions`

```ts
type RetryOptions = {
  maxAttempts?: number;
  retryDelay?: number | ((attempt: number) => number);
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};
```

`maxAttempts: 1` means one try with no retries.

## State and Store Types

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

## Transport and Client Types

### `FetchContext` and `Interceptor`

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
type Fetchit = ReturnType<typeof createFetchit>;
type TransportCore = ReturnType<typeof createTransportCore>;
```

## Retry Utilities

```ts
const NO_RETRY = 1;

toError(err: unknown): Error;
sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void>;
runWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  retryDelay?: number | ((attempt: number) => number),
  shouldRetry?: (error: unknown, attempt: number) => boolean,
  signal?: AbortSignal,
): Promise<T>;
```

- `NO_RETRY` is the canonical constant for a single attempt with no retries
- `runWithRetry()` uses full-jitter exponential backoff by default
- `attempt` passed to `retryDelay` and `shouldRetry` is zero-based
