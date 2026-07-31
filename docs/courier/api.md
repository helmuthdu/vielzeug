---
title: Courier — API Reference
description: Reference for Courier's HTTP, query, mutation, interceptor, and stream APIs.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createCourier()` | Creates the unified application client | Sync | Dispose it only when its whole scope ends |
| `Courier` HTTP methods | Sends and parses HTTP requests | Async | `params` is required for `{path}` placeholders |
| `queries.create()` | Registers a cached query handle | Sync | `invalidate()` does not fetch |
| `mutate()` | Runs one retryable write operation | Async | It does not create observable UI state |
| `events()` / `read()` | Opens abortable response iterators | Async iteration | Breaking iteration aborts the request |
| `withBearerAuth()` | Adds an authorization interceptor | Sync | Token provider runs for every request |
| `withRequestId()` | Adds a request identifier interceptor | Sync | Default generator uses `uuid()` |
| `withLogging()` | Logs request result metadata | Sync | URLs may contain sensitive query values |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/courier` | Client factory, errors, interceptors, and public types |
| `@vielzeug/courier/devtools` | `debugCourier()` with logging preconfigured |

## Client

### `createCourier()`

```ts
createCourier(options?: CourierOptions): Courier;
```

Returns a client that shares transport configuration, headers, interceptors, cancellation, and disposal
between HTTP, query, mutation, and stream operations.

| `CourierOptions` field | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `''` | Prefix for relative request paths |
| `fetch` | `typeof globalThis.fetch` | `globalThis.fetch` | Fetch implementation |
| `headers` | `Record<string, string>` | `{}` | Global request headers |
| `timeout` | `number` | `30_000` | Default HTTP timeout in milliseconds |
| `query.staleTime` | `number` | `0` | Query freshness duration |
| `query.times` | `number` | `1` | Query fetch attempts |

**Returns:** `Courier`.

```ts
import { createCourier } from '@vielzeug/courier';

const courier = createCourier({ baseUrl: 'https://api.example.com' });
```

| `Courier` member | Signature | Description |
| --- | --- | --- |
| `get` / `post` / `put` / `patch` / `delete` | `<T, P>(url: P, config?) => Promise<T>` | Sends an HTTP request |
| `request` | `<T, P>(method, url: P, config?) => Promise<T>` | Sends a custom HTTP method |
| `headers` | `(updates) => void` | Updates global headers |
| `getHeaders` | `() => Readonly<Record<string, string>>` | Returns a header snapshot |
| `use` | `(interceptor) => () => void` | Registers an interceptor |
| `cancelAll` | `() => void` | Aborts active HTTP, query, and mutation work |
| `queries` | `QueryCache` | Owns registered query entries |
| `mutate` | `<T>(options) => Promise<T>` | Runs one write operation |
| `events` | `<T, P>(url, options?) => AsyncIterableIterator<StreamEvent<T>>` | Opens an SSE iterator |
| `read` | `<T, P>(url, options?) => AsyncIterableIterator<T>` | Opens a text or NDJSON iterator |
| `dispose` | `() => void` | Final disposal; aborts work and clears queries |
| `disposed` | `boolean` | Whether final disposal occurred |
| `disposalSignal` | `AbortSignal` | Aborts on final disposal |

---

## Queries

### `queries.create()`

```ts
create<T>(definition: QueryDefinition<T>): Query<T>;
```

Returns a stable query handle for `definition.key`.

| `Query<T>` member | Description |
| --- | --- |
| `fetch()` | Returns fresh cached data or runs the fetch function |
| `refetch()` | Always runs the fetch function |
| `getSnapshot()` | Returns the current `AsyncState<T>` |
| `subscribe(listener)` | Subscribes to changes |
| `invalidate()` | Marks this query stale without fetching |
| `dispose()` | Removes subscriptions created through this handle |

**Returns:** `Query<T>`.

```ts
const profile = courier.queries.create({
  key: ['profile', 1],
  fetch: ({ signal }) => courier.get('/profile/{id}', { params: { id: 1 }, signal }),
});
```

| `QueryCache` method | Returns | Description |
| --- | --- | --- |
| `get(key)` | `T \| undefined` | Returns successful cached data |
| `getSnapshot(key)` | `AsyncState<T> \| null` | Returns a snapshot by key |
| `set(key, data, options?)` | `void` | Sets a successful cache value |
| `invalidate(key)` | `void` | Marks all matching key prefixes stale |
| `refetchStale()` | `void` | Starts stale successful queries in the background |
| `keys()` | `QueryKey[]` | Lists known keys |
| `subscribe(key, listener)` | `Unsubscribe` | Subscribes by key |
| `clear()` | `void` | Removes every cache entry |

---

## Mutations

### `mutate()`

```ts
mutate<T>(options: MutationOptions<T>): Promise<T>;
```

Runs `options.request`, retries it when configured, and then calls `onSuccess`.

| `MutationOptions<T>` field | Type | Description |
| --- | --- | --- |
| `request` | `(context: MutationContext) => Promise<T>` | Write operation |
| `onSuccess` | `(data, queries) => void \| Promise<void>` | Cache update callback |
| `signal` | `AbortSignal` | Caller-controlled cancellation |
| `times` | `number` | Total attempts |

**Returns:** The request result.

---

## Streams

### `events()` and `read()`

```ts
events<T, P extends string>(url: P, options?: StreamOptions<P>): AsyncIterableIterator<StreamEvent<T>>;
read<T, P extends string>(url: P, options?: StreamOptions<P> & { parse?: 'ndjson' | 'text' }): AsyncIterableIterator<T>;
```

Both iterators abort their request when `return()` is called or a `for await` loop exits.

| `StreamOptions` field | Type | Description |
| --- | --- | --- |
| `body` | `unknown` | Request body |
| `method` | `string` | Defaults to GET, or POST when `body` is present |
| `params` / `query` | Path and query parameters | Builds the URL |
| `headers` / `fetchInit` | Request configuration | Adds per-request configuration |
| `signal` | `AbortSignal` | Merges external cancellation |
| `timeout` | `number` | Stream timeout; omitted means no timeout |

**Returns:** An abortable async iterator.

---

## Interceptors

### Interceptor helpers

```ts
withBearerAuth(token: string | (() => string | Promise<string>)): Interceptor;
withRequestId(options?: { generate?: () => string; header?: string }): Interceptor;
withLogging(options?: {
  logger?: (message: string, meta: { duration: number; method: string; status: number; url: string }) => void;
}): Interceptor;
```

Each helper returns an `Interceptor` accepted by `courier.use()`.

## Types

```ts
type AsyncState<T> =
  | { data: undefined; error: null; isFetching: boolean; status: 'loading'; updatedAt: undefined }
  | { data: T; error: null; isFetching: boolean; status: 'success'; updatedAt: number }
  | { data: T | undefined; error: Error; isFetching: false; status: 'error'; updatedAt: number };

