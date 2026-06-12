---
title: 'Ward Examples — Logger for Auditing'
description: 'Logger for auditing example for @vielzeug/ward.'
---

## Logger for Auditing

### Problem

You need an audit trail of authorization decisions for observability or compliance. Each decision should record who made the request, what resource and action were requested, and which rule matched.

### Solution

Pass a `logger` callback to `createWard()`. It is called after every decision method (`can`, `canAll`, `canAny`, `checkAll`, `explain`, `trace`).

```ts
import { createWard } from '@vielzeug/ward';

const audit: string[] = [];

const ward = createWard([{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }], {
  logger: ({ action, decision, principal, resource, ...rest }) => {
    const identity = principal === null ? 'anonymous' : principal.id;
    // 'rule' is only present when decision is 'allow' or 'explicit-deny'
    const matched = 'rule' in rest ? `${rest.rule.role}:${rest.rule.effect}` : 'no-match';
    audit.push(`${identity}:${resource}:${action}:${decision}:${matched}`);
  },
});

ward.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read'); // logged: u1:posts:read:allow:viewer:allow
ward.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete'); // logged: u1:posts:delete:deny:no-match
```

### Pitfalls

- The logger is **not** called by `allowedActions()` or `rulesInScope()`. Use `checkAll()` if you need an auditable batch decision.
- `trace()` **does** fire the logger — switching from `explain` to `trace` for richer diagnostics will not silently drop audit records.
- Exceptions thrown inside the logger propagate to the caller. Keep the logger fast and non-throwing; catch errors inside it if the callback reaches an external service.
- `WardLoggerContext` is a discriminated union on `decision`. Use `'rule' in ctx` (or narrow on `ctx.decision`) before accessing `ctx.rule` to avoid TypeScript errors.

### Related

- [Blog Roles](./blog-roles.md)
- [Bound Guard in UI Layer](./bound-guard-in-ui-layer.md)
