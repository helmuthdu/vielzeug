---
title: Ward — Deterministic authorization for TypeScript
description: Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.
package: ward
category: auth
keywords: [rbac, permissions, roles, access-control, authorization, wildcards, predicates]
related: [rune, wayfinder, conduit]
exports: [createWard, rule, defineRules, owns, matchesPattern, patternCovers, guardRequest, createExpressGuard, createHonoGuard, WILDCARD, ANONYMOUS]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="ward" />

<img src="/logo-ward.svg" alt="Ward logo" width="156" class="logo-highlight"/>

# Ward

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/ward` &nbsp;·&nbsp; **Category:** Auth

**Key exports:** `createWard`, `rule`, `defineRules`, `owns`, `matchesPattern`, `patternCovers`, `guardRequest`, `createExpressGuard`, `createHonoGuard`, `WILDCARD`, `ANONYMOUS`

**When to use:** Minimal RBAC engine with deterministic precedence, wildcard rules, dynamic predicates, and audit logging.

**Related:** [Rune](/rune/) · [Wayfinder](/wayfinder/) · [Conduit](/conduit/)

</details>

`@vielzeug/ward` is a small authorization engine for role/resource/action checks.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/ward
```

```sh [npm]
npm install @vielzeug/ward
```

```sh [yarn]
yarn add @vielzeug/ward
```

:::

## Quick Start

```ts
import { ANONYMOUS, WILDCARD, createWard, owns } from '@vielzeug/ward';

const ward = createWard<'read' | 'update', { authorId: string }>([
  // Multi-role rule: viewer and editor can both read
  { role: ['viewer', 'editor'], resource: 'posts', action: 'read',   effect: 'allow' },
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

ward.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read');
ward.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' });

// Full decision with deny reason
const decision = ward.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' });
if (!decision.allowed) console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'

// Full decision trace — shows every matching candidate and why the winner was picked
const trace = ward.trace({ id: 'u1', roles: ['editor'] }, 'posts', 'read');
trace.candidates.forEach(c => console.log(c.rule.effect, c.score, c.won));

// Detect policy conflicts at startup
const conflicts = ward.detectConflicts();
if (conflicts.length > 0) console.warn('Policy conflicts:', conflicts);

const bound = ward.forUser({ id: 'u1', roles: ['editor'] });

bound.canAll('posts', ['read', 'update'], { authorId: 'u1' });
bound.allowedActions('posts', ['read', 'update', 'delete']);
bound.explain('posts', 'update', { authorId: 'u2' });
bound.checkAll([
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'update', data: { authorId: 'u1' } },
]);
bound.rulesInScope('posts');
```

## Why Ward?

- Minimal API: `can`, `canAll`, `canAny`, `checkAll`, `allowedActions`, `explain`, `rulesInScope`, `forUser`
- Deterministic precedence model
- Deny-overrides at top precedence
- Runtime predicates directly on rules
- Exact matching with explicit wildcards
- Zero dependencies

| Feature                           | Ward                                       | CASL    | AccessControl        |
| --------------------------------- | -------------------------------------------- | ------- | -------------------- |
| Bundle size                       | <PackageInfo package="ward" type="size" /> | ~11 kB  | ~7 kB                |
| Typed rule contracts              | ✅                                           | Partial | Partial              |
| Deterministic deny precedence     | ✅                                           | ✅      | ✅                   |
| Rule predicates with request data | ✅                                           | ✅      | ⚠️ (manual patterns) |
| Wildcard action support           | ✅                                           | ✅      | ✅                   |
| Principal-bound API               | ✅ (`forUser`)                               | Partial | ❌                   |
| Explainable decisions             | ✅                                           | Partial | ❌                   |
| Zero dependencies                 | ✅                                           | ❌      | ❌                   |

**Use Ward when** you want predictable authorization decisions with typed rules and explicit introspection APIs.

**Consider larger policy frameworks when** you need ecosystem-specific integrations or policy storage outside application code.

## Features

- One rule primitive: `WardRule` passed to `createWard(rules)`
- **Multi-role rules**: `role` accepts a string or an array of strings (OR semantics)
- Decision methods: `ward.can`, `ward.canAll`, `ward.canAny`, `ward.explain`
- Full decision trace: `ward.trace(principal, resource, action, data?)` — see every matching candidate
- Batch decisions: `ward.checkAll(principal, checks)`
- Rule introspection: `ward.rulesInScope(principal, resource, data?)`
- Action enumeration: `ward.allowedActions(principal, resource, knownActions, data?)`
- Policy conflict detection: `ward.detectConflicts()`
- Explicit wildcard support with `WILDCARD`
- Anonymous checks via `null` principal plus `ANONYMOUS` role rules
- Ownership helper via `owns(attributeKey)`
- Typed rule slice factory via `defineRules()`
- Principal-bound API via `ward.forUser(principal)`
- Fluent rule builder via `rule()` with `.priority()` support
- Built-in Express and Hono middleware guards

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

- [Wayfinder](../wayfinder/index.md) for route-level authorization middleware.
- [Rune](../rune/index.md) for structured audit logs of permission checks.
- [Herald](../herald/index.md) for event-driven permission workflows.

<!-- markdownlint-enable MD025 MD033 MD060 -->
