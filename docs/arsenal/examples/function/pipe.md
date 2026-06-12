---
title: 'Arsenal Examples — pipe'
description: 'pipe example for @vielzeug/arsenal.'
---

## pipe

### Problem

You need to chain functions left-to-right — applying the first function and passing the result to each subsequent one.

### Solution

Use `pipe(...fns)` to create a left-to-right pipeline.

```ts
import { pipe } from '@vielzeug/arsenal';

const process = pipe(
  (s: string) => s.trim(),
  (s) => s.toLowerCase(),
  (s) => s.replace(/\s+/g, '-'),
);

process('  Hello World  '); // 'hello-world'
```

### Pitfalls

- Execution is left-to-right: the first function runs first. Use `compose` for right-to-left.

### Related

- [compose](./compose.md)
- [partial](./partial.md)
