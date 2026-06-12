---
title: 'Arsenal Examples — last'
description: 'last example for @vielzeug/arsenal.'
---

## last

### Problem

You need the last element of an array safely, without accessing `array[array.length - 1]` and handling the empty-array case explicitly.

### Solution

Use `last(array, fallback?)` to get the last element or a typed fallback.

```ts
import { last } from '@vielzeug/arsenal';

last([10, 20, 30]); // 30
last([]); // undefined
last([], -1); // -1
```

### Pitfalls

- Without a fallback, the return type includes `undefined`. Provide a fallback to get a non-optional type.

### Related

- [first](./first.md)
- [takeLast](./takeLast.md)
