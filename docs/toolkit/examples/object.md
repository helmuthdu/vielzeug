# 🏷️ Object Utilities Examples

Object utilities help you manipulate, compare, and traverse objects in a type-safe, ergonomic way. Use these helpers for
cloning, merging, diffing, extracting keys/values, and more.

## 📚 Quick Reference

| Method    | Description                              |
| --------- | ---------------------------------------- |
| clone     | Shallow copy of an object                |
| diff      | Find differences between objects         |
| entries   | Get key-value pairs as array             |
| keys      | Get object keys as array                 |
| merge     | Merge two or more objects                |
| parseJSON | Safely parse JSON with fallback          |
| path      | Get value at a given path                |
| seek      | Find value by predicate in nested object |
| values    | Get object values as array               |

## 🔗 Granular Examples

- [clone](./object/clone.md)
- [diff](./object/diff.md)
- [entries](./object/entries.md)
- [keys](./object/keys.md)
- [merge](./object/merge.md)
- [parseJSON](./object/parseJSON.md)
- [path](./object/path.md)
- [seek](./object/seek.md)
- [values](./object/values.md)

## 💡 Example Usage

```ts
import { clone, merge, diff, keys, values, entries } from '@vielzeug/toolkit';

const obj = { a: 1, b: 2 };

// Shallow copy
const copy = clone(obj); // { a: 1, b: 2 }

// Merge objects
const merged = merge({ a: 1 }, { b: 2 }); // { a: 1, b: 2 }

// Find differences
const difference = diff({ a: 1 }, { a: 2 }); // { a: [1,2] }

// Get keys/values/entries
const ks = keys(obj); // ['a','b']
const vs = values(obj); // [1,2]
const es = entries(obj); // [['a',1],['b',2]]
```

## 🔎 See Also

- [Array Utilities](./array.md)
- [String Utilities](./string.md)
- [Typed Utilities](./typed.md)
