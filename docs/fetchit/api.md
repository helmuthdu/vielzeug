---
title: Fetchit — API Reference
description: Complete API reference for the Fetchit HTTP client, query client, and standalone mutation.
---

[[toc]]

## API At a Glance

| Symbol              | Purpose                                              | Execution mode | Common gotcha                                       |
| ------------------- | ---------------------------------------------------- | -------------- | --------------------------------------------------- |
| `createApi()`       | Create an HTTP client with defaults and interceptors | Sync           | Set a baseUrl to avoid relative path surprises      |
| `createQuery()`     | Create cache/query orchestration utilities           | Sync           | Invalidate keys after mutations to avoid stale data |
| `createMutation()`  | Create tracked write handles with cancellation       | Sync           | `mutationFn` receives `(input, signal)`             |
| `mutation.mutate()` | Execute a mutation run and update mutation state     | Async          | Use `mutation.cancel()` or external `AbortSignal`   |
| `HttpError`         | Structured HTTP/network/abort/timeout errors         | Sync           | Prefer `HttpError.is(err, status?)` for narrowing   |

## Package Entry Points

| Import                   | Purpose            |
| ------------------------ | ------------------ |
| `@vielzeug/fetchit`      | Main API and types |

## Core Functions

### `createApi()`

```ts
createApi(options?: ApiClientOptions): ApiClient;
```

Creates an HTTP client. Returns an `ApiClient`.

**Parameters — `ApiClientOptions`:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `''` | Base URL prepended to every request |
| `fetch` | `typeof globalThis.fetch` | `globalThis.fetch` | Optional custom fetch implementation |
| `headers` | `Record<string, string>` | `{}` | Default headers sent with every request |
| `timeout` | `number` | `30000` | Request timeout in ms; must be `> 0` or `Infinity` |

**Returns:** `ApiClient`

**Example:**

```ts
import { createApi } from '@vielzeug/fetchit';

const api = createApi({
  baseUrl: 'https://api.example.com',
  timeout: 10_000,
  headers: { Authorization: 'Bearer token' },
  fetch: globalThis.fetch,
});

const user = await api.get<User>('/users/{id}', { params: { id: 1 } });
const created = await api.post<User>('/users', { body: newUser });
```

**Methods:**

| Method             | Signature                                                | Description                                                     |
| ------------------ | -------------------------------------------------------- | --------------------------------------------------------------- |
| `get`              | `<T, P>(url: P, cfg?) => Promise<T>`                     | GET request                                                     |
| `post`             | `<T, P>(url: P, cfg?) => Promise<T>`                     | POST request                                                    |
| `put`              | `<T, P>(url: P, cfg?) => Promise<T>`                     | PUT request                                                     |
| `patch`            | `<T, P>(url: P, cfg?) => Promise<T>`                     | PATCH request                                                   |
| `delete`           | `<T, P>(url: P, cfg?) => Promise<T>`                     | DELETE request                                                  |
| `request`          | `<T, P>(method, url: P, cfg?) => Promise<T>`             | Custom HTTP method                                              |
| `headers`          | `(updates: Record<string, string \| undefined>) => void` | Update global headers; `undefined` value removes the header     |
| `use`              | `(interceptor: Interceptor) => () => void`               | Add an interceptor; returns a dispose function                  |
| `dispose`          | `() => void`                                             | Cancel all in-flight dedup requests and remove all interceptors |
| `disposed`         | `boolean` (getter)                                       | Whether `dispose()` has been called                             |
| `[Symbol.dispose]` | —                                                        | Delegates to `dispose()`; enables `using` declarations          |

---

### `createQuery()`

```ts
createQuery(options?: QueryClientOptions): QueryClient;
```

Creates a query client with caching, deduplication, and reactive subscriptions. Returns a `QueryClient`.

**Parameters — `QueryClientOptions`:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `staleTime` | `number` | `0` | ms a successful entry is served from cache before next `query()` refetches |
| `gcTime` | `number` | `300000` | ms before an unobserved cache entry is collected; `Infinity` disables GC |
| `retry` | `number` | `1` | Default retry attempts for all queries |
| `retryDelay` | `number \| (attempt) => number` | exponential | Delay between retries; defaults to exponential backoff |
| `shouldRetry` | `(error, attempt) => boolean` | — | Return `false` to skip retrying for a specific error class |

**Returns:** `QueryClient`

**Example:**

```ts
import { createQuery } from '@vielzeug/fetchit';

const qc = createQuery({ staleTime: 5_000, gcTime: 300_000 });

const user = await qc.query({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
  retry: 3,
  shouldRetry: (err) => !HttpError.is(err) || (err.status ?? 500) >= 500,
});
```

