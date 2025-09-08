# 🧩 Array Utilities Examples

Array utilities help you transform, query, and manipulate arrays in a type-safe, ergonomic way. Use these helpers to
write cleaner, more expressive code for common array operations like mapping, filtering, grouping, and more.

## 📚 Quick Reference

| Method     | Description                            |
| ---------- | -------------------------------------- |
| aggregate  | Aggregate values in an array           |
| alternate  | Alternate values in an array           |
| chunk      | Split array into chunks                |
| compact    | Remove falsy values                    |
| contains   | Check if array contains a value        |
| every      | Test if all elements pass a predicate  |
| filter     | Filter elements by predicate           |
| find       | Find first element matching predicate  |
| findIndex  | Find index of first matching element   |
| findLast   | Find last element matching predicate   |
| flatten    | Flatten nested arrays                  |
| group      | Group elements by key or function      |
| list       | Convert array-like to array            |
| map        | Map each element to a new value        |
| pick       | Pick elements by indices               |
| reduce     | Reduce array to a single value         |
| search     | Search for a value or pattern          |
| select     | Select elements by predicate           |
| shift      | Remove first element                   |
| some       | Test if any element passes a predicate |
| sort       | Sort array                             |
| sortBy     | Sort array by key or function          |
| substitute | Substitute values in array             |
| uniq       | Remove duplicate values                |

## 🔗 Examples

### Transformation

- [map](./array/map.md)
- [reduce](./array/reduce.md)
- [flatten](./array/flatten.md)
- [chunk](./array/chunk.md)
- [compact](./array/compact.md)
- [substitute](./array/substitute.md)
- [pick](./array/pick.md)
- [list](./array/list.md)

### Query & Search

- [find](./array/find.md)
- [findIndex](./array/findIndex.md)
- [findLast](./array/findLast.md)
- [filter](./array/filter.md)
- [search](./array/search.md)
- [contains](./array/contains.md)
- [every](./array/every.md)
- [some](./array/some.md)
- [select](./array/select.md)

### Aggregation & Grouping

- [group](./array/group.md)
- [aggregate](./array/aggregate.md)

### Set Operations

- [uniq](./array/uniq.md)

### Sorting

- [sort](./array/sort.md)
- [sortBy](./array/sortBy.md)

### Other

- [alternate](./array/alternate.md)
- [shift](./array/shift.md)

## 💡 Example Usage

```ts
import { map, filter, group, reduce, chunk, flatten, uniq } from '@vielzeug/toolkit';

const arr = [1, 2, 2, 3, 4];

// Double each value
const doubled = map(arr, (x) => x * 2); // [2, 4, 4, 6, 8]

// Filter even numbers
const evens = filter(arr, (x) => x % 2 === 0); // [2, 2, 4]

// Group by even/odd
const grouped = group(arr, (x) => (x % 2 === 0 ? 'even' : 'odd')); // { even: [2,2,4], odd: [1,3] }

// Sum all values
const sum = reduce(arr, (acc, x) => acc + x, 0); // 12

// Split into chunks of 2
const chunks = chunk(arr, 2); // [[1,2],[2,3],[4]]

// Flatten nested arrays
const flat = flatten([
  [1, 2],
  [3, 4],
]); // [1,2,3,4]

// Remove duplicates
const unique = uniq(arr); // [1,2,3,4]
```

## 🔎 See Also

- [Object Utilities](./object.md)
- [String Utilities](./string.md)
- [Typed Utilities](./typed.md)
