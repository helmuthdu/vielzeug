---
title: Courier — API Reference
description: Reference for Courier HTTP, cached read, prefetch, middleware, and error APIs.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createCourier()` | Creates transport client | Sync | Dispose only when whole scope ends |
| `request()` | Sends one HTTP request of any method | Async | Direct calls never deduplicate |
| `get()` | Sends a GET, optionally through the explicit cache | Async | One key must identify one representation |
| `prefetch()` | Warms a cached GET | Async | Request failures resolve after surfacing through `tap()` |
| `invalidateCache()` / `clearCache()` | Removes cached values | Sync | Invalidation matches structured key prefixes |
| `post()` / `put()` / `patch()` / `delete()` | Common write method conveniences | Async | Use `request()` for custom methods |
| `withBearerAuth()` | Adds authorization middleware | Sync | Token provider runs per request |
| `withRequestId()` | Adds request identifier middleware | Sync | Default generator uses `crypto.randomUUID()` |
| `withLogging()` | Logs request result metadata | Sync | Requires explicit logger; URLs may contain sensitive query values |
| `tap()` | Observe structured transport events | Sync | Observation only; optional signal owns lifetime |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/courier` | Client factory, errors, middleware helpers, and public types |

## Client

### `createCourier()`

```ts
createCourier(options?: CourierOptions): Courier;
```

Returns an HTTP client sharing base URL, default headers, immutable middleware, optional parsed-value cache, timeout, and cancellation lifecycle.

| `CourierOptions` field | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `''` | Prefix for relative request paths |
| `cache.capacity` | `number` | `100` | Maximum cached entries; positive integer or `Infinity` |
| `cache.ttlMs` | `number` | `30_000` | Default cache freshness; non-negative milliseconds or `Infinity` |
| `fetch` | `typeof globalThis.fetch` | `globalThis.fetch` | Fetch implementation |
| `headers` | `HeadersInit` | `{}` | Default request headers (immutable; merged lowercase) |
| `middleware` | `readonly Middleware[]` | `[]` | Immutable middleware chain configured at construction |
| `timeout` | `number` | `30_000` | Integer milliseconds from 1 to 2,147,483,647, or `Infinity` |

**Returns:** `Courier`.

```ts
import { createCourier, withBearerAuth } from '@vielzeug/courier';

const courier = createCourier({
  baseUrl: 'https://api.example.com',
  middleware: [withBearerAuth('token')],
});
```

| `Courier` member | Signature | Description |
| --- | --- | --- |
| `request` | `<T, P>(path, config?) => Promise<T>` | Sends one HTTP request; `config.method` defaults to `GET` |
| `get` | `<T, P>(path, config?) => Promise<T>` | Sends GET; `cache` opts parsed responses into bounded caching |
| `prefetch` | `<T, P>(path, config) => Promise<void>` | Warms one required structured cache key; failures are tap-observed |
| `invalidateCache` | `(prefix: CourierCacheKey) => void` | Invalidates matching settled and pending key prefixes |
| `clearCache` | `() => void` | Removes every cached and pending entry |
| `post` | `<T, P>(path, config?) => Promise<T>` | Sends POST |
| `put` | `<T, P>(path, config?) => Promise<T>` | Sends PUT |
| `patch` | `<T, P>(path, config?) => Promise<T>` | Sends PATCH |
| `delete` | `<T, P>(path, config?) => Promise<T>` | Sends DELETE |
| `tap` | `(handler, options?: { signal?: AbortSignal }) => () => void` | Observes structured request and disposal events |
| `cancelAll` | `() => void` | Aborts active requests; client remains usable |
| `dispose` | `() => void` | Final teardown; aborts work and marks client unusable |
| `disposed` | `boolean` | Whether final disposal occurred |
| `disposalSignal` | `AbortSignal` | Aborts on final disposal |

---

## Requests

### `request()`

```ts
request<T, P extends string>(path: P, config?: RequestConfig<P, T> & { method?: string }): Promise<T>;
```

Sends one HTTP request. `config.method` defaults to `GET`; pass any method (including custom verbs) to support it consistently.

| `RequestConfig<P, T>` field | Type | Description |
| --- | --- | --- |
| `method` | `string` | HTTP method; defaults to `GET` |
| `params` | `Record<string, string \| number \| boolean>` | Path parameters for `{param}` placeholders |
| `query` | `Params` | Query string parameters |
| `body` | `unknown` | BodyInit values pass through; streams use Node duplex; GET/HEAD reject bodies; other values encode as JSON |
| `headers` | `HeadersInit` | Per-request headers merged with (and overriding) defaults |
| `responseType` | `ResponseType` | Response parsing strategy |
| `schema` | `{ parse(data: unknown): T }` | Optional parsed-response validator; incompatible with `responseType: 'raw'` |
| `signal` | `AbortSignal` | External abort signal merged with internal cancellation |
| `timeout` | `number` | Integer milliseconds from 1 to 2,147,483,647, or `Infinity`; overrides default |
| `fetchInit` | `Omit<RequestInit, 'body' \| 'headers' \| 'method' \| 'signal'>` | Raw fetch options for advanced use |

**Returns:** Parsed response body (or `undefined` for empty bodies).

```ts
const created = await courier.request<User>('/users', {
  method: 'POST',
  body: { name: 'Ada' },
});
```

### `get()`

