---
title: mapKeys
---

## mapKeys

Transforms object keys.

```ts
import { mapKeys } from '@vielzeug/arsenal';

mapKeys({ a: 1, b: 2 }, (key) => `x_${String(key)}`);
// { x_a: 1, x_b: 2 }
```
