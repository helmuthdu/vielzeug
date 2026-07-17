# @vielzeug/ward

Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.

## Installation

```sh
pnpm add @vielzeug/ward
```

## Quick Start

```ts
import { ANONYMOUS, WILDCARD, allow, createWard, deny, owns } from '@vielzeug/ward';

const ward = createWard<'read' | 'update', { authorId: string }>([
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

const batch = ward.checkAll(principal, [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'update', data: { authorId: 'u1' } },
]);

const trace = ward.trace({
  principal,
  resource: 'posts',
  action: 'update',
  data: { authorId: 'u2' },
});

const bound = ward.forUser(principal);
bound.allowedActions({ resource: 'posts', knownActions: ['read', 'update', 'delete'] as const });
bound.explain({ resource: 'posts', action: 'update', data: { authorId: 'u2' } });
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

const withExtractor = await guardRequestWith({
  ward,
  req,
  extractPrincipal: async (request) => request.user ?? null,
  resource: 'posts',
  action: 'read',
});
```

## API Notes

1. `explain()` and `trace()` take object inputs: `{ principal, resource, action, data? }`.
2. `allowedActions()` takes `{ principal, resource, knownActions, data? }`.
3. `rulesInScope()` takes `{ principal, resource, data? }`.
4. `BoundWard` methods use object inputs without `principal`.
5. `trace()` does not call the logger; `explain()` and `checkAll()` do.