```ts
get<T, P extends string>(path: P, config?: GetRequestConfig<P, T>): Promise<T>;
```

Convenience for `request(path, { ...config, method: 'GET' })`. A `cache` descriptor opts a parsed response into the bounded cache. It requires a structured key and may override the default TTL. Raw responses cannot be cached.

```ts
const user = await courier.get<User>('/users/{id}', {
  cache: { key: ['users', 1], ttlMs: 10_000 },
  params: { id: 1 },
});
```

## Cache

### `prefetch()`

```ts
prefetch<T, P extends string>(path: P, config: PrefetchConfig<P, T>): Promise<void>;
```

Starts the same cached GET used by `get()`. `config.cache` is required; `signal`, per-call `timeout`, and `responseType: 'raw'` are unavailable. Fresh values and pending loads are reused. The promise settles when the attempt finishes. Request failures emit `request-error` through `tap()` and resolve without caching data.

### `invalidateCache()` and `clearCache()`

```ts
invalidateCache(prefix: CourierCacheKey): void;
clearCache(): void;
```

`invalidateCache()` removes every settled entry whose structured key starts with `prefix` and prevents matching pending loads from being stored. `clearCache()` applies that behavior to all entries. Existing waiters may still receive an invalidated in-flight result; `cancelAll()` or `dispose()` aborts physical work.

---

## Middleware

Middleware is an immutable chain configured at construction. Each middleware receives an immutable `FetchContext` and a `next` function.

```ts
type Middleware = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;
```

### Middleware helpers

```ts
withBearerAuth(token: string | (() => string | null | undefined | Promise<string | null | undefined>)): Middleware;
withRequestId(options?: { generate?: () => string; header?: string }): Middleware;
withLogging(options: {
  logger: (message: string, meta: { duration: number; method: string; status: number; url: string }) => void;
}): Middleware;
```

Each helper returns a `Middleware` passed in the `middleware` option. `withLogging` requires an explicit `logger` function, isolates logger failures from requests, and has no default console output.

```ts
const courier = createCourier({
  middleware: [
    withBearerAuth(() => tokenStore.getAccessToken()),
    withRequestId(),
    withLogging({ logger: (msg) => console.log(msg) }),
  ],
});
```

## Types

```ts
type TransportOptions = {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersInit;
  middleware?: readonly Middleware[];
  timeout?: number;
};

type CourierCacheKeyAtom = string | number | boolean | null;
type CourierCacheKey = readonly [CourierCacheKeyAtom, ...CourierCacheKeyAtom[]];

type CourierCacheOptions = {
  capacity?: number;
  ttlMs?: number;
};

type CourierReadCache = {
  key: CourierCacheKey;
  ttlMs?: number;
};

type CourierOptions = TransportOptions & {
  cache?: CourierCacheOptions;
};

type FetchContext = {
  readonly headers: Readonly<Record<string, string>>;
  readonly init: Readonly<Omit<RequestInit, 'headers'>>;
  readonly url: string;
  withHeaders(updates: Record<string, string | undefined>): FetchContext;
  withInit(updates: Partial<Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>>): FetchContext;
};

type Middleware = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;

type CourierEvent =
  | { type: 'request-start'; method: string; url: string }
  | { type: 'request-success'; method: string; url: string; status: number; duration: number }
  | { type: 'request-error'; method: string; url: string; error: unknown }
  | { type: 'dispose' };
```

```ts
type ParamValue = string | number | boolean | null | readonly (string | number | boolean | null)[] | undefined;
type Params = Record<string, ParamValue>;
type ResponseType = 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer' | 'raw';
type RequestConfig<P extends string = string, T = unknown> = {
  body?: unknown;
  method?: string;
  fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
  headers?: HeadersInit;
  params?: Record<string, string | number | boolean>;
  query?: Params;
  responseType?: ResponseType;
  schema?: { parse(data: unknown): T };
  signal?: AbortSignal;
  timeout?: number;
};

type GetRequestConfig<P extends string = string, T = unknown> = Omit<
  RequestConfig<P, T>,
  'body' | 'method' | 'responseType'
> &
  ({ cache?: CourierReadCache; responseType?: Exclude<ResponseType, 'raw'> } | { cache?: never; responseType: 'raw' }) & {
    body?: never;
  };

type PrefetchConfig<P extends string = string, T = unknown> = Omit<
  GetRequestConfig<P, T>,
  'cache' | 'responseType' | 'signal' | 'timeout'
> & {
  cache: CourierReadCache;
  responseType?: Exclude<ResponseType, 'raw'>;
  signal?: never;
  timeout?: never;
};
```

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `CourierError` | Base class for all Courier errors | Use `instanceof` to narrow |
| `CourierHttpError` | Non-2xx HTTP response | `status`, `data`, `headers`, `method`, `url`; `CourierHttpError.is(e, status?)` narrows by status |
| `CourierNetworkError` | Request failure without response | `method`, `url`, `cause` |
| `CourierTimeoutError` | Timeout signal aborts request | `method`, `url`, `cause` |
| `CourierAbortError` | Caller or client cancellation | `method`, `url`, `cause` |
| `CourierSchemaValidationError` | Response schema fails | `data`, `cause` |
| `CourierParseError` | Response body cannot parse | — |
| `CourierDisposedError` | Work starts after disposal | — |

Errors thrown directly by custom middleware are preserved rather than reclassified.
