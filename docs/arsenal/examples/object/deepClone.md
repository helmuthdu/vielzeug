---
title: 'Arsenal Examples — deepClone'
description: 'Create an independent deep copy of nested objects and arrays.'
---

## deepClone

### Problem

You need to copy a nested object without sharing any references with the original — for example, to safely modify a Redux/Ripple state snapshot or duplicate a form configuration.

### Solution

Use `deepClone(value)` to produce a fully independent copy of the value.

```ts
import { deepClone } from '@vielzeug/arsenal';

const original = { user: { name: 'Alice', roles: ['admin'] } };
const copy     = deepClone(original);

copy.user.roles.push('editor');
console.log(original.user.roles); // ['admin'] — unchanged

// Safe state immutability
const savedState = deepClone(currentState);
```

### Pitfalls

- Does not clone `Date`, `Map`, `Set`, `RegExp`, or class instances by default — check the implementation notes.
- Functions and `Symbol` values are not cloneable and will be dropped or throw.
- For large objects, `structuredClone()` (built-in, Node 17+) is a faster native alternative.

### Related

- [defaults](./defaults.md)
- [mapValues](./mapValues.md)
