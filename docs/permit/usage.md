---
title: Permit — Usage Guide
description: Build deterministic authorization policies with set/can and predicate IDs.
---

[[toc]]

## Basic Setup

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();
```

## Define Policy with `set`

```ts
permit
  .set({ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' })
  .set({ role: 'blocked', resource: 'posts', action: '*', effect: 'deny', priority: 100 });
```

Rules are normalized (`trim + lowercase`) for role/resource/action.

## Dynamic Conditions via Predicate IDs

```ts
const permit = createPermit<'update', { authorId: string }>({
  predicates: {
    isOwner: ({ principal, data }) => principal.id === data?.authorId,
  },
});

permit.set({
  role: 'editor',
  resource: 'posts',
  action: 'update',
  effect: 'allow',
  when: 'isOwner',
});
```

Use predicate names instead of embedding functions in policy state.

## Anonymous and Wildcards

```ts
import { ANONYMOUS, WILDCARD } from '@vielzeug/permit';

permit
  .set({ role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' })
  .set({ role: WILDCARD, resource: 'status', action: 'read', effect: 'allow' });
```

`null` / `undefined` principal is treated as anonymous.

## Evaluate Permissions

```ts
const principal = { id: 'u1', roles: ['editor'] };

permit.can(principal, 'posts', 'read');
permit.can(principal, 'posts', 'update', { authorId: 'u1' });
```

Permit throws for malformed principal payloads (for example missing `roles`).

## Use Bound Guards

```ts
const guard = permit.withUser({ id: 'u1', roles: ['editor'] });

guard.can('posts', 'read');
```

## Save and Restore Policy

```ts
const snapshot = permit.exportPolicy();
permit.clear();
permit.importPolicy(snapshot);
```

Policy payloads are JSON-serializable.

## Decision Precedence

Permit uses one deterministic model:

1. Highest `priority` wins.
2. For equal priority, more specific rules win.
3. If still tied, any deny wins.
4. No match means deny.

This avoids role-order dependent authorization outcomes.
