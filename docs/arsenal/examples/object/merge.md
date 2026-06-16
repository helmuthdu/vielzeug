---
title: 'Arsenal Examples — deepMerge / shallowMerge'
description: 'deepMerge and shallowMerge examples for @vielzeug/arsenal.'
---

## deepMerge / shallowMerge

### Problem

You need to combine configuration objects, handling nested keys correctly — without stomping nested objects the way `Object.assign` does.

### Solution

Use `deepMerge(...items)` for recursive merging. Pass `{ arrayStrategy: 'concat' }` as the last argument to concatenate arrays. Use `shallowMerge(...items)` for a single-level `Object.assign`-style merge.

```ts
import { deepMerge } from '@vielzeug/arsenal';

const base = { api: { host: 'localhost', port: 3000 }, retries: 3 };
const overrides = { api: { port: 4000 }, timeout: 5_000 };

deepMerge(base, overrides);
// { api: { host: 'localhost', port: 4000 }, retries: 3, timeout: 5_000 }
```

#### Concatenate arrays instead of replacing them

```ts
import { deepMerge } from '@vielzeug/arsenal';

const a = { tags: ['ts', 'node'] };
const b = { tags: ['vue'] };

deepMerge(a, b, { arrayStrategy: 'concat' });
// { tags: ['ts', 'node', 'vue'] }
```

#### Merge three or more objects

```ts
import { deepMerge, shallowMerge } from '@vielzeug/arsenal';

deepMerge({ a: { x: 1 } }, { a: { y: 2 } }, { b: 3 });
// { a: { x: 1, y: 2 }, b: 3 }

shallowMerge({ a: 1, b: 2 }, { b: 3, c: 4 }, { d: 5 });
// { a: 1, b: 3, c: 4, d: 5 }
```

### Pitfalls

- `deepMerge` replaces arrays by default — pass `{ arrayStrategy: 'concat' }` as the last argument to concatenate.
- Later arguments win on key conflicts for both functions.
- The options object `{ arrayStrategy: 'concat' | 'replace' }` must be the **last** positional argument and must contain only that key.

### Related

- [defaults](./defaults.md)
- [diff](./diff.md)
