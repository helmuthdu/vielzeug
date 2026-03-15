# @vielzeug/permit

> Lightweight, type-safe role-based access control (RBAC) with role inheritance, dynamic permission functions, wildcard roles/resources/actions, and anonymous user support.

[![npm version](https://img.shields.io/npm/v/@vielzeug/permit)](https://www.npmjs.com/package/@vielzeug/permit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```sh
pnpm add @vielzeug/permit
# npm install @vielzeug/permit
# yarn add @vielzeug/permit
```

## Quick Start

```ts
import { createPermit, hasRole, WILDCARD, ANONYMOUS } from '@vielzeug/permit';

const permit = createPermit();

// Setup — role hierarchy + permissions
permit
  .grant('viewer', WILDCARD, 'read')
  .extend('editor', 'viewer') // editor inherits viewer
  .define('editor', 'posts', { write: (u, d) => u.id === d?.authorId })
  .extend('admin', 'editor') // admin inherits editor
  .grant('admin', WILDCARD, 'delete')
  .grant(ANONYMOUS, 'posts', 'read'); // public read

const user = { id: 'u1', roles: ['editor'] };

// Direct checks
permit.check(user, 'posts', 'read'); // true  (inherited from viewer)
permit.check(user, 'posts', 'write', { authorId: 'u1' }); // true  (dynamic rule)
permit.check(user, 'posts', 'delete'); // false

// Multi-action checks
permit.checkAll(user, 'posts', ['read', 'write'], { authorId: 'u1' }); // true
permit.checkAny(user, 'posts', ['write', 'delete']); // true

// Pre-bound guard for the same user
const guard = permit.for(user);
guard.can('posts', 'read'); // true
guard.canAll('posts', ['read', 'write'], { authorId: 'u1' }); // true
guard.canAny('posts', ['write', 'delete']); // true
guard.can('posts', 'delete'); // false

// Standalone utilities
hasRole(user, 'editor'); // true
```

## Features

- **Role-based rules** — define permissions per role + resource with any string action
- **Role inheritance** — `extend(child, parent)` with multi-level BFS resolution
- **`grant` / `deny` shorthands** — boolean shortcuts without writing `{ action: true/false }` objects
- **Dynamic permissions** — `(user, data) => boolean` for context-aware rules
- **Wildcard role / resource / action** — `'*'` applies to all users, resources, or any action
- **Partial wildcard override** — specific resources override individual wildcard actions, inheriting the rest
- **First-match-wins** — explicit `false` on an earlier role stops the chain
- **Anonymous users** — automatic `anonymous` role for null/unauthenticated users
- **`checkAll` / `checkAny`** — multi-action checks directly on the instance
- **Pre-bound guards** — `permit.for(user)` returns a `PermitGuard` with `can`, `canAny`, `canAll`
- **Fluent API** — all write methods return the permit instance for chaining
- **Snapshot / restore** — export and re-import permissions **and** hierarchy as a plain object
- **TypeScript generics** — type user shape, action strings, and context data with `createPermit<User, Action, Data>()`
- **Strict mode** — `opts.strict: true` turns configuration mistakes into thrown errors
- **Zero dependencies**

## API Summary

### Factory

```ts
createPermit(opts?)                  // create a permit instance
createPermit<User>()                 // typed user
createPermit<User, Action>()         // typed user + action strings
createPermit<User, Action, Data>()   // typed user + actions + context data
```

| Option                  | Type                                              | Description                                                                                            |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `opts.initial`          | `PermitState`                                     | Seed permissions and hierarchy at creation time                                                        |
| `opts.logger`           | `(result, user, resource, action, data?) => void` | Called on every check                                                                                  |
| `opts.wildcardFallback` | `boolean`                                         | When `false`, disables wildcard-resource fallback for resources with explicit entries. Default: `true` |
| `opts.strict`           | `boolean`                                         | When `true`, configuration errors throw instead of silently continuing. Default: `false`               |

### Instance methods

| Method                                       | Returns       | Description                                               |
| -------------------------------------------- | ------------- | --------------------------------------------------------- |
| `define(role, resource, actions)`            | `Permit`      | Define permissions. Merges with existing.                 |
| `grant(role, resource, ...actions)`          | `Permit`      | Allow one or more actions.                                |
| `deny(role, resource, ...actions)`           | `Permit`      | Block one or more actions.                                |
| `extend(childRole, parentRole)`              | `Permit`      | Child role inherits all parent permissions.               |
| `unextend(childRole, parentRole?)`           | `Permit`      | Remove inherited parent. Omit `parentRole` to remove all. |
| `check(user, resource, action, data?)`       | `boolean`     | Check if user can perform the action.                     |
| `checkAll(user, resource, actions[], data?)` | `boolean`     | `true` only if every action passes.                       |
| `checkAny(user, resource, actions[], data?)` | `boolean`     | `true` if at least one action passes.                     |
| `for(user)`                                  | `PermitGuard` | Pre-bound guard with `can`, `canAny`, `canAll`.           |
| `remove(role, resource?, action?)`           | `Permit`      | Remove role / resource / action.                          |
| `snapshot()`                                 | `PermitState` | Deep copy of all permissions and hierarchy.               |
| `restore(state)`                             | `Permit`      | Replace full state from a `PermitState`.                  |
| `clear()`                                    | `Permit`      | Remove all permissions and hierarchy.                     |

### Standalone utilities

| Export                | Description                                               |
| --------------------- | --------------------------------------------------------- |
| `hasRole(user, role)` | `true` if user has the role (case-insensitive).           |
| `isAnonymous(user)`   | `true` if user is null, missing `id`, or missing `roles`. |
| `WILDCARD`            | `'*'` — matches all roles, resources, or actions.         |
| `ANONYMOUS`           | `'anonymous'` — auto-assigned to unauthenticated users.   |

## Documentation

Full docs at **[vielzeug.dev/permit](https://vielzeug.dev/permit)**

|                                                  |                                              |
| ------------------------------------------------ | -------------------------------------------- |
| [Usage Guide](https://vielzeug.dev/permit/usage) | Roles, inheritance, wildcards, dynamic rules |
| [API Reference](https://vielzeug.dev/permit/api) | Complete type signatures                     |
| [Examples](https://vielzeug.dev/permit/examples) | Real-world RBAC patterns                     |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
