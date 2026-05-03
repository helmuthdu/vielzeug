---
title: Toolkit — Array Examples
description: Array utility examples for Toolkit.
---

# Array Utilities

## Quick Reference

- [chunk](./array/chunk.md)
- [contains](./array/contains.md)
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

## Common Patterns

```ts
import { chunk, group, keyBy, select, sort, toggle, uniq } from '@vielzeug/toolkit';

const raw = [1, 2, 2, 3, 4];
const deduped = uniq(raw); // [1, 2, 3, 4]

const mapped = select(deduped, (n) => n * 2); // [2, 4, 6, 8]
const filtered = select(deduped, (n) => n * 2, (n) => n > 2); // [6, 8]

const pages = chunk(mapped, 2); // [[2,4], [6,8]]

const users = [
  { id: 1, role: 'admin', name: 'Alice' },
  { id: 2, role: 'user', name: 'Bob' },
  { id: 3, role: 'user', name: 'Chris' },
];

const byRole = group(users, (u) => u.role);
const byId = keyBy(users, 'id');

const sorted = sort(users, { role: 'asc', name: 'asc' });
const tags = toggle(['ts', 'vite'], 'ts'); // ['vite']

console.log(byRole, byId, pages, sorted, tags);
```

## Notes

- `pick` and `select` do not implicitly filter `null`/`undefined`; pass an explicit predicate when you want filtering.
- Use `list` for local pagination/search and `remoteList` for server-driven pagination/search.
