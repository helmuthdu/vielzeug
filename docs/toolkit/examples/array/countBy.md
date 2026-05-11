---
title: countBy
---

## countBy

Counts array elements by key.

```ts
import { countBy } from '@vielzeug/toolkit';

const counts = countBy(['a', 'bb', 'c'], (item) => item.length);
// { '1': 2, '2': 1 }
```
