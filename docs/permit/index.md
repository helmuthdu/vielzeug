---
title: Permit — Deterministic authorization for TypeScript
description: Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.
package: permit
category: auth
keywords: [rbac, permissions, roles, access-control, authorization, wildcards, predicates]
related: [rune, route, wired]
exports: [createPermit, owns]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="permit" />

<img src="/logo-permit.svg" alt="Permit logo" width="156" class="logo-highlight"/>

# Permit

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/permit` &nbsp;·&nbsp; **Category:** Auth

**Key exports:** `createPermit`, `owns`

**When to use:** Minimal RBAC engine with deterministic precedence, wildcard rules, dynamic predicates, and audit logging.

**Related:** [Rune](/rune/) · [Route](/route/) · [Wired](/wired/)

</details>

`@vielzeug/permit` is a small authorization engine for role/resource/action checks.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/permit
```

```sh [npm]
npm install @vielzeug/permit
```

```sh [yarn]
yarn add @vielzeug/permit
```

:::

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
]);

permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read');
permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' });

const bound = permit.forUser({ id: 'u1', roles: ['editor'] });

bound.canAll('posts', ['read', 'update'], { authorId: 'u1' });
bound.explain('posts', 'update', { authorId: 'u2' });
bound.checkAll([
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'update', data: { authorId: 'u1' } },
]);
bound.rulesInScope('posts');
```

## Why Permit?

- Minimal API: `can`, `canAll`, `canAny`, `checkAll`, `allowedActions`, `explain`, `rulesInScope`, `forUser`
- Deterministic precedence model
- Deny-overrides at top precedence
- Runtime predicates directly on rules
- Exact matching with explicit wildcards
- Zero dependencies

| Feature                           | Permit                                       | CASL    | AccessControl        |
| --------------------------------- | -------------------------------------------- | ------- | -------------------- |
| Bundle size                       | <PackageInfo package="permit" type="size" /> | ~11 kB  | ~7 kB                |
| Typed rule contracts              | ✅                                           | Partial | Partial              |
| Deterministic deny precedence     | ✅                                           | ✅      | ✅                   |
| Rule predicates with request data | ✅                                           | ✅      | ⚠️ (manual patterns) |
| Wildcard action support           | ✅                                           | ✅      | ✅                   |
| Principal-bound API               | ✅ (`forUser`)                               | Partial | ❌                   |
| Explainable decisions             | ✅                                           | Partial | ❌                   |
| Zero dependencies                 | ✅                                           | ❌      | ❌                   |

**Use Permit when** you want predictable authorization decisions with typed rules and explicit introspection APIs.

**Consider larger policy frameworks when** you need ecosystem-specific integrations or policy storage outside application code.

## Features

- One rule primitive: `PermitRule` passed to `createPermit(rules)`
- Decision methods: `permit.can`, `permit.canAll`, `permit.canAny`, `permit.explain`
- Batch decisions: `permit.checkAll(principal, checks)`
- Rule introspection: `permit.rulesInScope(principal, resource, data?)`
- Action enumeration: `permit.allowedActions(principal, resource, data?, knownActions?)`
- Explicit wildcard support with `WILDCARD`
- Anonymous checks via `null` principal plus `ANONYMOUS` role rules
- Ownership helper via `owns(attributeKey)`
- Principal-bound API via `permit.forUser(principal)`

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Route](../route/index.md) for route-level authorization middleware.
- [Rune](../rune/index.md) for structured audit logs of permission checks.
- [Relay](../relay/index.md) for event-driven permission workflows.

<!-- markdownlint-enable MD025 MD033 MD060 -->
