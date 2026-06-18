---
title: 'Arsenal Examples — flattenPaths / unflattenPaths'
description: 'flattenPaths and unflattenPaths examples for @vielzeug/arsenal.'
---

## flattenPaths / unflattenPaths

### Problem

You need to work with deeply nested objects as flat key-value maps — for example storing nested config in a flat database table, or diffing two deep objects.

### Solution

Use `flattenPaths` to convert `{ a: { b: 1 } }` to `{ 'a.b': 1 }`, and `unflattenPaths` to reconstruct the nested form.

```ts
import { flattenPaths, unflattenPaths } from '@vielzeug/arsenal/path';
// or: import { flattenPaths, unflattenPaths } from '@vielzeug/arsenal';

const nested = {
  user: {
    name: 'Alice',
    address: { city: 'Berlin', zip: '10115' },
  },
  active: true,
};

const flat = flattenPaths(nested);
// {
//   'user.name': 'Alice',
//   'user.address.city': 'Berlin',
//   'user.address.zip': '10115',
//   'active': true,
// }

const restored = unflattenPaths(flat);
// { user: { name: 'Alice', address: { city: 'Berlin', zip: '10115' } }, active: true }
```

#### Diff two deep objects via flat maps

```ts
import { flattenPaths } from '@vielzeug/arsenal/path';

const before = flattenPaths({ api: { host: 'localhost', port: 3000 } });
const after = flattenPaths({ api: { host: 'production.example.com', port: 443 } });

const changed = Object.entries(after).filter(([key, value]) => before[key] !== value);
// [['api.host', 'production.example.com'], ['api.port', 443]]
```

### Pitfalls

- Nesting beyond **10 levels** is treated as an opaque leaf — deeply nested objects are not recursed further.
- Unsafe path segments (`__proto__`, `constructor`, `prototype`) are silently skipped in both directions.
- Array values are treated as leaves and are not flattened.

### Related

- [getPath](./getPath.md)
