---
title: Scout 2.0 Migration
---

# Scout 2.0 Migration

Scout 2.0 replaces `toSearchFn` with `toSearchMatcher`.

```ts
import { toSearchMatcher } from '@vielzeug/scout';

const match = toSearchMatcher(index);
```

Update every `toSearchFn` import and call site, then recheck callback types inferred from the returned matcher.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current index, search, highlight, and reactive search contracts.
