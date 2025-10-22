# Permit Usage

How to install, import, and use the permit package in your project.

## Installation

```sh
pnpm add @vielzeug/permit
```

## Import

```ts
import { Permit } from '@vielzeug/permit';
```

## Basic Usage

```ts
Permit.register('admin', 'posts', { view: true, create: true });
const user = { id: '1', roles: ['admin'] };
const canView = Permit.check(user, 'posts', 'view'); // true
```

## Advanced Usage

- Dynamic permissions: `Permit.register('editor', 'posts', { update: (user, data) => user.id === data.authorId })`
- Wildcard roles/resources: `Permit.register('*', '*', { view: true })`
- Clear all permissions: `Permit.clear()`
- Get all roles/permissions: `Permit.roles`

See the [API Reference](./api.md) and [Examples](./examples.md) for more details.
