---
description: Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.
package: permit
category: auth
keywords: [rbac, permissions, roles, access-control, authorization, wildcards, predicates]
related: [logit, routeit, wireit]
exports: [createPermit, owns]
---

# @vielzeug/permit

> Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.

[![npm version](https://img.shields.io/npm/v/@vielzeug/permit)](https://www.npmjs.com/package/@vielzeug/permit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/permit` &nbsp;·&nbsp; **Category:** Auth

**Key exports:** `createPermit`, `owns`

**When to use:** Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.

**Related:** [@vielzeug/logit](https://vielzeug.dev/logit/) · [@vielzeug/routeit](https://vielzeug.dev/routeit/) · [@vielzeug/wireit](https://vielzeug.dev/wireit/)

</details>

`@vielzeug/permit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/permit
npm install @vielzeug/permit
yarn add @vielzeug/permit
```

## Quick Start

```ts
import { ANONYMOUS, WILDCARD, createPermit, owns } from '@vielzeug/permit';

const permit = createPermit<'read' | 'update', { authorId: string }>([
  { role: 'editor', resource: 'posts', action: 'read', effect: 'allow' },
  {
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: owns('authorId'),
  },
  { role: 'blocked', resource: 'posts', action: WILDCARD, effect: 'deny', priority: 100 },
  { role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' },
  { role: WILDCARD, resource: 'status', action: 'read', effect: 'allow' },
]);

const principal = { id: 'u1', roles: ['editor'] };

const bound = permit.forUser(principal);

permit.can(principal, 'posts', 'read');
permit.can(principal, 'posts', 'update', { authorId: 'u1' });
bound.can('status', 'read');
bound.canAll('posts', ['read', 'update'], { authorId: 'u1' });
bound.explain('posts', 'update', { authorId: 'u2' });
```

## Documentation

- [Overview](https://vielzeug.dev/permit/)
- [Usage Guide](https://vielzeug.dev/permit/usage)
- [API Reference](https://vielzeug.dev/permit/api)
- [Examples](https://vielzeug.dev/permit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
