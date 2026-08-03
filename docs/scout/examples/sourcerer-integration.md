---
title: 'Scout Examples — Sourcerer Integration'
description: 'Use toSearchMatcher to plug a ScoutIndex into a Sourcerer local source.'
---

## Sourcerer Integration

```ts
import { createIndex, toSearchMatcher } from '@vielzeug/scout';
import { createLocalSource } from '@vielzeug/sourcerer';

const index = createIndex(users, {
  fields: [{ field: 'name', weight: 2 }, 'email', 'role'],
  threshold: 0.25,
});

const source = createLocalSource(users, {
  initialQuery: { pageSize: 10 },
  match: toSearchMatcher(index),
});

source.subscribe(({ data, page }) => {
  console.log(`${page.total} result(s)`, data);
});

source.setQuery({ search: 'alice' });
index.add(newUser);
source.setData(index.items);
```

`toSearchMatcher()` caches one indexed match set per query. Local-source ordering stays explicit; apply a source `sort` query when needed.
