---
title: Courier — Usage Guide
description: Use one Courier client for typed HTTP, explicit cached reads, prefetching, immutable middleware, and structured errors.
---

[[toc]]

## Basic Usage

Create one Courier client for an application or request scope. Its transport policy, middleware, and disposal lifecycle apply to every request.

```ts
import { createCourier } from '@vielzeug/courier';

type User = { id: number; name: string };

const courier = createCourier({ baseUrl: 'https://api.example.com' });
const user = await courier.get<User>('/users/{id}', { params: { id: 1 } });
console.log(user.name);
```

## HTTP Requests

Use `get()`, `post()`, `put()`, `patch()`, and `delete()` for standard methods. Use `request()` when the method is custom or selected dynamically. Courier preserves root-relative paths, encodes path parameters, serializes JSON-compatible bodies, and parses successful responses.

```ts
const posts = await courier.get<{ id: number; title: string }[]>('/users/{id}/posts', {
  params: { id: 1 },
  query: { limit: 20, status: 'published' },
});

await courier.patch('/posts/{id}', {
  body: { title: 'Updated title' },
  params: { id: posts[0].id },
});
```

`get()`, `post()`, `put()`, `patch()`, and `delete()` cover common methods. Use `request()` for custom verbs or when a method is selected dynamically.

## Default Headers

Set default headers at construction. They are merged (lowercased) into every request and cannot be mutated at runtime — middleware handles dynamic headers.

```ts
const courier = createCourier({
  baseUrl: 'https://api.example.com',
  headers: { 'x-client': 'web' },
});
```

## Middleware

Middleware is an immutable chain configured once at construction. Each middleware receives an immutable `FetchContext` and a `next` function. Use `ctx.withHeaders()` or `ctx.withInit()` to derive a new context — never mutate `ctx` directly.

```ts
import { withBearerAuth, withRequestId, createCourier } from '@vielzeug/courier';

const courier = createCourier({
  baseUrl: 'https://api.example.com',
  middleware: [
    withBearerAuth(() => sessionStorage.getItem('access-token') ?? ''),
    withRequestId(),
  ],
});
```

A bearer token provider may return `null`, `undefined`, or an empty string to omit a stale authorization header. Use `withLogging()` with an explicit `logger` function to log requests during local development. `withLogging()` includes full URLs, so sanitize query values before persistent logging.

```ts
import { withLogging, createCourier } from '@vielzeug/courier';

const courier = createCourier({
  baseUrl: 'https://api.example.com',
  middleware: [withLogging({ logger: (msg) => console.log(msg) })],
});
```

Use `tap()` for multiple structured transport observers. It emits request-start, request-success, request-error, and dispose events; observer failures cannot alter requests. Pass `{ signal }` to own listener lifetime.

```ts
const stop = courier.tap((event) => metrics.record(event), { signal: routeSignal });
```

Because middleware is immutable, a client's behavior is locally understandable from its construction call. To change policy, create a new client.

## Cached Reads and Prefetching

Opt parsed GETs into caching with a structured key. Courier uses a finite capacity of 100 entries and a 30-second TTL by default; client options change those defaults, and each read may override TTL. Successful parsed and schema-validated values are cached, while errors are not.

```ts
const courier = createCourier({
  baseUrl: 'https://api.example.com',
  cache: { capacity: 200, ttlMs: 60_000 },
});
const cache = { key: ['accounts', accountId, 'users', userId] as const, ttlMs: 10_000 };

await courier.prefetch<User>('/users/{id}', { cache, params: { id: userId } });
const user = await courier.get<User>('/users/{id}', { cache, params: { id: userId } });
```

`prefetch()` returns a promise that settles when warming finishes. Request failures are not cached or rejected from that promise; the physical request emits `request-error` through `tap()`. Cache, key, and URL configuration errors still throw before prefetch starts.

Invalidate a structured prefix after writes. Every matching settled or pending key becomes ineligible for caching, while unrelated entries remain available.

```ts
await courier.patch('/users/{id}', { body: update, params: { id: userId } });
courier.invalidateCache(['accounts', accountId, 'users']);
```

A cache key must identify one response representation, including a stable non-secret principal or tenant identifier, schema, and relevant request variants. Never place credentials in a key; call `clearCache()` when identity changes. Cached objects are shared by reference.

Concurrent callers share physical work but own their own signal and timeout. One cancelled caller does not affect the others. When every caller cancels and no prefetch owns the load, Courier aborts the physical request. `cancelAll()` always aborts physical work; `dispose()` also clears settled cache data.

## Response Parsing

Courier parses successful 2xx response bodies automatically based on `content-type`, unless you set `responseType` explicitly (`'json'`, `'text'`, `'blob'`, `'arrayBuffer'`, or `'raw'` for the `Response` itself). Empty JSON bodies return `undefined` instead of throwing. Raw response bodies remain owned by Courier until consumed or cancelled, so `cancelAll()` and `dispose()` still abort them. Raw responses cannot be combined with `schema`. Always consume or cancel the body to release request ownership, and set `timeout: Infinity` for intentionally long-lived streams. Courier preserves URL, redirect, and type metadata on tracked responses and their clones.

```ts
const buffer = await courier.request('/files/{id}', {
  method: 'GET',
  params: { id: 1 },
  responseType: 'arrayBuffer',
});
```

## Schema Validation

Pass a `schema` with a `parse(data)` method to validate the parsed body. Any validator works — a `@vielzeug/spell` schema or a plain function wrapper. A failed parse throws `CourierSchemaValidationError`.

```ts
import { s } from '@vielzeug/spell';

const user = await courier.get('/users/1', {
  schema: s.object({ id: s.number(), name: s.string() }),
});
```

