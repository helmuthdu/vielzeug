---
title: 'Arsenal Examples — compose'
description: 'compose example for @vielzeug/arsenal.'
---

## compose

### Problem

You need to chain functions right-to-left — applying the last function first and passing the result to each preceding function.

### Solution

Use `compose(...fns)` to create a pipeline that evaluates right-to-left.

```ts
import { compose } from '@vielzeug/arsenal';

const process = compose(
  (s: string) => s.toUpperCase(),
  (s: string) => s.trim(),
);

process('  hello world  '); // 'HELLO WORLD'
```

### Pitfalls

- Execution is right-to-left: the last function runs first. Use `pipe` for left-to-right composition.

### Related

- [pipe](./pipe.md)
- [partial](./partial.md)
