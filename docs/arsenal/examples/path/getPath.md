---
title: 'Arsenal Examples — getPath'
description: 'getPath example for @vielzeug/arsenal.'
---

## getPath

### Problem

You need safe nested property access with optional or required semantics.

### Solution

```ts
import { getPath, getPathOr, requirePath } from '@vielzeug/arsenal/object';

const user = {
  address: { city: 'Berlin', zip: '10115' },
  scores: [10, 20, 30],
};

getPath(user, 'address.city'); // 'Berlin'
getPath(user, 'scores[1]'); // 20
getPathOr(user, 'address.country', 'DE'); // 'DE'
requirePath(user, 'address.city'); // 'Berlin'
requirePath(user, 'address.country'); // throws TypeError
```

### Pitfalls

- Numeric bracket notation is supported.
- Unsafe segments (`__proto__`, `constructor`, `prototype`) never resolve.
- `getPathOr` returns its fallback for missing and `undefined` values.

### Related

- [flattenPaths / unflattenPaths](./flattenPaths.md)
