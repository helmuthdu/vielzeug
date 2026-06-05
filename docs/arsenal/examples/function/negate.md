---
title: 'Arsenal — negate (not exported, use not)'
description: 'negate is not exported. The correct export is not().'
---

# negate

`negate` is not exported by `@vielzeug/arsenal`. Use [`not`](./not.md) instead.

```ts
import { not } from '@vielzeug/arsenal';

const isInactive = not((user: User) => user.active);
```
