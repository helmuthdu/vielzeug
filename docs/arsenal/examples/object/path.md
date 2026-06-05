---
title: 'Arsenal Examples — getPath'
description: 'getPath example for @vielzeug/arsenal.'
---

## getPath

### Problem

You need safe nested property access using a dot-notation string path, with a typed fallback for missing paths.

### Solution

Use `getPath(item, path, defaultValue?, options?)` to traverse nested objects. Use dot notation only — `'a.b.c'` not `'a[0]'`.

```ts
import { getPath } from '@vielzeug/arsenal';

const config = { api: { host: 'localhost', port: 3000 }, items: [10, 20] };

getPath(config, 'api.port');         // 3000
getPath(config, 'api.timeout', 5000); // 5000 — fallback for missing path
getPath(config, 'items.1');          // 20 — array index access
```

#### Throw on missing path

```ts
import { getPath } from '@vielzeug/arsenal';

getPath(config, 'api.missing', undefined, { throwOnMissing: true });
// throws TypeError
```

### Pitfalls

- **Dot notation only.** Using `'a[0]'` instead of `'a.0'` throws a `TypeError` with a correction hint.
- `isSafePath(key)` can pre-validate a path — it returns `false` for `__proto__`, `constructor`, or `prototype`.

### Related

- [flattenPaths](./flattenPaths.md)
- [parseJSON](./parseJSON.md)
