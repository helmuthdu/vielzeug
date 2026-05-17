---
title: pick
---

## pick

Creates a new object with only selected keys.

## Example

```ts
import { pick } from '@vielzeug/toolkit';

const user = { id: 1, name: 'Alice', role: 'admin', password: 'secret' };
const safeUser = pick(user, ['id', 'name', 'role']);

// { id: 1, name: 'Alice', role: 'admin' }
```

## Signature

```ts
function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, selectedKeys: readonly K[]): Pick<T, K>;
```
