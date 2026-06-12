---
title: 'Arsenal Examples — values'
description: 'values example for @vielzeug/arsenal.'
---

## values

### Problem

You need the typed values of an object — the typed alternative to `Object.values` that preserves the value union type.

### Solution

Use `values(obj)` to get `T[keyof T][]`.

```ts
import { values } from '@vielzeug/arsenal';

const config = { host: 'localhost', port: 3000 } as const;
values(config); // ('localhost' | 3000)[]
```

### Pitfalls

- Only returns own enumerable property values — same as `Object.values`.

### Related

- [keys](./keys.md)
- [entries](./entries.md)
