---
title: 'Arsenal Examples — filterMap'
description: 'filterMap example for @vielzeug/arsenal.'
---

## filterMap

### Problem

You need to transform an array and drop some items in a single pass — without a separate `filter` then `map` chain.

### Solution

Use `filterMap(array, fn)` to map items and skip any where the callback returns `undefined`.

```ts
import { filterMap } from '@vielzeug/arsenal';

const values = [1, null, 2, null, 3];

// Return undefined to drop; return a value to keep
filterMap(values, (n) => (n == null ? undefined : n * 2));
// [2, 4, 6]
```

#### Transform and narrow type

```ts
import { filterMap } from '@vielzeug/arsenal';

type Raw = { value: string | null };
const rows: Raw[] = [{ value: 'a' }, { value: null }, { value: 'b' }];

const strings: string[] = filterMap(rows, (r) => r.value ?? undefined);
// ['a', 'b']
```

### Pitfalls

- Return `undefined` to drop an item. Returning `null` keeps it.
- Not lazy — processes the whole array in one pass.

### Related

- [compact](./compact.md)
- [partition](./partition.md)
