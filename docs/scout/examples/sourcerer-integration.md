---
title: 'Scout Examples — Sourcerer Integration'
description: 'Use toSearchMatcher to plug a ScoutIndex into a Sourcerer local source.'
---

## Sourcerer Integration

### Problem

Filter a local Sourcerer source with Scout's weighted fuzzy index while retaining Sourcerer's pagination and query state.

### Solution

Create one index for source items, then pass `toSearchMatcher(index)` as the source matcher.

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

### Pitfalls

- Keep source ordering explicit; use Sourcerer's `sort` query when result order matters.
- Update both index and source data after changing collection items.

### Related

- [Scout Usage Guide](../usage.md)
- [Sourcerer](/sourcerer/)
