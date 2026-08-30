---
title: 'Ward Examples — Auditing Decisions'
description: 'Capture explained Ward decisions with tap() for audit pipelines.'
---

## Auditing Decisions

### Problem

Record authorization decisions for diagnostics or an audit pipeline without duplicating logging at every call site.

### Solution

Use `tap()` to observe decision events; route them to your audit store.

```ts
import { createWard } from '@vielzeug/ward';

const audit: string[] = [];

const ward = createWard([{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }]);

ward.tap((event) => {
  const who = event.principal === null ? 'anonymous' : event.principal.id;
  const outcome = event.decision.allowed ? 'allow' : event.decision.reason;
  audit.push(`${who}:${event.resource}:${event.action}:${outcome}`);
});

ward.explain({ principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts', action: 'read' });
ward.explain({ principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts', action: 'delete' });
```

### Pitfalls

- Treat tap events as an event stream; send durable audit records to your own storage layer.
- `trace()`, `allowedActions()`, and `rulesInScope()` are inspection APIs and do not fire decision events.

### Related

- [Trace a Decision](./trace-decision.md)
- [Conflict Detection](./conflict-detection.md)
- [Ward API Reference](../api.md)
