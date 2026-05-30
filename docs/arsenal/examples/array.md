---
title: Arsenal — Array Examples
description: Array utility examples for Arsenal.
---

## Array Utilities

## Quick Reference

- [chunk](./array/chunk.md)
- [compact](./array/compact.md)
- [contains](./array/contains.md)
- [countBy](./array/countBy.md)
- [difference](./array/difference.md)
- [drop](./array/drop.md)
- [dropLast](./array/dropLast.md)
- [filterMap](./array/select.md)
- [first](./array/first.md)
- [flatten](./array/flatten.md)
- [groupBy](./array/group.md)
- [intersection](./array/intersection.md)
- [indexBy](./array/keyBy.md)
- [last](./array/last.md)
- [partition](./array/partition.md)
- [replace](./array/replace.md)
- [rotate](./array/rotate.md)
- [sample](./array/sampleSize.md)
- [search](./array/search.md)
- [sort](./array/sort.md)
- [take](./array/take.md)
- [takeLast](./array/takeLast.md)
- [toggle](./array/toggle.md)
- [union](./array/union.md)
- [uniq](./array/uniq.md)
- [unzip](./array/unzip.md)
- [zip](./array/zip.md)

## Common Patterns

```ts
import { chunk, compact, filterMap, groupBy, indexBy, partition, sort, toggle, uniq, zip } from '@vielzeug/arsenal';

const raw = [1, 2, 2, 3, 4];
const deduped = uniq(raw); // [1, 2, 3, 4]
const compacted = compact([0, 1, null, 2, undefined, 3]); // [1, 2, 3]

const mapped = filterMap(deduped, (n) => n * 2); // [2, 4, 6, 8]
const filtered = filterMap(deduped, (n) => (n > 2 ? n * 2 : undefined)); // [6, 8]

const pages = chunk(mapped, 2); // [[2,4], [6,8]]

const users = [
  { id: 1, role: 'admin', name: 'Alice' },
  { id: 2, role: 'user', name: 'Bob' },
  { id: 3, role: 'user', name: 'Chris' },
];

const byRole = groupBy(users, (u) => u.role);
const byId = indexBy(users, (u) => u.id);

const sorted = sort(users, { role: 'asc', name: 'asc' });
const tags = toggle(['ts', 'vite'], 'ts'); // ['vite']
const [admins, members] = partition(users, (u) => u.role === 'admin');
const paired = zip(['a', 'b'], [1, 2]); // [['a', 1], ['b', 2]]

console.log(byRole, byId, pages, sorted, tags, compacted, admins, members, paired);
```

## Notes

- `filterMap` maps values and skips only `undefined` results.
- `compact` removes all falsy values, including `0`, `''`, and `false`.
- For reactive pagination/search sources, use Sourcerer: [overview](/sourcerer/) and [usage](@vielzeug/sourcerer/usage).
