---
title: 'Arsenal Examples — mapKeys'
description: 'mapKeys example for @vielzeug/arsenal.'
---

## mapKeys

### Problem

You need to transform the keys of an object — for example converting snake_case API keys to camelCase for internal use.

### Solution

Use `mapKeys(obj, mapper)` to produce a new object with transformed keys and the same values.

```ts
import { mapKeys, camelCase } from '@vielzeug/arsenal';

const apiResponse = { first_name: 'Alice', last_name: 'Smith' };
mapKeys(apiResponse, camelCase);
// { firstName: 'Alice', lastName: 'Smith' }
```

### Pitfalls

- If the mapper produces duplicate keys, last write wins.
- Returns a shallow copy — values are not cloned.

### Related

- [mapValues](./mapValues.md)
- [invert](./invert.md)
