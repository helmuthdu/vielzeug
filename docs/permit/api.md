# Permit API Reference

This document describes the public API of the `@vielzeug/permit` package.

## Permit Methods

- `Permit.register(role, resource, actions)` – Register permissions for a role/resource
- `Permit.check(user, resource, action, data?)` – Check if a user can perform an action
- `Permit.clear()` – Clear all registered permissions
- `Permit.roles` – Get all registered roles and permissions

## Types

- `BaseUser`: `{ id: string; roles: string[] }`
- `PermissionAction`: `'view' | 'create' | 'update' | 'delete'`
- `PermissionCheck`: `boolean | (user, data) => boolean`
- `ResourcePermissions`: `Map<string, Partial<Record<PermissionAction, PermissionCheck>>>`
- `RolesWithPermissions`: `Map<string, ResourcePermissions>`

See source for full type details and generics support.
