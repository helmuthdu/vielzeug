---
title: partial
---

## partial

`flip()` was removed from Toolkit. Use `partial()` or inline argument ordering instead.

```ts
import { partial } from '@vielzeug/toolkit';

const divide = (a: number, b: number) => a / b;
const divideByTwo = partial(divide, 2);
divideByTwo(10); // 5
```
