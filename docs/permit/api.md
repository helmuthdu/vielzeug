---
title: Permit — API Reference
description: API reference for the minimal permit authorization engine.
---

[[toc]]

## Package Entry Point

| Import               | Purpose                |
| -------------------- | ---------------------- |
| `@vielzeug/permit`   | Main exports and types |

## API At a Glance

| Symbol                                                             | Purpose                                                  |
| ------------------------------------------------------------------ | -------------------------------------------------------- |
| `createPermit(rules, options?)`                                    | Create an immutable permit instance                      |
| `permit.can(principal, resource, action, data?)`                   | Evaluate one decision                                    |
| `permit.canAll(principal, resource, actions, data?)`               | Require all actions to be allowed                        |
| `permit.canAny(principal, resource, actions, data?)`               | Require at least one allowed action                      |
| `permit.checkAll(principal, checks)`                               | Evaluate multiple decisions in one call                  |
| `permit.allowedActions(principal, resource, data?, knownActions?)` | List allowed concrete actions                            |
| `permit.explain(principal, resource, action, data?)`               | Return decision with deny reason                         |
| `permit.rulesInScope(principal, resource, data?)`                  | List rules in scope for principal/resource introspection |
| `permit.forUser(principal)`                                        | Create a principal-bound permit view                     |
| `owns(attributeKey)`                                               | Create an ownership predicate                            |

## Constants

- `WILDCARD = '*'`
- `ANONYMOUS = 'anonymous'`

`WILDCARD` can be used as role, resource, or action.

## createPermit

Signature:

`createPermit<TAction extends string = string, TData = unknown>(rules?: readonly PermitRule<TAction, TData>[], options?: PermitOptions<TAction, TData>): Permit<TAction, TData>`

Creates an immutable permit instance with the given rules. All rules are evaluated once at creation time.

```ts
const permit = createPermit([
  { role: 'editor', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow' },
]);
```

### Options

- `logger: (context) => void`: audit callback for decision methods like `can`, `canAll`, `canAny`, `checkAll`, and `explain`.

## Permit Interface

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

### `checkAll(principal, checks)`

Returns one `PermitDecision` per check, preserving input order.

```ts
const decisions = permit.checkAll({ id: 'u1', roles: ['editor'] }, [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'update', data: { authorId: 'u1' } },
]);
```

### `allowedActions(principal, resource, data?, knownActions?)`

Returns concrete actions currently allowed for a principal/resource pair.
Without `knownActions`, wildcard actions are not enumerable, so wildcard entries are skipped.
If `knownActions` is provided, Permit evaluates those actions explicitly and includes wildcard-covered results.

Important: if only wildcard action rules match, `allowedActions(...)` returns `[]` unless you pass `knownActions`.

```ts
const actions = permit.allowedActions({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' });
const actionsWithKnownSet = permit.allowedActions({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' }, [
  'read',
  'update',
  'delete',
]);
```

### `explain(principal, resource, action, data?)`

Returns an explicit decision object.

```ts
const decision = permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'delete');

if (!decision.allowed) {
  console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'
}
```

### `forUser(principal)`

Creates a bound permit view scoped to a principal. The principal is snapshotted at binding time.

```ts
const bound = permit.forUser({ id: 'u1', roles: ['editor'] });

bound.can('posts', 'read');
bound.canAll('posts', ['read', 'update'], { authorId: 'u1' });
bound.checkAll([
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'delete' },
]);
bound.allowedActions('posts', { authorId: 'u1' });
bound.explain('posts', 'delete');
bound.rulesInScope('posts');
```

The bound view exposes the same decision methods as the main permit but scoped to the given principal.

### `rulesInScope(principal, resource, data?)`

Returns the rules in scope for a principal/resource pair. This is introspection only and does not mutate internal rules.

Without `data`, `rulesInScope` matches by principal + resource scope only. If you pass `data`, Permit also filters predicate rules by whether they match that runtime payload.

```ts
const rules = permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts');
const narrowed = permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' });
```

### `owns(attributeKey)`

Creates a predicate that compares `principal.id` to `data[attributeKey]`.

```ts
import { createPermit, owns } from '@vielzeug/permit';

const permit = createPermit([
  {
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: owns('authorId'),
  },
]);
```

## Logger Context

When a logger is provided, Permit calls it with:

- `action`
- `data`
- `decision` ('allow' | 'deny')
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

- `PermitRule<TAction, TData>`
- `RuleContext<TData>`
- `PermitPredicate<TData>`
- `Principal`
- `UserPrincipal`
- `PermitDecision<TAction, TData>`
- `PermitCheck<TAction, TData>`
- `Permit<TAction, TData>`
- `PermitOptions<TAction, TData>`
