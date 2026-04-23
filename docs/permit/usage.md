---
title: Permit — Usage Guide
description: Build deterministic authorization policies with set/can, wildcards, and runtime predicates.
---

# Permit Usage Guide

::: tip New to Permit?
Start with the [Overview](./index.md), then use this page for day-to-day patterns.
:::

[[toc]]

## Basic Setup

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();
```

## Define Rules with `set`

```ts
permit
  .set({ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' })
  .set({ role: 'blocked', resource: 'posts', action: '*', effect: 'deny', priority: 100 });
```

Each `set()` call appends a rule. Rules are evaluated by precedence, not insertion order.

## Check Permissions

```ts
const principal = { id: 'u1', roles: ['editor'] };

permit.can(principal, 'posts', 'read');
permit.can(principal, 'posts', 'delete');
permit.can(null, 'posts', 'read');
```

`principal` must be either:

- `null` for anonymous users
- `{ id: string, roles: readonly string[] }` for authenticated users

Malformed principal values throw errors.

## Bind a User with `forUser`

```ts
const can = permit.forUser({ id: 'u1', roles: ['editor'] });

can('posts', 'read');
can('posts', 'update', { authorId: 'u1' });
```

`forUser()` returns a reusable function and snapshots the roles at binding time.

## Use Dynamic Conditions with `when`

```ts
const permit = createPermit<'update', { authorId: string }>();

permit.set({
  role: 'editor',
  resource: 'posts',
  action: 'update',
  effect: 'allow',
  when: ({ principal, data }) => principal.id === data?.authorId,
});
```

`when` only runs for authenticated principals. For anonymous (`null`) checks, `when` rules do not match.

## Anonymous and Wildcards

```ts
import { ANONYMOUS, WILDCARD } from '@vielzeug/permit';

permit
  .set({ role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' })
  .set({ role: WILDCARD, resource: 'status', action: 'read', effect: 'allow' });
```

Use `ANONYMOUS` for anonymous-only rules and `WILDCARD` for any role/resource/action.

## Manage Rule Sets

```ts
const snapshot = permit.rules();

permit.clear();
permit.replace(snapshot);
```

`rules()` returns a copy, so mutating the returned array does not affect the internal state.

## Logger and Auditing

```ts
const permit = createPermit({
  logger: ({ action, decision, principal, resource, rule }) => {
    const subject = principal === null ? 'anonymous' : principal.id;
    console.log(subject, resource, action, decision, rule?.effect);
  },
});
```

The logger runs after each `can()` check and includes the winning rule when one exists.

## Decision Precedence

Permit uses one deterministic model:

1. If no rule matches, decision is deny.
2. Higher `priority` wins.
3. For equal `priority`, higher specificity wins (non-wildcards are more specific).
4. For equal `priority` and specificity, deny overrides allow.

## Exact Matching

Permit uses exact string matching for role/resource/action.

```ts
permit.set({ role: 'admin', resource: 'posts', action: 'read', effect: 'allow' });

permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read'); // true
permit.can({ id: 'u1', roles: ['ADMIN'] }, 'posts', 'read'); // false
```

Adopt one identifier convention (for example all lowercase) at your app boundary.

## Best Practices

- Keep roles and resources explicit and predictable.
- Use `priority` sparingly for explicit overrides.
- Keep `when` predicates pure and side-effect free.
- Prefer one permit instance per app boundary and keep rules centralized.
- Use `forUser()` for repeated checks in UI or request scopes.
