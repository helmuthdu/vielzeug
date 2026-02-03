# 🏷️ Object Utilities

Object utilities provide robust tools to manipulate, compare, and traverse objects in a type-safe, ergonomic way. Use these helpers for deep cloning, merging, diffing, nested path access, and more.

## 📚 Quick Reference

| Method                               | Description                                                                |
| :----------------------------------- | :------------------------------------------------------------------------- |
| [`clone`](./object/clone.md)         | Create a deep clone of an object.                                          |
| [`merge`](./object/merge.md)         | Merge multiple objects with configurable strategies (Deep, Shallow, etc.). |
| [`diff`](./object/diff.md)           | Compare two objects and return the structural differences.                 |
| [`path`](./object/path.md)           | Safely access nested properties using dot-notation strings.                |
| [`seek`](./object/seek.md)           | Find a value anywhere within a deeply nested object by its key.            |
| [`parseJSON`](./object/parseJSON.md) | Safely parse JSON strings with optional fallback value.                    |
| [`keys`](./object/keys.md)           | Type-safe way to get an object's keys.                                     |
| [`values`](./object/values.md)       | Type-safe way to get an object's values.                                   |
| [`entries`](./object/entries.md)     | Type-safe way to get an object's entries.                                  |

## 💡 Practical Examples

### Deep Merging & Cloning

```ts
import { merge, clone } from '@vielzeug/toolkit';

const config = { api: { host: 'localhost', port: 8080 } };
const overrides = { api: { port: 3000 } };

// 1. Deep merge (config remains unchanged)
const finalConfig = merge('deep', config, overrides);
// { api: { host: 'localhost', port: 3000 } }

// 2. Deep clone
const deepCopy = clone(finalConfig);
```

### Accessing Nested Data

```ts
import { path, seek } from '@vielzeug/toolkit';

const data = {
  user: {
    profile: {
      settings: { theme: 'dark' },
    },
  },
};

// Access via path string
const theme = path(data, 'user.profile.settings.theme'); // 'dark'

// Find key 'theme' anywhere in the object
const themeAnywhere = seek(data, 'theme'); // 'dark'
```

## 🔗 All Object Utilities

<div class="grid-links">

- [clone](./object/clone.md)
- [diff](./object/diff.md)
- [entries](./object/entries.md)
- [keys](./object/keys.md)
- [merge](./object/merge.md)
- [parseJSON](./object/parseJSON.md)
- [path](./object/path.md)
- [seek](./object/seek.md)
- [values](./object/values.md)

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
