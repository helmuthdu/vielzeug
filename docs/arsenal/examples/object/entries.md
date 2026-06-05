---
title: 'Arsenal Examples — entries'
description: 'entries example for @vielzeug/arsenal.'
---

## entries

### Problem

You need typed key-value pairs from an object without losing the key type that `Object.entries` widens to `string`.

### Solution

Use `entries(obj)` to get `[keyof T, T[keyof T]][]` pairs with preserved key types.

```ts
import { entries } from '@vielzeug/arsenal';

const config = { host: 'localhost', port: 3000 } as const;
for (const [key, value] of entries(config)) {
  console.log(key, value); // key is 'host' | 'port', not string
}
```

### Pitfalls

- Only returns own enumerable properties — same as `Object.entries`.

### Related

- [keys](./keys.md)
- [values](./values.md)
- [fromEntries](./fromEntries.md)
