---
title: 'Arsenal Examples — defaults'
description: 'defaults example for @vielzeug/arsenal.'
---

## defaults

### Problem

You have a config object with some optional fields and need to fill in missing values from a set of fallbacks without overwriting explicitly-set values.

### Solution

Use `defaults(target, ...sources)` to apply source values only where the target key is `undefined`.

```ts
import { defaults } from '@vielzeug/arsenal';

const config = { host: 'localhost', port: undefined, secure: undefined };
const result = defaults(config, { port: 3000, secure: false, retries: 3 });
// { host: 'localhost', port: 3000, secure: false, retries: 3 }
```

### Pitfalls

- Only fills in `undefined` values — `null` and `false` are left unchanged.
- Does not deep-merge nested objects; use `deepMerge` for recursive defaults.

### Related

- [deepMerge](./merge.md)
- [pick](./pick.md)
