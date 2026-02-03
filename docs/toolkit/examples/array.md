# 🧩 Array Utilities

Array utilities provide a powerful set of tools to transform, query, and manipulate arrays in a type-safe, ergonomic way. Use these helpers to write cleaner, more expressive code for common array operations like mapping, filtering, grouping, and more.

## 📚 Quick Reference

| Method                              | Category       | Description                                      |
| :---------------------------------- | :------------- | :----------------------------------------------- |
| [`map`](./array/map.md)             | Transformation | Map each element to a new value (supports async) |
| [`filter`](./array/filter.md)       | Query          | Filter elements by predicate (supports async)    |
| [`reduce`](./array/reduce.md)       | Transformation | Reduce array to a single value                   |
| [`group`](./array/group.md)         | Aggregation    | Group elements by a key or function              |
| [`uniq`](./array/uniq.md)           | Set            | Remove duplicate values                          |
| [`chunk`](./array/chunk.md)         | Transformation | Split array into chunks of a specific size       |
| [`flatten`](./array/flatten.md)     | Transformation | Flatten nested arrays                            |
| [`compact`](./array/compact.md)     | Transformation | Remove `null` or `undefined` values              |
| [`sort`](./array/sort.md)           | Sorting        | Sort array with a custom comparator              |
| [`sortBy`](./array/sortBy.md)       | Sorting        | Sort array by a property or function             |
| [`find`](./array/find.md)           | Query          | Find the first element matching a predicate      |
| [`some`](./array/some.md)           | Query          | Check if any element matches a predicate         |
| [`every`](./array/every.md)         | Query          | Check if all elements match a predicate          |
| [`aggregate`](./array/aggregate.md) | Aggregation    | Perform complex aggregations on an array         |

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
import { group, sortBy } from '@vielzeug/toolkit';

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
const oldestFirst = sortBy(users, (u) => u.age, 'desc');
```

## 🔗 All Array Utilities

<div class="grid-links">

- [aggregate](./array/aggregate.md)
- [alternate](./array/alternate.md)
- [chunk](./array/chunk.md)
- [compact](./array/compact.md)
- [contains](./array/contains.md)
- [every](./array/every.md)
- [filter](./array/filter.md)
- [find](./array/find.md)
- [findIndex](./array/findIndex.md)
- [findLast](./array/findLast.md)
- [flatten](./array/flatten.md)
- [group](./array/group.md)
- [list](./array/list.md)
- [map](./array/map.md)
- [pick](./array/pick.md)
- [reduce](./array/reduce.md)
- [search](./array/search.md)
- [select](./array/select.md)
- [shift](./array/shift.md)
- [some](./array/some.md)
- [sort](./array/sort.md)
- [sortBy](./array/sortBy.md)
- [substitute](./array/substitute.md)
- [uniq](./array/uniq.md)

</div>

<style>
.grid-links ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
  list-style: none !important;
  padding: 0 !important;
}
.grid-links li {
  margin: 0 !important;
}
</style>
