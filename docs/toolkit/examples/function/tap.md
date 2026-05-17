---
title: tap
---

## tap

Runs a side effect and returns original value.

```ts
import { tap } from '@vielzeug/toolkit';

const value = tap(42, (n) => console.log('debug', n));
// value === 42
```
