---
title: defaults
---

## defaults

Applies fallback values for undefined keys.

```ts
import { defaults } from '@vielzeug/arsenal';

defaults({ a: 1, b: undefined }, { b: 2, c: 3 } as any);
// { a: 1, b: 2, c: 3 }
```
