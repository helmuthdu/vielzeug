---
title: Permit — API Reference
description: API reference for the minimal permit authorization engine.
---

# Permit API Reference

[[toc]]

## At a Glance

| Symbol | Purpose |
| --- | --- |
| `createPermit(options?)` | Create a permit instance |
| `permit.set(rule | rules)` | Append one or more rules |
| `permit.can(principal, resource, action, data?)` | Evaluate one decision |
| `permit.canAll(principal, resource, actions, data?)` | Require all actions to be allowed |
| `permit.canAny(principal, resource, actions, data?)` | Require at least one allowed action |
| `permit.allowedActions(principal, resource, data?)` | List allowed concrete actions |
| `permit.explain(principal, resource, action, data?)` | Return decision with deny reason |
| `permit.forUser(principal, cache?)` | Create a principal-bound permit object |
| `permit.rules()` | Read current rules snapshot |
| `permit.replace(rules)` | Replace all rules |
| `permit.clear()` | Remove all rules |
| `owns(attributeKey)` | Create an ownership predicate |

## Constants

- `WILDCARD = '*'`
- `ANONYMOUS = 'anonymous'`

`WILDCARD` can be used as role, resource, or action.

## createPermit

Signature:

`createPermit<TAction extends string = string, TData extends PermissionData = PermissionData>(options?: PermitOptions<TAction, TData>): Permit<TAction, TData>`

### Options

- `initial: readonly PermitRule<TAction, TData>[]`: initial rules to preload.
- `logger: (context) => void`: audit callback after each `can` check.

## Permit Interface

### `set(rule | rules)`

Add one rule or multiple rules to the policy.

```ts
permit.set({
  role: 'editor',
  resource: 'posts',
  action: 'read',
  effect: 'allow',
  priority: 10,
});

permit.set([
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow' },
]);
```

Rule fields:

- `role: string`
- `resource: string`
- `action: TAction | '*'`
- `effect: 'allow' | 'deny'`
- `priority?: number` (default `0`)
- `when?: ({ principal, data }) => boolean`

### `can(principal, resource, action, data?)`

Evaluate a decision for one action.

```ts
permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read');
```

Accepted principal inputs:

- `null` for anonymous
- `{ id, roles }` for authenticated users

Invalid principal payloads throw.

### `canAll(principal, resource, actions, data?)`

Returns `true` only if all actions are allowed.

```ts
permit.canAll({ id: 'u1', roles: ['editor'] }, 'posts', ['read', 'update'], { authorId: 'u1' });
```

### `canAny(principal, resource, actions, data?)`

Returns `true` if at least one action is allowed.

```ts
permit.canAny({ id: 'u1', roles: ['editor'] }, 'posts', ['update', 'delete'], { authorId: 'u1' });
```

### `allowedActions(principal, resource, data?)`

Returns concrete actions currently allowed for a principal/resource pair.
Wildcard actions are not enumerable, so wildcard entries are skipped.

```ts
const actions = permit.allowedActions({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' });
```

### `explain(principal, resource, action, data?)`

Returns an explicit decision object.

```ts
const decision = permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'delete');

if (!decision.allowed) {
  console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'
}
```

### `forUser(principal, cache?)`

Returns a principal-bound permit object.

```ts
const bound = permit.forUser({ id: 'u1', roles: ['editor'] }, true);

bound.can('posts', 'read');
bound.canAll('posts', ['read', 'update'], { authorId: 'u1' });
bound.allowedActions('posts', { authorId: 'u1' });
bound.explain('posts', 'delete');
```

`cache = true` enables per-user decision caching by `(resource, action, serialized-data)`.

### `owns(attributeKey)`

Creates a predicate that compares `principal.id` to `data[attributeKey]`.

```ts
import { owns } from '@vielzeug/permit';

permit.set({
  role: 'editor',
  resource: 'posts',
  action: 'update',
  effect: 'allow',
  when: owns('authorId'),
});
```

### `rules()` / `replace(rules)`

Read or replace the current rules.

```ts
const rules = permit.rules();
permit.replace(rules);
```

### `clear()`

Remove all rules.

## Logger Context

When a logger is provided, Permit calls it with:

- `action`
- `data`
- `decision`
- `principal`
- `resource`
- `rule` (the winning rule, if any)

## Decision Model

1. If no rule matches, result is deny.
2. Higher `priority` wins.
3. For equal priority, more specific rules win over wildcard rules.
4. If top-precedence rules conflict, deny overrides allow.

This model is deterministic and independent of principal role ordering.

## Types

- `PermissionData`
- `PermitEffect`
- `PermitRule<TAction, TData>`
- `PermitPredicate<TData>`
- `Principal`
- `UserPrincipal`
- `PermitDecision<TAction, TData>`
- `BoundPermit<TAction, TData>`
- `Permit<TAction, TData>`
- `PermitOptions<TAction, TData>`