**Methods:**

| Method             | Signature                                     | Description                                                  |
| ------------------ | --------------------------------------------- | ------------------------------------------------------------ |
| `query`            | `<T>(options: QueryOptions<T>) => Promise<T>` | Fetch with caching and retry                                 |
| `prefetch`         | `(options) => Promise<void>`                  | Warm cache using query semantics                             |
| `get`              | `<T>(key) => T \| undefined`                  | Read cached data                                             |
| `set`              | `<T>(key, data \| updater) => void`           | Set or update cached data                                    |
| `getState`         | `<T>(key) => QueryState<T> \| null`           | Full state snapshot                                          |
| `subscribe`        | `<T>(key, listener) => Unsubscribe`           | Subscribe to state changes; fires immediately                |
| `invalidate`       | `(key) => void`                               | Evict key/prefix (observed keys reset to `idle`)             |
| `cancel`           | `(key) => void`                               | Cancel in-flight request; state → `'idle'` or `'success'`    |
| `clear`            | `() => void`                                  | Clear all entries; notifies active subscribers with `'idle'` |
| `dispose`          | `() => void`                                  | Cancel all in-flight requests and clear all timers           |
| `disposed`         | `boolean` (getter)                            | Whether `dispose()` has been called                          |
| `[Symbol.dispose]` | —                                             | Delegates to `dispose()`                                     |

---

### `createMutation()`

```ts
createMutation<TData, TVariables = void>(
  fn: (input: TVariables, signal: AbortSignal) => Promise<TData>,
  options?: MutationOptions,
): Mutation<TData, TVariables>;
```

Creates a standalone, observable mutation handle. Returns a `Mutation<TData, TVariables>`.

**Parameters:**

- `fn: (input: TVariables, signal: AbortSignal) => Promise<TData>` — The mutation function
- `options?: MutationOptions`

`signal` is always provided by Fetchit.

**`MutationOptions`:**

| Option        | Type                            | Default     | Description                                                |
| ------------- | ------------------------------- | ----------- | ---------------------------------------------------------- |
| `retry`       | `number`                        | `0`         | Retry attempts on failure                                  |
| `retryDelay`  | `number \| (attempt) => number` | exponential | Delay between retries                                      |
| `shouldRetry` | `(error, attempt) => boolean`   | —           | Return `false` to skip retrying for a specific error class |

**Returns:** `Mutation<TData, TVariables>` with:

- `mutate(variables, opts?) => Promise<TData>`
- `cancel() => void`
- `getState() => MutationState<TData>`
- `subscribe(listener) => Unsubscribe`
- `reset() => void`

`mutate()` accepts call-level options:

| Option | Type | Description |
| --- | --- | --- |
| `signal` | `AbortSignal` | Optional external signal merged with mutation-local cancellation |

**Example:**

```ts
import { createMutation } from '@vielzeug/fetchit';

const createUser = createMutation((input: NewUser, signal: AbortSignal) =>
  api.post<User>('/users', { body: input, signal }),
);

const unsub = createUser.subscribe((state) => {
  if (state.status === 'pending') showSpinner();
  if (state.status === 'success') hideSpinner();
  if (state.status === 'error') showError(state.error);
});

await createUser.mutate({ name: 'Alice', email: 'alice@example.com' });
qc.invalidate(['users']);
createUser.reset();
unsub();
```

## `HttpError`

Thrown for non-2xx HTTP responses and network-level failures (timeout, abort, connection error).

`HttpError` extends `Error` and includes:

- `name`, `url`, `method`, `status`, `data`, `response`
- `kind` (`'http' | 'network' | 'abort' | 'timeout'`)
- `isTimeout` and `isAborted`
- `fromResponse(res, data, method, url)`
- `fromCause(cause, method, url)`
- `is(err, status?)`

**`HttpError.is(err, status?)`** — type-safe narrowing helper:

```ts
import { HttpError } from '@vielzeug/fetchit';

try {
  await api.get('/users/1');
} catch (err) {
  if (HttpError.is(err, 404)) console.log('Not found');
  else if (HttpError.is(err)) console.log(err.status, err.method, err.url);

  // Distinguish timeout vs. cancellation
  if (HttpError.is(err)) {
    if (err.isTimeout) console.log('Request timed out');
    if (err.isAborted) console.log('Request was cancelled');
  }
}
```

## HTTP Client Config

### `HttpRequestConfig<P>`

Config accepted by all `ApiClient` request methods. `P` is the URL path literal type used to extract `{param}` placeholders.

