---
title: 'Sourcerer Examples — Remote Data with Courier'
description: 'Use Courier as the HTTP transport inside a remote Sourcerer source.'
---

## Remote Data with Courier

Pass a Courier request directly through `createRemoteSource()` and forward Sourcerer's signal so
superseded requests are cancelled at the network layer.

```ts
import { createCourier, withBearerAuth } from '@vielzeug/courier';
import { createRemoteSource } from '@vielzeug/sourcerer';

const courier = createCourier({ baseUrl: '/api' });
courier.use(withBearerAuth(async () => tokenStore.getAccessToken()));

const source = createRemoteSource<Issue, IssueFilter, IssueSort>({
  fetch: ({ filter, limit, page, search, sort }, signal) =>
    courier.get('/issues', {
      query: { filter: JSON.stringify(filter), limit, page, q: search, sort: JSON.stringify(sort) },
      signal,
    }),
  limit: 25,
});
```

Keep the Courier client outside the callback. It then reuses its headers and interceptors for every
Sourcerer request.
