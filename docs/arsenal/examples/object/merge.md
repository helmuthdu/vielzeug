---
title: 'Arsenal Examples — deepMerge / shallowMerge'
description: 'deepMerge and shallowMerge examples for @vielzeug/arsenal.'
---

## deepMerge / shallowMerge

### Problem

You need to combine configuration objects without stomping nested values.

### Solution

Pass deep-merge sources as an array. Configuration stays separate from data. Use `shallowMerge(...items)` for a single-level `Object.assign`-style merge.

```ts
import { deepMerge } from '@vielzeug/arsenal/object';

const base = { api: { host: 'localhost', port: 3000 }, retries: 3 };
const overrides = { api: { port: 4000 }, timeout: 5_000 };

const merged = deepMerge([base, overrides]);
// { api: { host: 'localhost', port: 4000 }, retries: 3, timeout: 5_000 }
```

#### Concatenate arrays instead of replacing them

```ts
import { deepMerge } from '@vielzeug/arsenal/object';

const merged = deepMerge([{ tags: ['ts', 'node'] }, { tags: ['vue'] }], { arrayStrategy: 'concat' });
// { tags: ['ts', 'node', 'vue'] }
```

### Pitfalls

- `deepMerge` replaces arrays by default.
- Options are second argument; source objects always stay in first array argument.
- Later sources win on key conflicts.

### Related

- [defaults](./defaults.md)
- [diff](./diff.md)
