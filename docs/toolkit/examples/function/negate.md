---
title: negate
---

## negate

Inverts predicate result.

```ts
import { negate } from '@vielzeug/toolkit';

const isEven = (n: number) => n % 2 === 0;
[1, 2, 3, 4].filter(negate(isEven)); // [1, 3]
```
