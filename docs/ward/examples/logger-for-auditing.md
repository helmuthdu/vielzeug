---
title: 'Ward Examples — Logger for Auditing'
description: 'Logger for auditing example for @vielzeug/ward.'
---

## Logger for Auditing

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
