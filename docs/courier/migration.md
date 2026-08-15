---
title: Courier Migration
---

# Courier Migration

## Courier 2.0

Courier 2.0 redesigns HTTP work around one client, query handles, direct mutations, and `AsyncIterable` streams also simplifies the client surface by removing the `./devtools` subpath and widening the `invalidate()` parameter type to reflect its actual prefix-matching behavior.

### Replace `debugCourier()` with `withLogging()`

The `@vielzeug/courier/devtools` subpath and `debugCourier()` export are removed. Use `withLogging()` directly — it is the same one-line composition.

```ts
// Before
import { debugCourier } from '@vielzeug/courier/devtools';
const client = debugCourier({ baseUrl: 'https://api.example.com' });

// After
import { createCourier, withLogging } from '@vielzeug/courier';
const client = createCourier({ baseUrl: 'https://api.example.com' });
client.use(withLogging());
```

### Update `invalidate()` call sites if passing typed `QueryKey` variables

`invalidate()` now accepts `readonly unknown[]` instead of `QueryKey`. Existing calls with `QueryKey` values still compile — the change is a type widening, not a narrowing. No code changes required unless you were relying on the exact `QueryKey` type for overload resolution.

### Consolidate client setup

Create one `Courier` instance with `createCourier` and move shared transport, interceptor, and request configuration there.

### Adopt query handles and direct mutations

Replace prior query and mutation integration points with the 2.0 query-handle and direct-mutation contracts. Keep request lifecycle handling at each query or mutation boundary.

### Consume streams as async iterables

Update streaming consumers to iterate over the 2.0 stream API with `for await...of`. Ensure application cleanup still handles abort and disposal.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current client, query, mutation, and stream contracts.
