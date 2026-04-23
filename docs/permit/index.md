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
import { ANONYMOUS, WILDCARD, createPermit } from '@vielzeug/permit';

const permit = createPermit<'read' | 'update', { authorId: string }>();

permit
  .set({ role: 'editor', resource: 'posts', action: 'read', effect: 'allow' })
  .set({
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: ({ principal, data }) => principal.id === data?.authorId,
  })
  .set({ role: 'blocked', resource: 'posts', action: WILDCARD, effect: 'deny', priority: 100 })
  .set({ role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' });

permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read');
permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' });
```

## Why Permit?

- Minimal API: `set`, `can`, `forUser`, `rules`, `replace`, `clear`
- Deterministic precedence model
- Deny-overrides at top precedence
- Runtime predicates directly on rules
- Exact matching with explicit wildcards
- Zero dependencies

## Core Ideas

- One rule primitive: `permit.set(rule)`
- One decision method: `permit.can(principal, resource, action, data?)`
- Explicit wildcard support with `WILDCARD`
- Anonymous checks via `null` principal plus `ANONYMOUS` role rules
- Optional user-bound function via `permit.forUser(principal)`

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
