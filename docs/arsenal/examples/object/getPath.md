---
title: 'Arsenal Examples — getPath'
description: 'getPath example for @vielzeug/arsenal.'
---

## getPath

### Problem

You need to safely read a deeply nested property from an object using a string path — without writing chained optional chaining or try-catch blocks.

### Solution

Use `getPath(item, path, options?)` for safe dot-notation access. Bracket notation is auto-converted by default.

```ts
import { getPath } from '@vielzeug/arsenal';

const config = { api: { host: 'localhost', port: 3000 }, items: [10, 20] };

getPath(config, 'api.port'); // 3000
getPath(config, 'items[1]'); // 20 — bracket auto-converted
getPath(config, 'api.timeout'); // undefined
```

#### Default values

```ts
import { getPath } from '@vielzeug/arsenal';

getPath(config, 'api.timeout', { fallback: 5_000 }); // 5000
getPath(config, 'missing.deep', { fallback: null }); // null
```

#### Strict mode — throw on missing path

```ts
import { getPath } from '@vielzeug/arsenal';

getPath(config, 'api.missing', { strict: true });
// throws Error: path segment 'missing' not found
```

#### Disable bracket auto-conversion

```ts
import { getPath } from '@vielzeug/arsenal';

getPath(config, 'items[0]', { bracketNotation: false });
// throws TypeError — use 'items.0' instead
```

### Pitfalls

- The option key is `fallback`, not `default` or `defaultValue`.
- Bracket notation is **on by default** — pass `{ bracketNotation: false }` to reject it.
- Unsafe segments (`__proto__`, `constructor`, `prototype`) return `options.fallback` silently.

### Related

- [flattenPaths](./flattenPaths.md)
- [parseJSON](./parseJSON.md)
