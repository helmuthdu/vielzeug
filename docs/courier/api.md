---
title: Courier — API Reference
description: Reference for Courier HTTP, cache, mutation, interceptor, and stream APIs.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createCourier()` | Creates unified application client | Sync | Dispose only when whole scope ends |
| `Courier` HTTP methods | Sends and parses HTTP requests | Async | Direct calls never deduplicate |
| `queries.fetch()` | Fetches one keyed cache entry | Async | Key must include all response identity inputs |
| `mutate()` | Runs one write operation | Async | It never retries automatically |
| `events()` / `read()` | Opens abortable response iterators | Async iteration | Breaking iteration aborts request |
| `withBearerAuth()` | Adds authorization interceptor | Sync | Token provider runs per request |
| `withRequestId()` | Adds request identifier interceptor | Sync | Default generator uses `uuid()` |
| `withLogging()` | Logs request result metadata | Sync | URLs may contain sensitive query values |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/courier` | Client factory, errors, interceptors, and public types |

## Client

### `createCourier()`

```ts
createCourier(options?: CourierOptions): Courier;
```

Returns client sharing transport configuration, headers, interceptors, cancellation, cache, mutations, and streams.

| `CourierOptions` field | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `''` | Prefix for relative request paths |
| `fetch` | `typeof globalThis.fetch` | `globalThis.fetch` | Fetch implementation |
| `headers` | `Record<string, string>` | `{}` | Global request headers |
| `timeout` | `number` | `30_000` | Default HTTP timeout in milliseconds |
| `query.staleTime` | `number` | `0` | Cache freshness duration |

**Returns:** `Courier`.

```ts
import { createCourier } from '@vielzeug/courier';

const courier = createCourier({ baseUrl: 'https://api.example.com' });
```

| `Courier` member | Signature | Description |
| --- | --- | --- |
| `get` / `post` / `put` / `patch` / `delete` | `<T, P>(url: P, config?) => Promise<T>` | Sends one HTTP request |
| `request` | `<T, P>(method, url: P, config?) => Promise<T>` | Sends custom HTTP method |
| `headers` | `(updates) => void` | Updates global headers |
| `getHeaders` | `() => Readonly<Record<string, string>>` | Returns header snapshot |
| `use` | `(interceptor) => () => void` | Registers interceptor |
| `cancelAll` | `() => void` | Aborts active HTTP, cache, and mutation work |
| `queries` | `QueryCache` | Owns keyed cache entries |
| `mutate` | `<T>(options) => Promise<T>` | Runs one write operation |
| `events` | `<T, P>(url, options?) => AsyncIterableIterator<StreamEvent<T>>` | Opens SSE iterator |
| `read` | `<T, P>(url, options?) => AsyncIterableIterator<T>` | Opens text or NDJSON iterator |
| `dispose` | `() => void` | Final disposal; aborts work and clears cache |
| `disposed` | `boolean` | Whether final disposal occurred |
| `disposalSignal` | `AbortSignal` | Aborts on final disposal |

---

## Queries

### `queries.fetch()`

```ts
fetch<T>(definition: QueryDefinition<T>, options?: { force?: boolean }): Promise<T>;
```

Registers latest definition for `definition.key`, then returns fresh cached data or runs its fetch function.

| Parameter | Type | Description |
| --- | --- | --- |
| `definition.key` | `QueryKey` | Cache identity; include every response identity input |
| `definition.fetch` | `(context: QueryContext) => Promise<T>` | Request function for this key |
| `definition.staleTime` | `number` | Per-entry freshness duration |
| `options.force` | `boolean` | Fetch even when cached data is fresh |

**Returns:** Cached or fetched data.

```ts
const key = ['profile', 1] as const;
await courier.queries.fetch({
  key,
  fetch: ({ signal }) => courier.get('/profile/{id}', { params: { id: 1 }, signal }),
});
```

| `QueryCache` method | Returns | Description |
| --- | --- | --- |
| `get(key)` | `T \| undefined` | Returns successful cached data |
| `getSnapshot(key)` | `AsyncState<T> \| null` | Returns snapshot by key |
| `set(key, data, options?)` | `void` | Sets successful cache value |
| `invalidate(prefix)` | `void` | Marks matching key prefixes stale |
| `refetchStale()` | `void` | Starts stale successful entries in background |
| `keys()` | `QueryKey[]` | Lists known keys |
| `subscribe(key, listener)` | `Unsubscribe` | Subscribes to one key |
| `clear()` | `void` | Removes every cache entry |

---

## Mutations

### `mutate()`

```ts
mutate<T>(options: MutationOptions<T>): Promise<T>;
```

Runs `options.request` once, then calls `onSuccess` after successful completion.

| `MutationOptions<T>` field | Type | Description |
| --- | --- | --- |
| `request` | `(context: MutationContext) => Promise<T>` | Write operation |
| `onSuccess` | `(data, queries) => void \| Promise<void>` | Cache update callback |
| `signal` | `AbortSignal` | Caller-controlled cancellation |

**Returns:** Request result.

---

## Streams

### `events()` and `read()`

```ts
events<T, P extends string>(url: P, options?: StreamOptions<P>): AsyncIterableIterator<StreamEvent<T>>;
read<T, P extends string>(url: P, options?: StreamOptions<P> & { parse?: 'ndjson' | 'text' }): AsyncIterableIterator<T>;
```

Both iterators abort request when `return()` runs or `for await` loop exits. `events()` parses `event` and `data`
fields; it does not retain event IDs or reconnect.

| `StreamOptions` field | Type | Description |
| --- | --- | --- |
| `body` | `unknown` | Request body |
| `method` | `string` | Defaults to GET, or POST when body is present |
| `params` / `query` | Path and query parameters | Builds URL |
| `headers` / `fetchInit` | Request configuration | Adds per-request configuration |
| `signal` | `AbortSignal` | Merges external cancellation |
| `timeout` | `number` | Stream timeout; omitted means no timeout |

**Returns:** Abortable async iterator.

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
type QueryCache = {
  clear(): void;
  fetch<T>(definition: QueryDefinition<T>, options?: { force?: boolean }): Promise<T>;
  get<T>(key: QueryKey): T | undefined;
  getSnapshot<T>(key: QueryKey): AsyncState<T> | null;
  invalidate(prefix: readonly unknown[]): void;
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
};
type StreamEvent<T = unknown> = { readonly data: T; readonly event: string };
type Unsubscribe = () => void;
```

```ts
type ParamValue = string | number | boolean | null | readonly (string | number | boolean | null)[] | undefined;
type Params = Record<string, ParamValue>;
type RequestConfig<P extends string = string, T = unknown> = {
  body?: unknown;
  fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  query?: Params;
  responseType?: 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer' | 'raw';
  schema?: { parse(data: unknown): T };
  signal?: AbortSignal;
  timeout?: number;
};
```

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `CourierError` | Base class for all Courier errors | `CourierError.is(error)` |
| `CourierHttpError` | Non-2xx HTTP response | `status`, `data`, `headers`, `method`, `url` |
| `CourierNetworkError` | Request failure without response | `method`, `url`, `cause` |
| `CourierTimeoutError` | Timeout signal aborts request | `method`, `url`, `cause` |
| `CourierAbortError` | Caller, client, or iterator cancellation | `method`, `url`, `cause` |
| `CourierSchemaValidationError` | Response schema fails | `data`, `cause` |
| `CourierParseError` | Response body cannot parse | — |
| `CourierDisposedError` | Work starts after disposal | — |
