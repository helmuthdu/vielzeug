---
title: 'Arsenal Examples — diff / diffArrays'
description: 'diff and diffArrays examples for @vielzeug/arsenal.'
---

## diff / diffArrays

### Problem

You need to compute what changed between two object snapshots — for example logging which form fields were modified or building a patch payload for an API.

### Solution

Use `diff(before, after)` to get a structured `DiffResult` with `added`, `removed`, and `changed` arrays.

```ts
import { diff } from '@vielzeug/arsenal';

const before = { host: 'localhost', port: 3000, secure: false };
const after = { host: 'localhost', port: 4000 };

diff(before, after);
// {
//   added: [],
//   removed: ['secure'],
//   changed: { port: { before: 3000, after: 4000 } },
// }
```

#### Check if a key was removed

```ts
import { diff } from '@vielzeug/arsenal';

const { removed, changed } = diff({ a: 1, b: 2 }, { a: 1 });
removed.includes('b'); // true
```

#### Custom equality function

```ts
import { diff } from '@vielzeug/arsenal';

diff(
  { ids: [1, 2] },
  { ids: [1, 2] },
  (a, b) => JSON.stringify(a) === JSON.stringify(b),
);
// { added: [], removed: [], changed: {} }
```

#### Array set-difference with diffArrays

```ts
import { diffArrays } from '@vielzeug/arsenal';

diffArrays([1, 2, 3], [2, 3, 4]);
// { added: [4], removed: [1] }

diffArrays(
  [{ id: 1 }, { id: 2 }],
  [{ id: 2 }, { id: 3 }],
  { compareFn: (a, b) => a.id === b.id },
);
// { added: [{ id: 3 }], removed: [{ id: 1 }] }
```

### Pitfalls

- `diff` performs a **shallow** key-level diff — nested object changes are recorded as the whole value pair, not recursively expanded.
- Both arguments default to `{}`, so calling `diff(undefined, { a: 1 })` is valid and returns `{ added: ['a'], removed: [], changed: {} }`.
- `diffArrays` is **order-independent** (set difference) — it does not track element positions.

### Related

- [deepMerge](./merge.md)
- [pick](./pick.md)
