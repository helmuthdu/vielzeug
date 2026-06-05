---
title: 'Arsenal Examples — identity'
description: 'identity example for @vielzeug/arsenal.'
---

## identity

### Problem

You need a pass-through function — for example as a default transform, a no-op callback, or a type-safe placeholder in a pipeline.

### Solution

Use `identity(value)` to return its argument unchanged.

```ts
import { identity } from '@vielzeug/arsenal';

identity(42);      // 42
identity('hello'); // 'hello'

// As a default mapper
const toDisplay = displayFn ?? identity;
items.map(toDisplay);
```

### Pitfalls

- Returns the exact same reference for objects and arrays — not a copy.

### Related

- [constant](./constant.md)
- [tap](./tap.md)
