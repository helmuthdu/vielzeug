---
title: filterValues
---

## filterValues

Filters object properties by predicate.

```ts
import { filterValues } from '@vielzeug/arsenal';

filterValues({ a: 1, b: 2 }, (value) => value > 1); // { b: 2 }
```
