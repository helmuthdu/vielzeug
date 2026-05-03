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
| `permit.forUser(principal)` | Create a principal-bound check function |
| `permit.rules()` | Read current rules snapshot |
| `permit.replace(rules)` | Replace all rules |
| `permit.clear()` | Remove all rules |

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

### `forUser(principal)`

Returns a user-bound permission function.

```ts
const can = permit.forUser({ id: 'u1', roles: ['editor'] });
can('posts', 'read');
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
- `Permit<TAction, TData>`
- `PermitOptions<TAction, TData>`
