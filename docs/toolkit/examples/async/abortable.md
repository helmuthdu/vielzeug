---
title: abortable
---

## abortable

Makes a promise abort-aware.

```ts
import { abortable } from '@vielzeug/toolkit';

const controller = new AbortController();
const value = abortable(fetch('/api').then((r) => r.json()), controller.signal);
controller.abort(new Error('cancelled'));
await value;
```
