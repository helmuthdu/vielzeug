---
title: 'Arsenal Examples — has'
description: 'has example for @vielzeug/arsenal.'
---

## has

### Problem

You need a type-safe own-property check that also narrows the TypeScript type — the typed alternative to `key in obj`.

### Solution

Use `has(item, key)` to check whether `key` is an own property of `item`, narrowing the type to include that key.

```ts
import { has } from '@vielzeug/arsenal';

const obj: Record<string, unknown> = { a: 1 };

if (has(obj, 'a')) {
  console.log(obj.a); // typed as unknown, but key is confirmed present
}
```

### Pitfalls

- Checks own properties only — inherited prototype properties return `false`.

### Related

- [isSafePath](./path.md)
- [getPath](./path.md)
