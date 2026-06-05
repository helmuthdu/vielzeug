---
title: 'Arsenal Examples — isEmpty'
description: 'isEmpty example for @vielzeug/arsenal.'
---

## isEmpty

### Problem

You need a single guard for all "has no content" states — empty string, empty array, empty object, empty `Map`, or empty `Set`.

### Solution

Use `isEmpty(value)` to check whether a value has no meaningful content.

```ts
import { isEmpty } from '@vielzeug/arsenal';

isEmpty('');        // true
isEmpty([]);        // true
isEmpty({});        // true
isEmpty(new Map()); // true
isEmpty(new Set()); // true

isEmpty('hello');   // false
isEmpty([1]);       // false
isEmpty({ a: 1 }); // false
```

### Related

- [isDefined](./isDefined.md)
- [compact](../array/compact.md)
