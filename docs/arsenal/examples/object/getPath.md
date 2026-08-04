---
title: 'Arsenal Examples — getPath'
description: 'getPath example for @vielzeug/arsenal.'
---

## getPath

### Problem

You need to safely read a deeply nested property from an object using a string path — without writing chained optional chaining or try-catch blocks.

### Solution

Use `getPath(item, path)` for safe dot-notation access. `getPathOr` supplies a fallback. `requirePath` throws for missing values. Numeric bracket notation is supported.

```ts
import { getPath, getPathOr, requirePath } from '@vielzeug/arsenal/object';

const config = { api: { host: 'localhost', port: 3000 }, items: [10, 20] };

getPath(config, 'api.port'); // 3000
getPath(config, 'items[1]'); // 20
getPath(config, 'api.timeout'); // undefined
getPathOr(config, 'api.timeout', 5_000); // 5000
requirePath(config, 'api.port'); // 3000
requirePath(config, 'api.timeout'); // throws TypeError
```

### Pitfalls

- Unsafe segments (`__proto__`, `constructor`, `prototype`) never resolve.
- `getPathOr` handles missing and `undefined` values.
- Use `requirePath` only when a missing value is a programmer error.

### Related

- [flattenPaths](./flattenPaths.md)
- [tryParseJson](./parseJSON.md)
