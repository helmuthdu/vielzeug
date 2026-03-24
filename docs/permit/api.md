---
title: Permit — API Reference
description: API reference for @vielzeug/permit factory, permit instance, constants, and types.
---

# Permit API Reference

[[toc]]

## API At a Glance

| Symbol            | Purpose                                         | Execution mode | Common gotcha                                               |
| ----------------- | ----------------------------------------------- | -------------- | ----------------------------------------------------------- |
| `createPermit()`  | Create role/permission policy engine            | Sync           | Define wildcard rules carefully to avoid over-permissioning |
| `permit.define()` | Register role capability rules                  | Sync           | Last-write wins can override earlier policy unintentionally |
| `permit.check()`  | Evaluate permissions for a user/action/resource | Sync           | Normalize anonymous user handling consistently              |

## Package Entry Point

| Import             | Purpose                                                     |
| ------------------ | ----------------------------------------------------------- |
| `@vielzeug/permit` | Factory, runtime constants/helpers, and full exported types |

## createPermit

Signature:

`createPermit<TUser extends BaseUser = BaseUser, TAction extends string = string, TData extends PermissionData = PermissionData>(opts?: PermitOptions<TUser, TAction, TData>): Permit<TUser, TAction, TData>`

Options:

| Option             | Type                                              | Description                                                             |
| ------------------ | ------------------------------------------------- | ----------------------------------------------------------------------- |
| `initial`          | `PermitState<TUser, TAction, TData>`              | Seed permissions and hierarchy at creation                              |
| `logger`           | `(result, user, resource, action, data?) => void` | Audit callback on every `check`                                         |
| `strict`           | `boolean`                                         | Throw on invalid config patterns (e.g. empty actions map)               |
| `wildcardFallback` | `boolean`                                         | Enable/disable wildcard-resource fallback when specific resource exists |

## Permit Interface

`Permit<TUser, TAction, TData>` members:

### Mutation

- `define(role, resource, actions)`
- `grant(role, resource, ...actions)`
- `deny(role, resource, ...actions)`
- `extend(childRole, parentRole)`
- `unextend(childRole, parentRole?)`
- `remove(role)`
- `remove(role, resource)`
- `remove(role, resource, action)`
- `restore(state)`
- `clear()`

### Checks

- `check(user, resource, action, data?)`
- `checkAll(user, resource, actions[], data?)`
- `checkAny(user, resource, actions[], data?)`
- `for(user) => PermitGuard`

### State

- `snapshot() => PermitState`

Behavior highlights:

- `define()` merges role/resource actions.
- Action/resource/role strings are normalized (trim/lowercase).
- First role with explicit opinion (`true` or `false`) wins.
- Anonymous users cannot satisfy dynamic function checks.

## Constants

- `WILDCARD = '*'`
- `ANONYMOUS = 'anonymous'`

`WILDCARD` can be used as role, resource, or action key.

## Utilities

- `hasRole(user, role)`
- `isAnonymous(user)`

`hasRole` is case-insensitive and treats malformed users as anonymous.

## Types

### Core

- `BaseUser`
- `PermissionData`
- `PermissionCheck<TUser, TData>`
- `PermissionActions<TAction, TUser, TData>`

### Runtime Contracts

- `Permit<TUser, TAction, TData>`
- `PermitGuard<TAction, TData>`
- `PermitOptions<TUser, TAction, TData>`

### State Types

- `PermitSnapshot<TUser, TAction, TData>`
- `PermitState<TUser, TAction, TData>`

State notes:

- `snapshot()` includes permissions and hierarchy.
- Function permissions are preserved in-memory but not JSON-serializable.
