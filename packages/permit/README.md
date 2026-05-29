---
description: Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.
package: permit
category: auth
keywords: [rbac, permissions, roles, access-control, authorization, wildcards, predicates]
related: [rune, route, wired]
exports: [createPermit, owns, WILDCARD, ANONYMOUS]
---

# @vielzeug/permit

> Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.

[![npm version](https://img.shields.io/npm/v/@vielzeug/permit)](https://www.npmjs.com/package/@vielzeug/permit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/permit` &nbsp;·&nbsp; **Category:** Auth

**Key exports:** `createPermit`, `owns`, `WILDCARD`, `ANONYMOUS`

**When to use:** Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.

**Related:** [@vielzeug/rune](https://vielzeug.dev/rune/) · [@vielzeug/route](https://vielzeug.dev/route/) · [@vielzeug/wired](https://vielzeug.dev/wired/)

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
  // Multi-role rule: viewer and editor can both read
  { role: ['viewer', 'editor'], resource: 'posts', action: 'read',   effect: 'allow' },
  {
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: owns('authorId'),
  },
  // High-priority deny overrides any allow rule for blocked principals
  { role: 'blocked', resource: 'posts', action: WILDCARD, effect: 'deny', priority: 100 },
  // Anonymous visitors can read posts
  { role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' },
]);

const principal = { id: 'u1', roles: ['editor'] };

// Direct checks
permit.can(principal, 'posts', 'read');
permit.can(principal, 'posts', 'update', { authorId: 'u1' });
permit.can(null, 'posts', 'read'); // anonymous

// Principal-bound view — principal is snapshotted at bind time
const bound = permit.forUser(principal);

bound.can('posts', 'read');
bound.canAll('posts', ['read', 'update'], { authorId: 'u1' });
bound.allowedActions('posts', ['read', 'update', 'delete']);
bound.explain('posts', 'update', { authorId: 'u2' });
```

## Documentation

- [Overview](https://vielzeug.dev/permit/)
- [Usage Guide](https://vielzeug.dev/permit/usage)
- [API Reference](https://vielzeug.dev/permit/api)
- [Examples](https://vielzeug.dev/permit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
