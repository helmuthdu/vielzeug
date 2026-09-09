---
title: 'Ward Examples — Auditing Decisions'
description: 'Observe Ward decisions without changing authorization behavior.'
---

## Auditing Decisions

### Problem

Authorization decisions need application-owned audit records.

### Solution

Subscribe to typed decision events at the application boundary.

```ts
import { createLogger } from '@vielzeug/rune';
import { allow, createWard } from '@vielzeug/ward';

const log = createLogger({ namespace: 'authorization' });
const ward = createWard([allow('editor', 'posts', ['update'])]);

const stop = ward.tap((event) => {
  log.info(event, `ward:${event.decision.effect}`);
});

ward.decide({
  action: 'update',
  principal: { id: 'u1', roles: ['editor'] },
  resource: 'posts',
});

stop();
```

### Pitfalls

- Handler failures are swallowed so observation cannot alter authorization.
- The application owns transport, retention, and sensitive-data policy.
- `allowedActions()` does not emit events because its checks are hypothetical.

### Related

- [Explain a decision](./trace-decision.md)
- [Bound UI permissions](./bound-guard-in-ui-layer.md)
