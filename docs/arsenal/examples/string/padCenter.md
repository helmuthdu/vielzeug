---
title: 'Arsenal Examples — padCenter'
description: 'Center-pad strings with @vielzeug/arsenal.'
---

## padCenter

### Problem

You need to center a string in fixed-width output.

### Solution

Use `padCenter(value, targetLength, fill?)` to distribute padding across both sides.

```ts
import { padCenter } from '@vielzeug/arsenal/string';

padCenter('5', 3); // ' 5 '
padCenter('5', 5, '0'); // '00500'
padCenter('hello', 9); // '  hello  '
```

### Pitfalls

- An odd extra character is added on the right.
- Values already at or beyond `targetLength` are returned unchanged.

### Related

- [truncate](./truncate.md)
