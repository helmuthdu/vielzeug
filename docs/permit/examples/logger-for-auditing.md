---
title: 'Permit Examples — Logger for Auditing'
description: 'Logger for auditing example for @vielzeug/permit.'
---

## Logger for Auditing

### Problem

You need an audit trail of authorization decisions for observability or compliance. Each decision should record who made the request, what resource and action were requested, and which rule matched.

### Solution

Pass a `logger` callback to `createPermit()`. It is called after every decision method (`can`, `canAll`, `canAny`, `checkAll`, `explain`).

```ts
import { createPermit } from '@vielzeug/permit';

const audit: string[] = [];

const permit = createPermit(
  [{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }],
  {
    logger: ({ action, decision, principal, resource, rule }) => {
      const identity = principal === null ? 'anonymous' : principal.id;
      // rule is undefined when no rule matched (explicit deny by default)
      const matched  = rule ? `${rule.role}:${rule.effect}` : 'no-match';
      audit.push(`${identity}:${resource}:${action}:${decision}:${matched}`);
    },
  },
);

permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');   // logged: u1:posts:read:allow:viewer:allow
permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete'); // logged: u1:posts:delete:deny:no-match
```

### Pitfalls

- The logger is **not** called by `allowedActions()` or `rulesInScope()`. Use `checkAll()` if you need an auditable batch decision.
- Exceptions thrown inside the logger propagate to the caller. Keep the logger fast and non-throwing; catch errors inside it if the callback reaches an external service.
- The `rule` in the logger context is a copy of the winning rule. Mutating it has no effect on the permit's internal state.

### Related

- [Blog Roles](./blog-roles.md)
- [Bound Guard in UI Layer](./bound-guard-in-ui-layer.md)
