---
title: 'Arsenal Examples — pad'
description: 'pad example for @vielzeug/arsenal.'
---

## pad

### Problem

You need to center-pad a string to a target length — for example formatting fixed-width output or code display.

### Solution

Use `pad(str, targetLength, fillString?)` to add padding evenly to both sides.

```ts
import { pad } from '@vielzeug/arsenal';

pad('5', 3);       // ' 5 '
pad('5', 5, '0');  // '00500'
pad('hello', 9);   // '  hello  '
```

### Pitfalls

- If `targetLength` is less than or equal to the string length, the original string is returned unchanged.

### Related

- [truncate](./truncate.md)
