---
title: flatten
---

## flatten

Flattens nested arrays up to depth.

```ts
import { flatten } from '@vielzeug/arsenal';

flatten([1, [2, [3]]], 1); // [1, 2, [3]]
flatten([1, [2, [3]]], 2); // [1, 2, 3]
```
