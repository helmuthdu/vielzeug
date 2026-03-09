---
title: Toolkit — Array Examples
description: Array utility examples for Toolkit.
---

# Array Utilities

Array utilities provide a powerful set of tools to transform, query, and manipulate arrays in a type-safe, ergonomic way.

## 📚 Quick Reference

| Method                                | Category       | Description                                     |
| :------------------------------------ | :------------- | :---------------------------------------------- |
| [`chunk`](./array/chunk.md)           | Transformation | Split array into chunks of a specific size      |
| [`contains`](./array/contains.md)     | Query          | Check if array contains a value (deep equality) |
| [`fold`](./array/fold.md)             | Aggregation    | Reduce without an initial value                 |
| [`group`](./array/group.md)           | Aggregation    | Group elements by a key or function             |
| [`keyBy`](./array/keyBy.md)           | Aggregation    | Index elements by a key                         |
| [`list`](./array/list.md)             | Pagination     | Client-side reactive pagination with filtering  |
| [`pick`](./array/pick.md)             | Query          | Pick and transform single element               |
| [`remoteList`](./array/remoteList.md) | Pagination     | Server-side reactive pagination with caching    |
| [`replace`](./array/replace.md)       | Transformation | Replace first matching element                  |
| [`rotate`](./array/rotate.md)         | Transformation | Rotate elements by N positions                  |
| [`search`](./array/search.md)         | Query          | Fuzzy search in array                           |
| [`select`](./array/select.md)         | Transformation | Map and filter in one step                      |
| [`sort`](./array/sort.md)             | Sorting        | Sort with custom comparator                     |
| [`toggle`](./array/toggle.md)         | Transformation | Add or remove item (toggle behaviour)           |
| [`uniq`](./array/uniq.md)             | Set            | Remove duplicate values                         |

## 💡 Practical Examples

### Data Transformation

```ts
import { chunk, select, toggle, uniq } from '@vielzeug/toolkit';

const rawData = [1, 2, 2, 3, 4, 5];

// Remove duplicates
const unique = uniq(rawData); // [1, 2, 3, 4, 5]

// Map + filter in one pass (select returns only non-null results)
const doubled = select(unique, (x) => (x > 2 ? x * 2 : null)); // [6, 8, 10]

// Batch for processing
const batches = chunk(doubled, 2); // [[6, 8], [10]]

// Toggle item in/out of a set
const tags = toggle(['ts', 'react'], 'react'); // ['ts']
const withNew = toggle(['ts'], 'vue'); // ['ts', 'vue']
```

### Advanced Grouping & Indexing

```ts
import { group, keyBy } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
  { id: 3, name: 'Carol', role: 'user' },
];

// Group by role
const byRole = group(users, (u) => u.role);
/*
{
  admin: [{ id: 1, name: 'Alice', role: 'admin' }],
  user:  [{ id: 2, ... }, { id: 3, ... }]
}
*/

// Index by id (last wins when keys collide)
const byId = keyBy(users, 'id');
/*
{
  '1': { id: 1, name: 'Alice', ... },
  '2': { id: 2, name: 'Bob',   ... },
  '3': { id: 3, name: 'Carol', ... }
}
*/
```

### Fold — Reduce Without Initial Value

```ts
import { fold } from '@vielzeug/toolkit';

fold([1, 2, 3], (a, b) => a + b); // 6
fold([3, 1, 4], (a, b) => (a > b ? a : b)); // 4 (max)
fold([], (a, b) => a + b); // undefined
```

## 🔗 All Array Utilities

<div class="grid-links">

- [chunk](./array/chunk.md)
- [contains](./array/contains.md)
- [fold](./array/fold.md)
- [group](./array/group.md)
- [keyBy](./array/keyBy.md)
- [list](./array/list.md)
- [pick](./array/pick.md)
- [remoteList](./array/remoteList.md)
- [replace](./array/replace.md)
- [rotate](./array/rotate.md)
- [search](./array/search.md)
- [select](./array/select.md)
- [sort](./array/sort.md)
- [toggle](./array/toggle.md)
- [uniq](./array/uniq.md)

</div>
