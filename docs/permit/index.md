---
title: Permit — Deterministic authorization for TypeScript
description: Minimal policy engine with explicit precedence, wildcard support, and JSON-safe policy state.
---

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

const permit = createPermit({
  predicates: {
    isOwner: ({ principal, data }) => principal.id === data?.authorId,
  },
});

permit
  .set({ role: 'editor', resource: 'posts', action: 'read', effect: 'allow' })
  .set({ role: 'editor', resource: 'posts', action: 'update', effect: 'allow', when: 'isOwner' })
  .set({ role: 'blocked', resource: 'posts', action: WILDCARD, effect: 'deny', priority: 100 })
  .set({ role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' });

permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read');
permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' });
```

## Why Permit?

- Minimal API: `set`, `can`, `withUser`, `clear`, `exportPolicy`, `importPolicy`
- Deterministic precedence model
- Deny-overrides at top precedence
- JSON-serializable policy payloads
- Predicate registry for dynamic conditions
- Zero dependencies

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## See Also

- [Routeit](/routeit/)
- [Wireit](/wireit/)
- [Stateit](/stateit/)
