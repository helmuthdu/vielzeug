---
title: 'Arsenal Examples — getPath'
description: 'getPath example for @vielzeug/arsenal.'
---

## getPath

### Problem

You need to safely read a deeply nested property from an object using a string path — without writing chained optional chaining or try-catch blocks.

### Solution

Use `getPath(item, path, options?)` for safe dot-notation access with optional fallback and strict mode. Bracket notation is auto-converted by default.

```ts
import { getPath } from '@vielzeug/arsenal/object';
// or: import { getPath } from '@vielzeug/arsenal';

const obj = {
  user: {
    address: { city: 'Berlin', zip: '10115' },
    scores: [10, 20, 30],
  },
};

getPath(obj, 'user.address.city'); // 'Berlin'
getPath(obj, 'user.scores.1'); // 20
getPath(obj, 'user.scores[1]'); // 20 — bracket auto-converted
getPath(obj, 'user.address.country'); // undefined
```

#### Default values

```ts
import { getPath } from '@vielzeug/arsenal';

getPath(obj, 'user.address.country', { fallback: 'DE' }); // 'DE'
getPath(obj, 'user.missing.deep', { fallback: null }); // null
```

#### Strict mode — throw on missing segments

```ts
import { getPath } from '@vielzeug/arsenal';

getPath(obj, 'user.address.missing', { strict: true });
// throws Error: path segment 'missing' not found
```

#### Disable bracket auto-conversion

```ts
import { getPath } from '@vielzeug/arsenal';

getPath(obj, 'user.scores[0]', { bracketNotation: false });
// throws TypeError: bracket notation not allowed — use 'user.scores.0'
```

### Pitfalls

- Bracket notation is **auto-converted by default** — `a[0].b` becomes `a.0.b`. Pass `{ bracketNotation: false }` to throw on bracket syntax.
- Unsafe path segments (`__proto__`, `constructor`, `prototype`) return `options.fallback` silently.
- `strict` takes precedence over `fallback` when both are set.

### Related

- [flattenPaths / unflattenPaths](./flattenPaths.md)
