---
title: 'Scout Examples — Sourcerer Integration'
description: 'Use toSearchMatcher to filter in-memory collections with a ScoutIndex.'
---

## Sourcerer Integration

### Problem

Filter and paginate an in-memory collection with Scout's weighted fuzzy index while keeping Sourcerer's state current.

### Solution

Create one Scout index for the collection, then pass `toSearchMatcher(index)` as Sourcerer's local filter.

```ts
import { createIndex, toSearchMatcher } from '@vielzeug/scout';
import { createLocalSource } from '@vielzeug/sourcerer';

let users = [
  { email: 'ada@example.com', name: 'Ada Lovelace', role: 'admin' },
  { email: 'grace@example.com', name: 'Grace Hopper', role: 'engineer' },
];
const index = createIndex(users, {
  fields: [{ field: 'name', weight: 2 }, 'email', 'role'],
  threshold: 0.25,
});
const source = createLocalSource(users, { filter: toSearchMatcher(index), params: '' });

source.setParams('ada');
console.log(source.state.items); // Ada Lovelace

users = [...users, { email: 'linus@example.com', name: 'Linus Torvalds', role: 'engineer' }];
index.setItems(users);
source.setItems(users);

source.dispose();
```

### Pitfalls

- Keep the Scout index and Sourcerer source synchronized from the same collection update.
- Sourcerer preserves collection order; sort the input collection when result order matters.

### Related

- [Scout Usage Guide](../usage.md)
- [Sourcerer](/sourcerer/)
