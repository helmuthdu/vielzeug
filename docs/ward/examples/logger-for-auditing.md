---
title: 'Ward Examples — Logger for Auditing'
description: 'Logger for auditing example for @vielzeug/ward.'
---

## Logger for Auditing

### Problem

You need an audit trail of authorization decisions for observability or compliance. Each decision should record who made the request, what resource and action were requested, and which rule matched.

### Solution

Pass a `logger` callback to `createWard()`. It is called after every `explain()` and `checkAll()` call (including through a `BoundWard`).

```ts
import { createWard } from '@vielzeug/ward';

const audit: string[] = [];

const ward = createWard([{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }], {
  logger: (ctx) => {
    const identity = ctx.principal === null ? 'anonymous' : ctx.principal.id;
    const outcome = ctx.allowed ? 'allow' : ctx.reason;
    // 'rule' is only present when allowed is true or reason is 'explicit-deny'
    const matched = 'rule' in ctx ? `${ctx.rule.role}:${ctx.rule.effect}` : 'no-match';
    audit.push(`${identity}:${ctx.resource}:${ctx.action}:${outcome}:${matched}`);
  },
});

ward.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read'); // logged: u1:posts:read:allow:viewer:allow
ward.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete'); // logged: u1:posts:delete:no-matching-rule:no-match
```

### Pitfalls

- The logger is **not** called by `allowedActions()`, `rulesInScope()`, or `detectConflicts()`. Use `checkAll()` if you need an auditable batch decision.
- `trace()` does **not** fire the logger, by design — it is a side-channel-free inspection tool. Switching from `explain()` to `trace()` for richer diagnostics silently drops audit records; keep calling `explain()` (or log inside the `trace()` call site) if you need both.
- Exceptions thrown inside the logger propagate to the caller. Keep the logger fast and non-throwing; catch errors inside it if the callback reaches an external service.
- `WardLoggerContext` is structurally a `WardDecision` plus the request fields — narrow it with `ctx.allowed` / `ctx.reason` (or `'rule' in ctx`), not a `decision` field.

### Related

- [Blog Roles](./blog-roles.md)
- [Bound Guard in UI Layer](./bound-guard-in-ui-layer.md)
