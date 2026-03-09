# @vielzeug/permit

> Lightweight, type-safe role-based access control (RBAC) with dynamic permission functions, wildcard roles, and anonymous user support.

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

// Shorthand setup — grant/deny multiple actions at once
permit
  .grant('admin', WILDCARD, 'read', 'write', 'delete')
  .grant('editor', 'posts', 'read')
  .register('editor', 'posts', { write: (user, data) => user.id === data?.authorId })
  .grant(ANONYMOUS, 'posts', 'read'); // public read

const user = { id: 'u1', roles: ['editor'] };

// Direct check
permit.check(user, 'posts', 'read');                       // true
permit.check(user, 'posts', 'write', { authorId: 'u1' }); // true
permit.check(user, 'posts', 'delete');                     // false

// Pre-bound guard
const guard = permit.for(user);
guard.can('posts', 'read');                 // true
guard.canAll('posts', ['read', 'write']);   // true — both allowed
guard.canAny('posts', ['write', 'delete']); // true — write allowed
guard.can('posts', 'delete');               // false

// Standalone utilities
hasRole(user, 'editor'); // true
```

## Features

- **Role-based rules** — register permissions per role + resource with any string action
- **`grant` / `deny` shorthands** — boolean shortcuts without writing `{ action: true/false }` objects
- **Dynamic permissions** — `(user, data) => boolean` for context-aware rules
- **Wildcard role/resource** — `'*'` applies to all users or all resources
- **Partial wildcard override** — specific resources override individual wildcard actions, inheriting the rest
- **First-match-wins** — explicit `false` on an earlier role stops the chain
- **Anonymous users** — automatic `anonymous` role for null/unauthenticated users
- **Pre-bound guards** — `permit.for(user)` returns a `PermitGuard` with `can`, `canAny`, `canAll`
- **Fluent API** — all write methods return the permit instance for chaining
- **Snapshot / restore** — export and re-import the full permission set as a plain object
- **TypeScript generics** — type your user shape and action strings with `createPermit<MyUser, MyAction>()`
- **Zero dependencies**

## API Summary

### Factory

```ts
createPermit(opts?)           // create a permit instance
createPermit<User>()          // typed user
createPermit<User, Action>()  // typed user + action strings
```

| Option | Type | Description |
|---|---|---|
| `opts.initial` | `PermitSnapshot` | Seed initial permissions at creation time |
| `opts.logger` | `(result, user, resource, action, data?) => void` | Called on every check |

### Instance methods

| Method | Returns | Description |
|---|---|---|
| `register(role, resource, actions)` | `Permit` | Register permissions. Merges with existing. |
| `grant(role, resource, ...actions)` | `Permit` | Allow one or more actions. |
| `deny(role, resource, ...actions)` | `Permit` | Block one or more actions. |
| `check(user, resource, action, data?)` | `boolean` | Check if user has permission. |
| `for(user)` | `PermitGuard` | Pre-bound guard with `can`, `canAny`, `canAll`. |
| `remove(role, resource?, action?)` | `Permit` | Remove role / resource / action. |
| `snapshot()` | `PermitSnapshot` | Plain-object copy of all permissions. |
| `restore(snapshot)` | `Permit` | Replace state from a snapshot. |
| `clear()` | `Permit` | Remove all permissions. |

### Standalone utilities

| Export | Description |
|---|---|
| `hasRole(user, role)` | `true` if user has the role (case-insensitive). |
| `isAnonymous(user)` | `true` if user is null, missing `id`, or missing `roles`. |
| `WILDCARD` | `'*'` — matches all roles or all resources. |
| `ANONYMOUS` | `'anonymous'` — auto-assigned to unauthenticated users. |

## Documentation

Full docs at **[vielzeug.dev/permit](https://vielzeug.dev/permit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/permit/usage) | Roles, resources, wildcards, dynamic rules |
| [API Reference](https://vielzeug.dev/permit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/permit/examples) | Real-world RBAC patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
