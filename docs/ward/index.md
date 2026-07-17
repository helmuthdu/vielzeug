---
title: Ward — Deterministic authorization for TypeScript
description: Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.
package: ward
category: auth
---

`@vielzeug/ward` is a zero-dependency authorization engine for role/resource/action policies.

## Quick Start

```ts
import { ANONYMOUS, WILDCARD, allow, createWard, deny, owns } from '@vielzeug/ward';

const ward = createWard<'read' | 'update' | 'delete', { authorId: string }>([
  ...allow([ANONYMOUS, 'viewer'], 'posts', ['read']),
  ...allow('editor', 'posts', ['update'], { when: owns('authorId') }),
  ...deny('blocked', WILDCARD, [WILDCARD], { priority: 100 }),
]);

const principal = { id: 'u1', roles: ['editor'] };

const decision = ward.explain({
  principal,
  resource: 'posts',
  action: 'update',
  data: { authorId: 'u2' },
});
```

`explain()` returns a discriminated decision (`allowed: true | false`) and optional matching `rule`.

## Bound View

Use `forUser()` when checking many permissions for the same principal:

```ts
const bound = ward.forUser({ id: 'u1', roles: ['editor'] });

bound.explain({ resource: 'posts', action: 'read' });
bound.allowedActions({ resource: 'posts', knownActions: ['read', 'update', 'delete'] as const });
```

## Middleware Guards

```ts
import { guardRequest, guardRequestWith } from '@vielzeug/ward';

const direct = guardRequest({
  ward,
  principal,
  resource: 'posts',
  action: 'read',
});

const extracted = await guardRequestWith({
  ward,
  req,
  extractPrincipal: async (request) => request.user ?? null,
  resource: 'posts',
  action: 'read',
});
```

See the [usage guide](./usage.md), [API reference](./api.md), and [examples](./examples/blog-roles.md).
