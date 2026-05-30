---
title: timeout
---

## timeout

Rejects when a promise exceeds a time limit.

```ts
import { timeout } from '@vielzeug/arsenal';

await timeout(
  fetch('/api').then((r) => r.json()),
  3000,
);
```
