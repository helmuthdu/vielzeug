---
title: deepMerge / shallowMerge
description: Deep and shallow object merge examples for Arsenal.
---

Arsenal provides two merge helpers:

- `deepMerge(...items)`: recursively merges nested objects and concatenates arrays.
- `shallowMerge(...items)`: `Object.assign`-style top-level merge.

## Source Code

::: details View Source Code
<<< @/../packages/arsenal/src/object/merge.ts
:::

## Examples

### Deep Merge

```ts
import { deepMerge } from '@vielzeug/arsenal';

const base = {
  api: { host: 'localhost', port: 8080 },
  features: ['auth'],
};

const override = {
  api: { port: 3000 },
  features: ['metrics'],
};

const merged = deepMerge(base, override);
// {
//   api: { host: 'localhost', port: 3000 },
//   features: ['auth', 'metrics']
// }
```

### Shallow Merge

```ts
import { shallowMerge } from '@vielzeug/arsenal';

const base = {
  api: { host: 'localhost', port: 8080 },
  timeout: 1000,
};

const override = {
  api: { port: 3000 },
};

const merged = shallowMerge(base, override);
// {
//   api: { port: 3000 },
//   timeout: 1000
// }
```

## See Also

- [diff](./diff.md): Compare object states.
- [defaults](./defaults.md): Fill missing values.
- [path/get](./path.md): Read merged nested values safely.
