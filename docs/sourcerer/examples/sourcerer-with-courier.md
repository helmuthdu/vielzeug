---
title: 'Sourcerer Examples — Page Source with Courier'
description: 'Use Courier for HTTP transport while Sourcerer owns page state.'
---

## Page Source with Courier

### Problem

You need HTTP headers, retries, and caching policy from Courier while keeping page query state and cancellation in Sourcerer.

### Solution

Pass Courier calls through a page source loader. Forward Sourcerer’s signal into Courier.

```ts
import { createCourier } from '@vielzeug/courier';
import { createPageSource } from '@vielzeug/sourcerer';

type Issue = { id: number; title: string };
const originalFetch = globalThis.fetch;
globalThis.fetch = async () =>
  new Response(JSON.stringify({ data: [{ id: 1, title: 'Document source state' }], total: 1 }), {
    headers: { 'Content-Type': 'application/json' },
  });

const courier = createCourier({ baseUrl: 'https://api.example.test' });
const source = createPageSource<Issue>({
  autoStart: false,
  load: ({ query, signal }) => courier.get('/issues', { query, signal }),
});

try {
  await source.reload();
  console.log(source.snapshot.data);
} finally {
  source.dispose();
  courier.dispose();
  globalThis.fetch = originalFetch;
}
```

### Pitfalls

- Keep Courier retry, cache, authentication, and telemetry configuration on Courier.
- Pass loader `signal` to Courier so superseded requests cancel at transport level.
- Do not add cache policy back into Sourcerer configuration.

### Related

- [Usage Guide](../usage#working-with-other-vielzeug-libraries)
- [Courier](/courier/)
- [Page query with URL state](./remote-search-with-url-state)
