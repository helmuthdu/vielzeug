---
title: 'Courier Examples: Service Discovery and Custom Fetch'
description: 'Combine dynamic service URLs with an application-owned fetch implementation.'
---

## Service Discovery and Custom Fetch

### Problem

Your application owns service discovery and authenticated fetch, but needs Courier
for typed responses and structured transport errors. Service URLs may change,
so resolving one when the client is constructed can leave it using a stale endpoint.

### Solution

Inject a URL resolver and fetch function, then create and dispose a request-scoped Courier.

```ts
import { createCourier } from '@vielzeug/courier';

type Item = { id: string; name: string };

export function createItemsClient(options: {
  resolveBaseUrl: () => Promise<string>;
  fetch: typeof globalThis.fetch;
}) {
  return {
    async getItems(signal: AbortSignal): Promise<Item[]> {
      signal.throwIfAborted();
      const baseUrl = await options.resolveBaseUrl();
      signal.throwIfAborted();
      const courier = createCourier({
        baseUrl,
        fetch: (input, init) => options.fetch(input, init),
      });

      try {
        return await courier.get<Item[]>('/items', { signal });
      } finally {
        courier.dispose();
      }
    },
  };
}
```

Supply `resolveBaseUrl` from your application's discovery service and `fetch`
from its HTTP or authentication layer. The resolver returns the service's base
URL, including any path prefix. Courier appends `/items` to that base.

When adapting object methods, pass wrappers such as
`() => discovery.getBaseUrl('items')` and
`(input, init) => transport.fetch(input, init)` instead of unbound references.
This preserves each provider's method context without coupling the client to
its framework or SDK.

Pass the calling view's cancellation signal to `getItems`. The resolver in this
example has no cancellation parameter; the checks prevent starting HTTP work
when cancellation occurs before or during discovery.

The client borrows the resolver and fetch implementation; it does not dispose
their providers. It owns no persistent Courier and needs no disposal method.
Each request owns its Courier until response parsing completes.

No error conversion is needed. Courier HTTP failures retain `CourierHttpError`
with `status`, `data`, `headers`, `method` and `url`; network, timeout and
cancellation failures retain their corresponding Courier classes. Discovery
failures and cancellation before Courier is constructed propagate unchanged
as resolver/native errors. Handle errors at the calling application boundary.

The generic response type describes the expected JSON; it does not validate
the response at runtime. Use Courier's `schema` option when validation is required.

Keep upstream service credentials in a backend gateway or proxy, not in this
client, browser configuration or frontend environment variables. The injected
fetch may manage browser-safe user authentication; the backend must separately
enforce authorization and prevent service secrets from leaking through response
headers or bodies. These policies belong to your host application, not Courier.

### Pitfalls

- Resolve the URL per request when discovery can change its routing. Do not cache it at module import or client construction.
- Await the Courier request inside `try`. Returning its unresolved promise would dispose Courier too early and cancel it.
- Wrap provider methods when injecting them; extracting a method can lose its `this` context.
- Request-scoped Couriers do not share a read cache or client-level cancellation. Use the caller's signal for cancellation and an application-owned cache when reads must be shared.

### Related

- [Courier Transport Options](../api.md#types)
- [Authentication](./authentication.md)
- [Error Handling Patterns](./error-handling-patterns.md)
- [Disposal](./disposal.md)
