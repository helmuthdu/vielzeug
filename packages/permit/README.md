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

// Fluent setup — any string actions, not just CRUD
permit
  .define('admin', WILDCARD, { read: true, write: true, delete: true })
  .define('editor', 'posts', {
    read:  true,
    write: (user, data) => user.id === data?.authorId,
  })
  .define(ANONYMOUS, 'posts', { read: true }); // public read

const user = { id: 'u1', roles: ['editor'] };

// Direct check
permit.check(user, 'posts', 'read');                         // true
permit.check(user, 'posts', 'write', { authorId: 'u1' });   // true
permit.check(user, 'posts', 'delete');                       // false

// Pre-bound guard
const can = permit.for(user);
can('posts', 'read');   // true
can('posts', 'delete'); // false

// Standalone utilities
hasRole(user, 'editor'); // true
```

## Features

- **Role-based rules** — define permissions per role + resource with any string action
- **Dynamic permissions** — `(user, data) => boolean` for context-aware rules
- **Wildcard role/resource** — `'*'` applies to all users or all resources
- **Partial wildcard override** — specific resources override individual wildcard actions, inheriting the rest
- **First-match-wins** — explicit `false` on an earlier role stops the chain
- **Anonymous users** — automatic `anonymous` role for unauthenticated users
- **Pre-bound guards** — `permit.for(user)` returns a single-user check function
- **Fluent API** — `define()` returns the instance for chained setup
- **Immutable snapshot** — `snapshot()` returns a safe plain-object copy
- **TypeScript generics** — type your user with `createPermit<MyUser>()`
- **Zero dependencies**

## API Summary

### Factory

```ts
createPermit(opts?)          // create a permit instance
createPermit<User>()         // typed user
createPermit<User, Action>() // typed user + action strings
```

| Option | Type | Description |
|---|---|---|
| `opts.roles` | `Record<...>` | Seed initial permissions at creation time |
| `opts.logger` | `(result, user, resource, action) => void` | Called on every check |

### Instance methods

| Method | Returns | Description |
|---|---|---|
| `define(role, resource, actions, opts?)` | `Permit` | Register permissions. Merges by default; `{ replace: true }` to overwrite. |
| `check(user, resource, action, data?)` | `boolean` | Check if user has permission. |
| `for(user)` | `(resource, action, data?) => boolean` | Pre-bound guard for a single user. |
| `remove(role, resource?, action?)` | `void` | Remove role / resource / action. |
| `snapshot()` | `PermitSnapshot` | Plain-object copy of all permissions. |
| `clear()` | `void` | Remove all permissions. |

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
