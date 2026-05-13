---
title: 'Permit Examples — Logger for Auditing'
description: 'Capture authorization decisions for observability and audit workflows.'
---

## Logger for Auditing

```ts
import { createPermit } from '@vielzeug/permit';

const audit: string[] = [];

const permit = createPermit(
  [{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }],
  {
    logger: ({ action, decision, principal, resource, rule }) => {
      const identity = principal === null ? 'anonymous' : principal.id;
      const matched = rule ? `${rule.role}:${rule.effect}` : 'no-match';
      audit.push(`${identity}:${resource}:${action}:${decision}:${matched}`);
    },
  },
);

permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');
permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete');
```