type QueryContext = { readonly key: QueryKey; readonly signal: AbortSignal };
type QueryDefinition<T> = { fetch: (context: QueryContext) => Promise<T>; key: QueryKey; staleTime?: number };
type QueryKey = readonly [QueryKeyAtom, ...QueryKeyAtom[]];
type QueryKeyAtom = string | number | boolean | null | { readonly [key: string]: string | number | boolean | null };
type Query<T> = {
  dispose(): void;
  fetch(): Promise<T>;
  getSnapshot(): AsyncState<T>;
  invalidate(): void;
  refetch(): Promise<T>;
  subscribe(listener: () => void): Unsubscribe;
};
type QueryCache = {
  clear(): void;
  create<T>(definition: QueryDefinition<T>): Query<T>;
  get<T>(key: QueryKey): T | undefined;
  getSnapshot<T>(key: QueryKey): AsyncState<T> | null;
  invalidate(key: QueryKey): void;
  keys(): QueryKey[];
  refetchStale(): void;
  set<T>(key: QueryKey, data: T, options?: { updatedAt?: number }): void;
  subscribe(key: QueryKey, listener: () => void): Unsubscribe;
};
type MutationContext = { readonly signal: AbortSignal };
type MutationOptions<T> = {
  onSuccess?: (data: T, queries: QueryCache) => void | Promise<void>;
  request: (context: MutationContext) => Promise<T>;
  signal?: AbortSignal;
  times?: number;
};
type StreamEvent<T = unknown> = { readonly data: T; readonly event: string; readonly id: string | undefined };
type Unsubscribe = () => void;
```

```ts
type ParamValue = string | number | boolean | null | readonly (string | number | boolean | null)[] | undefined;
type Params = Record<string, ParamValue>;
type ExtractPathParams<P extends string> =
  P extends `${string}{${infer K}}${infer R}` ? K | ExtractPathParams<R> : never;
type PathConfig<P extends string> = [ExtractPathParams<P>] extends [never]
  ? { params?: never }
  : { params: Record<ExtractPathParams<P>, string | number | boolean> };

type RequestConfig<P extends string = string, T = unknown> = PathConfig<P> & {
  body?: unknown;
  dedupe?: boolean;
  dedupeKey?: unknown;
  fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
  headers?: Record<string, string>;
  query?: Params;
  responseType?: 'arrayBuffer' | 'auto' | 'blob' | 'json' | 'raw' | 'text';
  schema?: { parse(data: unknown): T };
  signal?: AbortSignal;
  timeout?: number;
};

type StreamOptions<P extends string = string> = {
  body?: unknown;
  fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
  headers?: Record<string, string>;
  method?: string;
  params?: P extends string ? Record<string, string | number | boolean> : never;
  query?: Params;
  signal?: AbortSignal;
  timeout?: number;
};
```

`RequestConfig` requires `params` only when its path has placeholders; paths without placeholders accept
`params?: never`. `responseType` is `ResponseType`, which is also inferred from the response content type
when omitted.

```ts
type FetchContext = {
  readonly headers: Readonly<Record<string, string>>;
  readonly init: Readonly<Omit<RequestInit, 'headers'>>;
  readonly url: string;
  withHeaders(updates: Record<string, string>): FetchContext;
};
type Interceptor = (context: FetchContext, next: (context: FetchContext) => Promise<Response>) => Promise<Response>;
type TransportOptions = {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
  timeout?: number;
};
type CourierOptions = TransportOptions & { query?: { staleTime?: number; times?: number } };
type Courier = ReturnType<typeof createCourier>;
```

`FetchContext` is immutable; create a changed context through `withHeaders()`. `Courier` is inferred from
`createCourier()` so its complete member list is the Client table above.

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `CourierError` | Base class | `CourierError.is(error)` |
| `CourierHttpError` | Non-2xx response | `status`, `data`, `url`, `method`, `headers` |
| `CourierNetworkError` | Fetch failed without a response | `url`, `method` |
| `CourierTimeoutError` | Configured timeout elapsed | `url`, `method` |
| `CourierAbortError` | Caller, iterator, or client cancelled work | `url`, `method` |
| `CourierParseError` | Response or stream parsing failed | — |
| `CourierSchemaValidationError` | Response schema rejected parsed data | `data`, `cause` |
| `CourierDisposedError` | Operation started after final disposal | — |
