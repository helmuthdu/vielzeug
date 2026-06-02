---
title: deepClone
---

## deepClone

Creates a deep clone of nested data.

```ts
import { deepClone } from '@vielzeug/arsenal';

const source = { a: [1, { b: 2 }] };
const copy = deepClone(source);
```
