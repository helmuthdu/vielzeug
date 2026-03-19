# @vielzeug/permit

> Lightweight, type-safe role-based access control (RBAC) with inheritance, wildcards, dynamic checks, and anonymous-user support.

[![npm version](https://img.shields.io/npm/v/@vielzeug/permit)](https://www.npmjs.com/package/@vielzeug/permit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/permit` provides a focused RBAC engine built around role, resource, and action checks.

## Installation

```sh
pnpm add @vielzeug/permit
# npm install @vielzeug/permit
# yarn add @vielzeug/permit
```

## Entry Point

| Entry | Purpose |
| --- | --- |
| `@vielzeug/permit` | `createPermit`, constants, helpers, and full Permit types |

## Quick Start

```ts
import { ANONYMOUS, WILDCARD, createPermit } from '@vielzeug/permit';

const permit = createPermit();

permit
  .grant('viewer', WILDCARD, 'read')
  .extend('editor', 'viewer')
  .define('editor', 'posts', {
    write: (user, data) => user.id === data?.authorId,
  })
  .extend('admin', 'editor')
  .grant('admin', WILDCARD, 'delete')
  .grant(ANONYMOUS, 'posts', 'read');

const user = { id: 'u1', roles: ['editor'] };

permit.check(user, 'posts', 'read');
permit.check(user, 'posts', 'write', { authorId: 'u1' });
permit.checkAny(user, 'posts', ['write', 'delete']);
```

## Features

- Role/resource/action permission checks
- Dynamic rules via permission functions `(user, data?) => boolean`
- Role inheritance (`extend`/`unextend`) with BFS resolution
- Wildcard role/resource/action support (`WILDCARD`)
- Anonymous-role support (`ANONYMOUS`) for unauthenticated users
- Bulk checks (`checkAll`, `checkAny`) and user-bound guards (`for(user)`)
- Permission lifecycle operations (`remove`, `snapshot`, `restore`, `clear`)
- Strict-mode and wildcard-fallback options
- Zero dependencies

## API At a Glance

- `createPermit<TUser, TAction, TData>(opts?)`
- `permit.define(role, resource, actions)`
- `permit.grant(role, resource, ...actions)` / `permit.deny(...)`
- `permit.check(user, resource, action, data?)`
- `permit.checkAll(...)` / `permit.checkAny(...)`
- `permit.for(user)`
- `permit.extend(childRole, parentRole)` / `permit.unextend(...)`
- `permit.snapshot()` / `permit.restore(state)` / `permit.clear()`
- `hasRole(user, role)` / `isAnonymous(user)`
- `WILDCARD`, `ANONYMOUS`

## Documentation

- [Overview](https://vielzeug.dev/permit/)
- [Usage Guide](https://vielzeug.dev/permit/usage)
- [API Reference](https://vielzeug.dev/permit/api)
- [Examples](https://vielzeug.dev/permit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