```ts
type HttpRequestConfig<P extends string = string> = Omit<RequestInit, 'body' | 'method'> &
  PathConfig<P> & {
    body?: unknown; // Plain objects → JSON; BodyInit → passed through as-is
    query?: Params; // Supports scalars, arrays, and null
    dedupeKey?: unknown; // Opt in to write dedupe with an explicit stable key
    timeout?: number; // Override client-level timeout (ms)
  };
```

Idempotent reads (`GET`, `HEAD`, `OPTIONS`, `DELETE`) are deduplicated automatically by method + URL + payload-derived key. Non-idempotent writes are deduplicated only when `dedupeKey` is provided.

`PathConfig<P>` resolves to `{ params: Record<ExtractPathParams<P>, string | number | boolean> }` when `P` contains `{placeholders}`, or `{ params?: never }` otherwise.

**Body handling:**

- Plain object / array → serialized with `JSON.stringify`, `Content-Type: application/json` added
- `FormData`, `Blob`, `URLSearchParams`, `ArrayBuffer`, `ArrayBufferView`, `string` → passed through without modification

## Query Options

### `QueryOptions<T>`

```ts
type QueryOptions<T> = {
  key: QueryKey;
  fn: (ctx: QueryFnContext) => Promise<T>;
  staleTime?: number;
  gcTime?: number;
  retry?: number;
  retryDelay?: number | ((attempt: number) => number);
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};
```

Per-call `retry`, `retryDelay`, and `shouldRetry` override query-client defaults.

### `PrefetchOptions<T>`

```ts
type PrefetchOptions<T> = QueryOptions<T> & {
  throwOnError?: boolean;
};
```

`prefetch()` uses the same cache/fetch semantics as `query()`, resolves to `void`, and swallows errors by default unless `throwOnError` is `true`.

## Types

### `QueryKey`

```ts
type QueryKey = readonly unknown[];
// examples: ['users'], ['users', 1], ['posts', { status: 'published' }]
```

### `QueryFnContext`

```ts
type QueryFnContext = {
  key: QueryKey; // the cache key for the query that triggered this fetch
  signal: AbortSignal;
};
```

The context passed to every `query()` `fn`. The `signal` is aborted when `cancel()` is called or when the query client is disposed. The `key` is useful when a single `fn` is shared across different query keys.

### `QueryStatus`

```ts
type QueryStatus = 'idle' | 'pending' | 'success' | 'error';
```

### `QueryState<T>`

```ts
type QueryState<T = unknown> = {
  data: T | undefined;
  error: Error | null;
  status: QueryStatus;
  updatedAt: number; // Date.now() timestamp of last transition to success/error
};
```

### `AsyncState<T>`

```ts
type AsyncState<T = unknown> = {
  data: T | undefined;
  error: Error | null;
  status: QueryStatus;
  updatedAt: number;
};
```

### `MutationState<TData>`

Like `QueryState<T>` but `data` is always `undefined` while `status === 'pending'` — mutations do not carry stale data during an in-flight call.

```ts
type MutationState<TData = unknown> = {
  data: TData | undefined;
  error: Error | null;
  status: QueryStatus;
  updatedAt: number;
};
```

### `ApiClientOptions`

```ts
type ApiClientOptions = {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
  timeout?: number;
};
```

### `QueryClientOptions`

```ts
type QueryClientOptions = {
  staleTime?: number;
  gcTime?: number;
  retry?: number;
  retryDelay?: number | ((attempt: number) => number);
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};
```

### `MutationFn<TData, TVariables>`

```ts
type MutationFn<TData, TVariables = void> = (input: TVariables, signal: AbortSignal) => Promise<TData>;
```

### `MutationOptions`

```ts
type MutationOptions = {
  retry?: number;
  retryDelay?: number | ((attempt: number) => number);
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};
```

### `RetryOptions`

```ts
type RetryOptions = {
  retry?: number;
  retryDelay?: number | ((attempt: number) => number);
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};
```

`shouldRetry` receives the error and the 0-based attempt count. Return `false` to stop retrying (e.g., never retry 4xx HTTP errors). Defaults to retrying all errors up to the configured `retry` count.

### `Interceptor`

```ts
type Interceptor = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;
type FetchContext = { url: string; init: RequestInit };
```

### `Unsubscribe`

```ts
type Unsubscribe = () => void;
```

### `ApiClient`

```ts
type ApiClient = ReturnType<typeof createApi>;
```

### `QueryClient`

```ts
type QueryClient = ReturnType<typeof createQuery>;
```

### `Mutation<TData, TVariables>`

```ts
type Mutation<TData, TVariables = void> = ReturnType<typeof createMutation<TData, TVariables>>;
```
