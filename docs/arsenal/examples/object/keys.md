---
title: 'Arsenal Examples — keys'
description: 'keys example for @vielzeug/arsenal.'
---

## keys

### Problem

You need the typed keys of an object as a literal union rather than the `string[]` that `Object.keys` returns.

### Solution

Use `keys(obj)` to get `(keyof T)[]` — the array of own enumerable keys with preserved literal types.

```ts
import { keys } from '@vielzeug/arsenal';

const config = { host: 'localhost', port: 3000 } as const;
keys(config); // ('host' | 'port')[]
```

### Pitfalls

- Only returns own enumerable properties — same as `Object.keys`.

### Related

- [entries](./entries.md)
- [values](./values.md)
