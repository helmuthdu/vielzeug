---
title: 'Arsenal Examples — pipe'
description: 'pipe example for @vielzeug/arsenal.'
---

## pipe

### Problem

You need to chain functions left-to-right, passing the output of each step as the input to the next.

### Solution

Use `pipe(...fns)` to create a left-to-right pipeline. Pass zero arguments to get the identity function.

```ts
import { pipe } from '@vielzeug/arsenal';

const process = pipe(
  (s: string) => s.trim(),
  (s) => s.toUpperCase(),
);

process('  hello world  '); // 'HELLO WORLD'

// Zero args → identity
const id = pipe(); // <T>(x: T) => T
```

### Pitfalls

- TypeScript can only infer up to a fixed number of intermediate types; annotate when the chain is very long.
- Each step must accept the return type of the previous step.

### Related

- [tap](./tap.md)
- [once](./once.md)
