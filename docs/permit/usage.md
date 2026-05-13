---
title: Permit — Usage Guide
description: Build deterministic authorization policies with immutable rule sets, wildcard support, and runtime predicates.
---

# Permit Usage Guide

::: tip New to Permit?
Start with the [Overview](./index.md), then use this page for day-to-day patterns.
:::

[[toc]]

## Basic Setup

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit([
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'blocked', resource: 'posts', action: '*', effect: 'deny', priority: 100 },
]);
```

Rules are immutable after creation. To change rules, create a new permit instance.

## Define Rules at Creation Time

```ts
const permit = createPermit([
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'blocked', resource: 'posts', action: '*', effect: 'deny', priority: 100 },
]);
```

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
const bound = permit.forUser({ id: 'u1', roles: ['editor'] });

bound.can('posts', 'read');
bound.can('posts', 'update', { authorId: 'u1' });
```

`forUser()` returns a reusable bound permit object and snapshots roles/attributes at binding time.

## Check Multiple Actions

```ts
permit.canAll({ id: 'u1', roles: ['editor'] }, 'posts', ['read', 'update'], { authorId: 'u1' });
permit.canAny({ id: 'u1', roles: ['editor'] }, 'posts', ['update', 'delete'], { authorId: 'u1' });
```

Use `canAll()` when every action must pass, and `canAny()` when one passing action is enough.

## Batch Decisions with `checkAll`

```ts
const decisions = permit.checkAll(
  { id: 'u1', roles: ['editor'] },
  [
    { resource: 'posts', action: 'read' },
    { resource: 'posts', action: 'update', data: { authorId: 'u1' } },
  ],
);

const bound = permit.forUser({ id: 'u1', roles: ['editor'] });
const boundDecisions = bound.checkAll([
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'delete' },
]);
```

`checkAll()` returns one decision per input check in the same order.

## List Allowed Actions

```ts
const actions = permit.allowedActions({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' });
```

`allowedActions()` returns concrete actions that are currently allowed for the principal.
Wildcard actions are not enumerable and are skipped.

If your rules rely on wildcard actions, pass a known action set:

```ts
permit.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts', undefined, ['read', 'update', 'delete']);
```

Without `knownActions`, wildcard-only matches return an empty list.

## Inspect Rule Scope with `rulesFor`

```ts
const rules = permit.rulesFor({ id: 'u1', roles: ['editor'] }, 'posts');

const bound = permit.forUser({ id: 'u1', roles: ['editor'] });
const boundRules = bound.rulesFor('posts');
```

`rulesFor()` is introspection-only. It returns rules in scope for the principal/resource pair and never mutates the permit.

## Explain Denials and Winners

```ts
const decision = permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'delete');

if (!decision.allowed) {
  console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'
}
```

`explain()` returns a discriminated union that includes the winning rule for allow decisions and explicit deny decisions.

## Use Dynamic Conditions with `when`

```ts
const permit = createPermit<'update', { authorId: string }>([
  {
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: ({ principal, data }) => principal.id === data?.authorId,
  },
]);
```

`when` only runs for authenticated principals. For anonymous (`null`) checks, `when` rules do not match.

### Ownership Checks with `owns`

```ts
import { createPermit, owns } from '@vielzeug/permit';

const permit = createPermit<'update', { authorId: string }>([
  {
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: owns('authorId'),
  },
]);
```

`owns()` is a convenience helper for the common `principal.id === data[attributeKey]` pattern.

### Attribute-Based Conditions (ABAC)

```ts
const permit = createPermit<'publish'>([
  {
    role: 'editor',
    resource: 'posts',
    action: 'publish',
    effect: 'allow',
    when: ({ principal }) => principal.attributes?.tier === 'pro',
  },
]);
```

`principal.attributes` can store arbitrary user metadata for runtime policy checks.

## Anonymous and Wildcards

```ts
import { ANONYMOUS, WILDCARD } from '@vielzeug/permit';

const permit = createPermit([
  { role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' },
  { role: WILDCARD, resource: 'status', action: 'read', effect: 'allow' },
]);
```

Use `ANONYMOUS` for anonymous-only rules and `WILDCARD` for any role/resource/action.

## Logger and Auditing

```ts
const permit = createPermit(
  [{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }],
  {
    logger: ({ action, decision, principal, resource, rule }) => {
      const subject = principal === null ? 'anonymous' : principal.id;
      console.log(subject, resource, action, decision, rule?.effect);
    },
  },
);
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
const permit = createPermit([{ role: 'admin', resource: 'posts', action: 'read', effect: 'allow' }]);

permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read'); // true
permit.can({ id: 'u1', roles: ['ADMIN'] }, 'posts', 'read'); // false
```

Adopt one identifier convention (for example all lowercase) at your app boundary.

## Best Practices

- Keep roles and resources explicit and predictable.
- Use `priority` sparingly for explicit overrides.
- Keep `when` predicates pure and side-effect free.
- Prefer one permit instance per app boundary and keep rules centralized.
- Use `forUser({ ... })` for repeated checks in UI or request scopes.
