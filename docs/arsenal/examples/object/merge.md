---
title: 'Arsenal Examples — deepMerge / deepMergeWith / shallowMerge'
description: 'deepMerge, deepMergeWith, and shallowMerge examples for @vielzeug/arsenal.'
---

## deepMerge / deepMergeWith / shallowMerge

### Problem

You need to combine configuration objects, handling nested keys correctly — without stomping nested objects the way `Object.assign` does.

### Solution

Use `deepMerge(...items)` for recursive merging. Use `deepMergeWith({ arrayStrategy: 'concat' })` when arrays should be concatenated. Use `shallowMerge(...items)` for a single-level `Object.assign`-style merge.

```ts
import { deepMerge } from '@vielzeug/arsenal';

const base = { api: { host: 'localhost', port: 3000 }, retries: 3 };
const overrides = { api: { port: 4000 }, timeout: 5_000 };

deepMerge(base, overrides);
// { api: { host: 'localhost', port: 4000 }, retries: 3, timeout: 5_000 }
```

#### Concatenate arrays instead of replacing them

```ts
import { deepMergeWith } from '@vielzeug/arsenal';

const a = { tags: ['ts', 'node'] };
const b = { tags: ['vue'] };

deepMergeWith({ arrayStrategy: 'concat' })(a, b);
// { tags: ['ts', 'node', 'vue'] }
```

#### Shallow merge (Object.assign-style)

```ts
import { shallowMerge } from '@vielzeug/arsenal';

shallowMerge({ a: 1, b: 2 }, { b: 3, c: 4 });
// { a: 1, b: 3, c: 4 }
```

### Pitfalls

- `deepMerge` replaces arrays by default — use `deepMergeWith` to concatenate.
- Later arguments win on key conflicts for both functions.

### Related

- [defaults](./defaults.md)
- [diff](./diff.md)
