---
title: Toolkit — Object Examples
description: Object utility examples for Toolkit.
---

# Object Utilities

Object utilities provide robust tools to manipulate, compare, and traverse objects in a type-safe, ergonomic way. Use these helpers for deep merging, diffing, nested path access, caching, and more.

## 📚 Quick Reference

| Method                               | Description                                                                  |
| :----------------------------------- | :--------------------------------------------------------------------------- |
| [`cache`](./object/cache.md)         | Key-value cache with automatic GC and observer support.                      |
| [`diff`](./object/diff.md)           | Compare two objects and return the structural differences.                   |
| [`merge`](./object/merge.md)         | Merge multiple objects with configurable strategies (deep, shallow, concat). |
| [`parseJSON`](./object/parseJSON.md) | Safely parse JSON strings with optional fallback value.                      |
| [`path`](./object/path.md)           | Safely access nested properties using dot-notation strings.                  |
| [`proxy`](./object/proxy.md)         | Object proxy with get/set intercept hooks.                                   |
| [`prune`](./object/prune.md)         | Recursively remove null/undefined/empty values.                              |
| [`seek`](./object/seek.md)           | Find a value anywhere within a deeply nested object by its key.              |

## 💡 Practical Examples

### Deep Merging & Diffing

```ts
import { merge, diff } from '@vielzeug/toolkit';

const config = { api: { host: 'localhost', port: 8080 } };
const overrides = { api: { port: 3000 } };

// Deep merge (config remains unchanged)
const finalConfig = merge('deep', config, overrides);
// { api: { host: 'localhost', port: 3000 } }

// Find what changed
const changes = diff(config, finalConfig);
// { api: { port: { from: 8080, to: 3000 } } }
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

### Pruning & Cleaning

```ts
import { prune } from '@vielzeug/toolkit';

// Remove all nulls, undefined, empty strings, and empty objects/arrays
prune({ a: 1, b: null, c: '', d: { e: undefined } }); // { a: 1 }
prune([1, null, '', 2, undefined]); // [1, 2]
prune('  hello  '); // 'hello'
prune('   '); // undefined
```

### Caching

```ts
import { cache } from '@vielzeug/toolkit';

const myCache = cache<string>();
myCache.set(['user', 1], 'John Doe');
myCache.get(['user', 1]); // 'John Doe'
myCache.scheduleGc(['user', 1], 5000); // Auto-delete after 5s
myCache.size(); // 1
```

## 🔗 All Object Utilities

<div class="grid-links">

- [cache](./object/cache.md)
- [diff](./object/diff.md)
- [merge](./object/merge.md)
- [parseJSON](./object/parseJSON.md)
- [path](./object/path.md)
- [proxy](./object/proxy.md)
- [prune](./object/prune.md)
- [seek](./object/seek.md)

</div>
