---
title: omit
---

## omit

Creates a new object without selected keys.

## Example

```ts
import { omit } from '@vielzeug/toolkit';

const user = { id: 1, name: 'Alice', role: 'admin', password: 'secret' };
const publicUser = omit(user, ['password']);

// { id: 1, name: 'Alice', role: 'admin' }
```

## Signature

```ts
function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  omittedKeys: readonly K[],
): Omit<T, K>;
```
