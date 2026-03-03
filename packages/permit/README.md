# @vielzeug/permit

> Lightweight role-based access control (RBAC) with attribute-aware permission checks

[![npm version](https://img.shields.io/npm/v/@vielzeug/permit)](https://www.npmjs.com/package/@vielzeug/permit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Permit** is a minimal RBAC library: define permissions per role and resource, check them at runtime with optional attribute conditions, and extend via role inheritance — all in a tiny, dependency-free package.

## Installation

```sh
pnpm add @vielzeug/permit
# npm install @vielzeug/permit
# yarn add @vielzeug/permit
```

## Quick Start

```typescript
import { createPermit, WILDCARD } from '@vielzeug/permit';

const permit = createPermit<User>();

// Grant permissions
permit.set('admin', 'post', { create: true, read: true, update: true, delete: true });
permit.set('user',  'post', { create: true, read: true });

// Check a permission
const canDelete = permit.check({ role: 'user' }, 'post', 'delete');
// → false

// Wildcard resource — applies to all resources
permit.set('superadmin', WILDCARD, { create: true, read: true, update: true, delete: true });
```

## Features

- ✅ **Role-based permissions** — define `create`, `read`, `update`, `delete` per role+resource
- ✅ **Attribute-based conditions** — pass a condition function for dynamic checks
- ✅ **Wildcard resources** — grant a role access to all resources with `WILDCARD`
- ✅ **Anonymous access** — use `ANONYMOUS` role for unauthenticated users
- ✅ **Role inheritance** — extend roles with `extends` to inherit permissions
- ✅ **Type-safe users** — generic `<User>` type for the user object passed to `check`
- ✅ **Zero dependencies**

## Usage

### Defining Permissions

```typescript
import { createPermit, WILDCARD, ANONYMOUS } from '@vielzeug/permit';

const permit = createPermit<User>();

// Standard actions object
permit.set('viewer', 'article', { read: true });
permit.set('editor', 'article', { create: true, read: true, update: true });
permit.set('admin',  'article', { create: true, read: true, update: true, delete: true });

// Anonymous access (unauthenticated)
permit.set(ANONYMOUS, 'article', { read: true });

// Wildcard — applies to all resources
permit.set('superadmin', WILDCARD, { create: true, read: true, update: true, delete: true });
```

### Checking Permissions

```typescript
// Basic check
permit.check({ role: 'viewer' }, 'article', 'read');   // true
permit.check({ role: 'viewer' }, 'article', 'delete'); // false

// Attribute-based condition — 4th arg receives user and resource data
permit.set('user', 'post', {
  read: true,
  update: (user, post) => post.authorId === user.id,
  delete: (user, post) => post.authorId === user.id,
});

permit.check({ role: 'user', id: '42' }, 'post', 'update', { authorId: '42' });
// → true (authorId matches user.id)

permit.check({ role: 'user', id: '42' }, 'post', 'delete', { authorId: '99' });
// → false
```

### Role Inheritance

```typescript
permit.set('editor', 'article', { create: true, read: true, update: true });

permit.set('senior-editor', 'article', {
  extends: 'editor',  // inherits editor permissions
  delete: true,        // adds delete
});

permit.check({ role: 'senior-editor' }, 'article', 'create'); // true (inherited)
permit.check({ role: 'senior-editor' }, 'article', 'delete'); // true (added)
```

## API

| Export | Description |
|---|---|
| `createPermit<User>()` | Create a permission store |
| `WILDCARD` | Symbol matching all resources |
| `ANONYMOUS` | Symbol for unauthenticated users |
| `BaseUser` | Base type `{ role: string }` |
| `PermissionAction` | Type of an action value (`boolean \| ConditionFn`) |

### Permit Methods

| Method | Description |
|---|---|
| `permit.set(role, resource, actions)` | Define permissions for a role+resource |
| `permit.check(user, resource, action, data?)` | Check if user can perform action |

## Documentation

Full docs at **[vielzeug.dev/permit](https://vielzeug.dev/permit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/permit/usage) | Roles, resources, conditions |
| [API Reference](https://vielzeug.dev/permit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/permit/examples) | Real-world RBAC patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
