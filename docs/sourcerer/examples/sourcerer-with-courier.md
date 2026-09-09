---
title: 'Sourcerer Examples — Page Source with Courier'
description: 'Use Courier for HTTP transport while Sourcerer owns page state.'
---

## Page Source with Courier

### Problem

You need Courier middleware and transport errors while Sourcerer owns collection state and request succession.

### Solution

Map the Courier response into `PageResult` and forward Sourcerer’s signal.

```ts
import { createCourier } from '@vielzeug/courier';
import { createPageSource } from '@vielzeug/sourcerer';

type Issue = { id: number; title: string };
type IssueResponse = { data: Issue[]; total: number };
const courier = createCourier({ baseUrl: 'https://api.example.test' });
const source = createPageSource({
  load: async ({ page, pageSize, params: search, signal }) => {
    const result = await courier.get<IssueResponse>('/issues', { query: { page, pageSize, search }, signal });
    return { items: result.data, totalItems: result.total };
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

### Pitfalls

- Keep authentication, middleware, timeouts, and transport errors on Courier.
- Pass the loader signal to Courier.
- Use a dedicated query cache when reads must be shared by key.

### Related

- [Usage Guide](../usage#working-with-other-vielzeug-libraries)
- [Courier](/courier/)
- [Page params with URL state](./remote-search-with-url-state)
