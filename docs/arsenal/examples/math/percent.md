---
title: 'Arsenal Examples — percent'
description: 'percent example for @vielzeug/arsenal.'
---

## percent

### Problem

You need the percentage one value represents of a total — for example computing "what % of users are active?"

### Solution

Use `percent(value, total)` to return `(value / total) * 100`.

```ts
import { percent } from '@vielzeug/arsenal';

percent(1, 4);    // 25
percent(3, 4);    // 75
percent(0, 100);  // 0
```

### Pitfalls

- Returns `NaN` when `total` is `0`.

### Related

- [normalize](./normalize.md)
- [allocate](./allocate.md)
