---
title: 'Arsenal Examples — isEqual'
description: 'isEqual example for @vielzeug/arsenal.'
---

## isEqual

### Problem

You need deep equality between two values — for example change-detection, deduplication, or memoization key comparison.

### Solution

Use `isEqual(a, b, options?)` for deep equality. Pass `{ depth: 'shallow' }` to compare only one level by reference.

```ts
import { isEqual } from '@vielzeug/arsenal';

isEqual({ a: 1 }, { a: 1 }); // true
isEqual([1, [2, 3]], [1, [2, 3]]); // true
isEqual(new Date('2024'), new Date('2024')); // true

isEqual({ a: 1 }, { a: 2 }); // false
```

#### Shallow mode

```ts
import { isEqual } from '@vielzeug/arsenal';

const arr = [1, 2, 3];
isEqual({ arr }, { arr }, { depth: 'shallow' }); // true — same reference
isEqual([1, 2], [1, 2], { depth: 'shallow' }); // false — different references
```

### Pitfalls

- Deep equality is recursive — avoid on very large graphs without memoization.
- Handles circular references, `Date`, `Map`, and `Set`.

### Related

- [isMatch](./isMatch.md)
- [diff](../object/diff.md)
