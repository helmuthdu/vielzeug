---
title: 'Arsenal Examples — endsWith'
description: 'endsWith example for @vielzeug/arsenal.'
---

## endsWith

### Problem

You need to check whether a string ends with a given suffix in a pipeline-friendly way.

### Solution

Use `endsWith(value, suffix)` to return a boolean.

```ts
import { endsWith } from '@vielzeug/arsenal';

endsWith('hello.ts', '.ts'); // true
endsWith('hello.js', '.ts'); // false
```

### Related

- [startsWith](./startsWith.md)
- [truncate](./truncate.md)