## Cancellation and Disposal

Pass a `signal` to cancel one request. `cancelAll()` aborts every active request without disposing the client. `dispose()` aborts active work and marks the client unusable — call it only at the final application or request boundary.

```ts
const controller = new AbortController();
void courier.get('/slow', { signal: controller.signal });
controller.abort(); // cancels that request only

courier.cancelAll(); // cancels all active requests
courier.dispose(); // final teardown
```

## Timeouts

Set a client-wide `timeout` (default 30,000 ms) or a per-request timeout. Finite values must be integer milliseconds from 1 through 2,147,483,647. A timed-out request rejects with `CourierTimeoutError`; use `Infinity` for intentionally long-lived work.

```ts
const courier = createCourier({ timeout: 10_000 });
await courier.get('/health', { timeout: 2_000 });
```

## Error Handling

Courier classifies URL, request-construction, fetch, cancellation, HTTP, response-parsing, and schema failures into distinct error classes. Errors thrown directly by custom middleware are preserved.

```ts
import {
  CourierAbortError,
  CourierHttpError,
  CourierNetworkError,
  CourierParseError,
  CourierTimeoutError,
  createCourier,
} from '@vielzeug/courier';

const courier = createCourier({ baseUrl: 'https://api.example.com' });

async function loadUser(): Promise<string> {
  try {
    return (await courier.get<{ name: string }>('/users/1', { timeout: 2_000 })).name;
  } catch (error) {
    if (error instanceof CourierAbortError) return 'Cancelled';
    if (error instanceof CourierTimeoutError) return 'Timed out; retry.';
    if (CourierHttpError.is(error, 404)) return 'User not found.';
    if (error instanceof CourierNetworkError) return 'Check your connection.';
    if (error instanceof CourierParseError) return 'The server returned an unreadable response.';
    throw error;
  }
}
```

- A `CourierHttpError` has a response (`status`, `data`, `headers`); a `CourierNetworkError` does not.
- Do not display cancellation as an application error during navigation.
- `CourierSchemaValidationError` carries the raw pre-validation `data`.

## Composing with a State Layer

Courier owns HTTP transport and optional parsed GET caching. Observable query state, optimistic mutations, collection navigation, and stream state belong to the owning state layer (e.g. Sourcerer, TanStack Query, or consumer code). Compose Courier calls into that layer instead of nesting state machines.

```ts
import { createPageSource } from '@vielzeug/sourcerer';

const users = createPageSource<User>({
  load: async ({ page, pageSize, signal }) => {
    const result = await courier.get<{ data: User[]; total: number }>('/users', {
      query: { page, pageSize },
      signal,
    });
    return { items: result.data, totalItems: result.total };
  },
});

await users.reload();
```

## Framework Integration

Create Courier at an application or route boundary. Inject the client where requests are issued; let the framework own rendering and cache state.

::: code-group

```tsx [React]
import { createContext, useContext } from 'react';
import { createCourier } from '@vielzeug/courier';

type User = { id: number; name: string };

type CourierClient = ReturnType<typeof createCourier>;
const CourierContext = createContext<CourierClient | null>(null);

export function CourierProvider({ children, courier }: { children: React.ReactNode; courier: CourierClient }) {
  return <CourierContext.Provider value={courier}>{children}</CourierContext.Provider>;
}

export function useCourier() {
  const courier = useContext(CourierContext);
  if (!courier) throw new Error('CourierProvider missing');
  return courier;
}

// In a component:
// const user = await useCourier().get<User>('/users/1');
```

```ts [Vue 3]
import { createCourier } from '@vielzeug/courier';

const courier = createCourier({ baseUrl: '/api' });
// Provide via app.provide('courier', courier) and inject in setup().
```

```svelte [Svelte]
<script lang="ts">
  import { createCourier } from '@vielzeug/courier';
  export let courier: ReturnType<typeof createCourier>;
</script>
```

:::

Courier exposes no loading, error, or cache store. Construct the client at the application or SSR-request boundary, pass it into framework providers, and dispose it at that same boundary. Render state in the framework that owns the view.

## Gotchas

### Root-relative paths stay root-relative

With no `baseUrl`, `'/api/users'` is passed to fetch unchanged while `'api/users'` remains document-relative. With a `baseUrl`, Courier appends either spelling to that base.

### `baseUrl` should not include query parameters

`buildUrl` joins `baseUrl` and path with `/`. A base URL like `https://api.example.com?token=abc` produces broken URLs (`https://api.example.com?token=abc/users`). Pass query parameters per-request via `config.query` instead.

### Query parameters precede fragments

When a path already contains `#fragment`, Courier inserts `config.query` before the fragment so values remain part of the HTTP query.

### GET and HEAD bodies are rejected

Fetch does not support bodies for GET or HEAD. Courier rejects them as request parse errors before dispatch.

### Middleware is immutable

There is no `use()` method. To change middleware, create a new client. This keeps each client's behavior locally understandable and avoids runtime mutation of the request chain.

### Keep credentials out of URLs when using logging middleware

`withLogging()` logs the full URL, including query parameters. If URLs may contain sensitive data, provide a custom `logger` that sanitizes the URL first.

## Best Practices

- Create one Courier client per application or SSR request scope.
- Configure middleware once at construction; never mutate it at runtime.
- Use method conveniences for GET/POST/PUT/PATCH/DELETE and `request()` for custom verbs.
- Use explicit cache keys only for parsed GETs that should share data and in-flight work.
- Clear cached data when the authenticated principal or tenant changes.
- Let the owning state layer own observable queries and mutations.
- Dispose only at the final application or request boundary.
- Keep credentials out of URLs when using logging middleware.
