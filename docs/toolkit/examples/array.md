# 🧩 Array Utilities

Array utilities provide a powerful set of tools to transform, query, and manipulate arrays in a type-safe, ergonomic way. Use these helpers to write cleaner, more expressive code for common array operations like mapping, filtering, grouping, and more.

## 📚 Quick Reference

| Method                                | Category       | Description                                      |
| :------------------------------------ | :------------- | :----------------------------------------------- |
| [`aggregate`](./array/aggregate.md)   | Aggregation    | Perform complex aggregations on an array         |
| [`arrange`](./array/arrange.md)       | Sorting        | Sort array by a property or function             |
| [`chunk`](./array/chunk.md)           | Transformation | Split array into chunks of a specific size       |
| [`compact`](./array/compact.md)       | Transformation | Remove `null` or `undefined` values              |
| [`every`](./array/every.md)           | Query          | Check if all elements match a predicate          |
| [`filter`](./array/filter.md)         | Query          | Filter elements by predicate (supports async)    |
| [`find`](./array/find.md)             | Query          | Find the first element matching a predicate      |
| [`flatten`](./array/flatten.md)       | Transformation | Flatten nested arrays                            |
| [`group`](./array/group.md)           | Aggregation    | Group elements by a key or function              |
| [`list`](./array/list.md)             | Pagination     | Client-side reactive pagination with filtering   |
| [`map`](./array/map.md)               | Transformation | Map each element to a new value (supports async) |
| [`reduce`](./array/reduce.md)         | Transformation | Reduce array to a single value                   |
| [`remoteList`](./array/remoteList.md) | Pagination     | Server-side reactive pagination with caching     |
| [`some`](./array/some.md)             | Query          | Check if any element matches a predicate         |
| [`sort`](./array/sort.md)             | Sorting        | Sort array with custom comparator                |
| [`uniq`](./array/uniq.md)             | Set            | Remove duplicate values                          |

## 💡 Practical Examples

### Data Transformation

```ts
import { map, chunk, compact, uniq } from '@vielzeug/toolkit';

const rawData = [1, 2, null, 2, 3, undefined, 4];

// 1. Clean data (remove nulls/undefined)
const clean = compact(rawData); // [1, 2, 2, 3, 4]

// 2. Get unique values
const unique = uniq(clean); // [1, 2, 3, 4]

// 3. Transform values
const doubled = map(unique, (x) => x * 2); // [2, 4, 6, 8]

// 4. Batch for processing
const batches = chunk(doubled, 2); // [[2, 4], [6, 8]]
```

### Advanced Grouping & Sorting

```ts
import { group, arrange } from '@vielzeug/toolkit';

const users = [
  { name: 'Alice', role: 'admin', age: 30 },
  { name: 'Bob', role: 'user', age: 25 },
  { name: 'Charlie', role: 'user', age: 35 },
];

// Group by role
const byRole = group(users, (u) => u.role);
/*
{
  admin: [{ name: 'Alice', ... }],
  user: [{ name: 'Bob', ... }, { name: 'Charlie', ... }]
}
*/

// Sort by age (descending)
const oldestFirst = arrange(users, (u) => u.age, 'desc');
```

## 🔗 All Array Utilities

<div class="grid-links">

- [aggregate](./array/aggregate.md)
- [alternate](./array/alternate.md)
- [arrange](./array/arrange.md)
- [chunk](./array/chunk.md)
- [compact](./array/compact.md)
- [contains](./array/contains.md)
- [every](./array/every.md)
- [filter](./array/filter.md)
- [findIndex](./array/findIndex.md)
- [findLast](./array/findLast.md)
- [find](./array/find.md)
- [flatten](./array/flatten.md)
- [group](./array/group.md)
- [list](./array/list.md)
- [map](./array/map.md)
- [pick](./array/pick.md)
- [reduce](./array/reduce.md)
- [remoteList](./array/remoteList.md)
- [search](./array/search.md)
- [select](./array/select.md)
- [shift](./array/shift.md)
- [some](./array/some.md)
- [sort](./array/sort.md)
- [substitute](./array/substitute.md)
- [uniq](./array/uniq.md)

</div>
