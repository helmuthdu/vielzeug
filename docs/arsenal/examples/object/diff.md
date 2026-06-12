---
title: 'Arsenal Examples — diff'
description: 'diff example for @vielzeug/arsenal.'
---

## diff

### Problem

You need to compute what changed between two object snapshots — for example logging which form fields were modified or building a patch payload for an API.

### Solution

Use `diff(before, after)` to get a partial object containing only the changed keys. Removed keys appear as the `DELETED` symbol.

```ts
import { diff, DELETED } from '@vielzeug/arsenal';

const before = { host: 'localhost', port: 3000, secure: false };
const after = { host: 'localhost', port: 4000 };

diff(before, after);
// { port: 4000, secure: DELETED }
```

#### Checking for deletions

```ts
import { diff, DELETED } from '@vielzeug/arsenal';

const changes = diff({ a: 1, b: 2 }, { a: 1 });
changes.b === DELETED; // true
```

### Pitfalls

- `DELETED` is a unique symbol — compare with `=== DELETED`, not truthy/falsy checks.
- Only performs a shallow diff. Nested object changes are represented as the whole nested value, not recursively diffed.

### Related

- [deepMerge](./merge.md)
- [pick](./pick.md)
