---
title: Permit — API Reference
description: API reference for the minimal permit policy engine.
---

[[toc]]

## Package Entry

- `@vielzeug/permit`: factory, constants, policy and permit types

## Constants

- `WILDCARD = '*'`
- `ANONYMOUS = 'anonymous'`

`WILDCARD` can be used as role, resource, or action.

## createPermit

Signature:

`createPermit<TAction extends string = string, TData extends PermissionData = PermissionData>(options?: PermitOptions<TAction, TData>): Permit<TAction, TData>`

### Options

- `initial: PermitPolicy<TAction>`: initial policy rules to preload.
- `predicates: Record<string, PermitPredicate<TData>>`: predicate registry used by `rule.when`.
- `logger: (result, principal, resource, action, data?) => void`: audit callback after each `can` check.

## Permit Interface

### `set(rule)`

Add one rule to the policy.

```ts
permit.set({
  role: 'editor',
  resource: 'posts',
  action: 'read',
  effect: 'allow',
  priority: 10,
});
```

Rule fields:

- `role: string`
- `resource: string`
- `action: TAction | '*'`
- `effect: 'allow' | 'deny'`
- `priority?: number` (default `0`)
- `when?: string` (predicate id from `options.predicates`)

### `can(principal, resource, action, data?)`

Evaluate a decision for one action.

```ts
permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read');
```

Accepted principal inputs:

- `null` / `undefined` (anonymous)
- `{ kind: 'anonymous' }`
- `{ kind: 'user', id, roles }`
- `{ id, roles }`

Invalid principal payloads throw.

### `withUser(principal)`

Returns a user-bound guard.

```ts
const guard = permit.withUser({ id: 'u1', roles: ['editor'] });
guard.can('posts', 'read');
```

### `exportPolicy()` / `importPolicy(policy)`

Export and restore JSON-serializable policy state.

```ts
const policy = permit.exportPolicy();
permit.clear();
permit.importPolicy(policy);
```

### `clear()`

Remove all rules.

## Decision Model

1. If no rule matches, result is deny.
2. Higher `priority` wins.
3. For equal priority, more specific rules win over wildcard rules.
4. If top-precedence rules conflict, deny overrides allow.

This model is deterministic and independent of principal role ordering.

## Types

- `PermissionData`
- `PermitEffect`
- `PermitRule<TAction>`
- `PermitPolicy<TAction>`
- `PermitPredicate<TData>`
- `PermitPrincipal`
- `PrincipalInput`
- `Permit<TAction, TData>`
- `PermitGuard<TAction, TData>`
- `PermitOptions<TAction, TData>`
