---
title: mapValues
---

## mapValues

Transforms object values.

```ts
import { mapValues } from '@vielzeug/arsenal';

mapValues({ a: 1, b: 2 }, (value) => value * 10);
// { a: 10, b: 20 }
```
