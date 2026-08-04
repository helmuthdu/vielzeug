---
title: 'Ward Examples — Logger for Auditing'
description: 'Capture explained Ward decisions with a policy logger.'
---

## Logger for Auditing

### Problem

Record authorization decisions for diagnostics or an audit pipeline without duplicating logging at every call site.

### Solution

Provide a `logger` in `WardOptions`; Ward invokes it for explained decisions.

```ts
import { createWard } from '@vielzeug/ward';

const audit: string[] = [];

const ward = createWard([{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }], {
  logger: (ctx) => {
    const who = ctx.principal === null ? 'anonymous' : ctx.principal.id;
    const outcome = ctx.allowed ? 'allow' : ctx.reason;
    audit.push(`${who}:${ctx.resource}:${ctx.action}:${outcome}`);
  },
});

ward.explain({ principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts', action: 'read' });
ward.explain({ principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts', action: 'delete' });
```

### Pitfalls

- Treat logger output as an event stream; send durable audit records to your own storage layer.
- `trace()`, `allowedActions()`, and `rulesInScope()` are inspection APIs and do not invoke the logger.

### Related

- [Trace a Decision](./trace-decision.md)
- [Conflict Detection](./conflict-detection.md)
- [Ward API Reference](../api.md)
