---
title: 'Arsenal Examples — shallowEqual'
description: 'shallowEqual example for @vielzeug/arsenal.'
---

## shallowEqual

### Problem

You need to check whether two objects are equal at one level deep — for example comparing previous and next React props to decide whether to re-render.

### Solution

Use `shallowEqual(a, b)` for a fast one-level reference comparison. It compares own enumerable properties by reference without recursing.

```ts
import { shallowEqual } from '@vielzeug/arsenal';
// or: import { shallowEqual } from '@vielzeug/arsenal/guards';

const prev = { id: 1, name: 'Alice' };
const next = { id: 1, name: 'Alice' };

shallowEqual(prev, next); // true — same property values

const withNested = { id: 1, address: { city: 'Berlin' } };
const withNestedCopy = { id: 1, address: { city: 'Berlin' } };
shallowEqual(withNested, withNestedCopy); // false — address is a different reference
```

#### Use in memoization / change detection

```ts
import { shallowEqual } from '@vielzeug/arsenal';

function useShallowMemo<T extends object>(value: T, prev: T): T {
  return shallowEqual(value, prev) ? prev : value;
}
```

### Pitfalls

- Only compares one level deep — nested objects must be the **same reference** to be considered equal.
- Use `isEqual` for deep structural comparison, or `isMatch` for partial structural matching.

### Related

- [isEqual](./isEqual.md)
- [isMatch](./isMatch.md)
