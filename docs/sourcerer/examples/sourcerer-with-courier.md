---
title: 'Sourcerer Examples: Page Source with Courier'
description: 'Map one-based source pages to zero-based HTTP pages with server totals and cancellation.'
---

## Page Source with Courier

### Problem

Your remote API uses zero-based page numbers, while Sourcerer starts at page 1.
You need Courier transport and errors while Sourcerer owns page state and request succession.

### Solution

Convert page numbers only at the HTTP boundary. Map the server's total count into
`PageResult.totalItems` and forward Sourcerer's cancellation signal.

```ts
import { createCourier } from '@vielzeug/courier';
import { createPageSource } from '@vielzeug/sourcerer';

type Issue = { id: number; title: string };
type RemotePage<T> = {
  content: T[];
  page: { totalElements: number };
};
const courier = createCourier({ baseUrl: 'https://api.example.test' });
const source = createPageSource<Issue, string>({
  load: async ({ page, pageSize, params: search, signal }) => {
    const response = await courier.get<RemotePage<Issue>>('/issues', {
      query: { page: page - 1, size: pageSize, search },
      signal,
    });
    return { items: response.content, totalItems: response.page.totalElements };
  },
  params: '',
});

try {
  await source.reload();
  console.log(source.state.items);
} finally {
  source.dispose();
  courier.dispose();
}
```

Source page 1 requests remote page 0; source page 3 requests remote page 2.
With a page size of 20 and a server total of 51, Sourcerer reports three pages,
regardless of how many items the current response contains.

The example uses a subset of Spring Data's simplified `PagedModel`/`VIA_DTO`
response shape. Other APIs and Spring serialization modes may put the total
elsewhere; adapt the envelope to your endpoint's actual contract.

Replacing a load aborts the previous loader signal, which Courier forwards to
fetch. Superseded work settles without committing stale results. A current load
failure populates `source.state.error` and rejects the loading command; handle
that error at your application boundary.

This example owns both resources, so it disposes the source before Courier.
When a loader receives a shared application Courier, dispose only the source;
the application's client owner handles Courier disposal.

Keep authentication, middleware, timeouts and transport errors on Courier.
Keep router/URL state outside Sourcerer: a route's page convention is separate
from the remote API's page convention. Use a dedicated query cache when reads
must be shared by key.

### Pitfalls

- Subtract one only in the HTTP query. Keep source navigation and state one-based.
- Use the server total, not `response.content.length`, for `totalItems`.
- Pass the loader signal to Courier; do not replace it with an unrelated controller.
- A generic response type does not validate JSON at runtime. Use Courier's `schema` option if your endpoint needs validation.

### Related

- [Usage Guide](../usage#working-with-other-vielzeug-libraries)
- [Courier](/courier/)
- [Page params with URL state](./remote-search-with-url-state)
- [Spring Data Page Representation](https://docs.spring.io/spring-data/commons/reference/repositories/core-extensions.html#core.web.page)
