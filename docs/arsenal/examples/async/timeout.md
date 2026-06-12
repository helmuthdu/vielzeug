---
title: 'Arsenal — timeout (not exported)'
description: 'timeout is not part of the Arsenal public API.'
---

# timeout

`timeout` is not exported by `@vielzeug/arsenal`.

Use `retry` with a `timeout` option to enforce per-attempt time limits with automatic signal management.

```ts
import { retry } from '@vielzeug/arsenal';

const data = await retry((signal) => fetch('/api/data', { signal }).then((r) => r.json()), {
  times: 1,
  timeout: 3_000,
});
```

- [retry](./retry.md)
- [abortable](./abortable.md)
