---
title: 'Toolkit — Object Examples'
description: 'Object utility examples for Toolkit.'
---

# Object Utilities

Object utilities provide robust tools to manipulate, compare, and traverse objects in a type-safe, ergonomic way. Use these helpers for deep merging, diffing, nested path access, caching, and more.

## 📚 Quick Reference

## Problem

Implement 📚 quick reference in a production-friendly way with `@vielzeug/toolkit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/toolkit` installed.

| Method                               | Description                                                                  |
| :----------------------------------- | :--------------------------------------------------------------------------- |
| [`stash`](./object/stash.md)         | Key-value cache with automatic GC and observer support.                      |
| [`diff`](./object/diff.md)           | Compare two objects and return the structural differences.                   |
| [`merge`](./object/merge.md)         | Merge multiple objects with configurable strategies (deep, shallow, concat). |
| [`parseJSON`](./object/parseJSON.md) | Safely parse JSON strings with optional fallback value.                      |
| [`get`](./object/path.md)            | Safely access nested properties using dot-notation strings.                  |
| [`proxy`](./object/proxy.md)         | Object proxy with get/set intercept hooks.                                   |
| [`prune`](./object/prune.md)         | Recursively remove null/undefined/empty values.                              |
| [`seek`](./object/seek.md)           | Recursively search nested values by similarity threshold.                    |

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
import { get, seek } from '@vielzeug/toolkit';

const data = {
  user: {
    profile: {
      settings: { theme: 'dark' },
    },
  },
};

// Access via path string
const theme = get(data, 'user.profile.settings.theme'); // 'dark'

// Search values anywhere in the object
const hasDark = seek(data, 'dark'); // true
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
import { stash } from '@vielzeug/toolkit';

const myCache = stash<string>({ hash: (key) => JSON.stringify(key) });
myCache.set(['user', 1], 'John Doe');
myCache.get(['user', 1]); // 'John Doe'
myCache.scheduleGc(['user', 1], 5000); // Auto-delete after 5s
myCache.size(); // 1
```

## 🔗 All Object Utilities

<div class="grid-links">

- [stash](./object/stash.md)
- [diff](./object/diff.md)
- [merge](./object/merge.md)
- [parseJSON](./object/parseJSON.md)
- [get](./object/path.md)
- [proxy](./object/proxy.md)
- [prune](./object/prune.md)
- [seek](./object/seek.md)

</div>

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Array Examples](./array.md)
- [Async Examples](./async.md)
- [Date Examples](./date.md)
