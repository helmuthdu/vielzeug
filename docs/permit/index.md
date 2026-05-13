---
title: Permit — Deterministic authorization for TypeScript
description: Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.
---

<PackageBadges package="permit" />

<img src="/logo-permit.svg" alt="Permit logo" width="156" class="logo-highlight"/>

# Permit

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
bound.rulesFor('posts');
```

## Why Permit?

- Minimal API: `can`, `canAll`, `canAny`, `checkAll`, `allowedActions`, `explain`, `rulesFor`, `forUser`
- Deterministic precedence model
- Deny-overrides at top precedence
- Runtime predicates directly on rules
- Exact matching with explicit wildcards
- Zero dependencies

## Core Ideas

- One rule primitive: `PermitRule` passed to `createPermit(rules)`
- Decision methods: `permit.can`, `permit.canAll`, `permit.canAny`, `permit.explain`
- Batch decisions: `permit.checkAll(principal, checks)`
- Rule introspection: `permit.rulesFor(principal, resource)`
- Action enumeration: `permit.allowedActions(principal, resource, data?, knownActions?)`
- Explicit wildcard support with `WILDCARD`
- Anonymous checks via `null` principal plus `ANONYMOUS` role rules
- Ownership helper via `owns(attributeKey)`
- Principal-bound API via `permit.forUser(principal)`

## See Also

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |
