---
title: Ward — Deterministic authorization for TypeScript
description: Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.
package: ward
category: auth
keywords: [rbac, permissions, roles, access-control, authorization, wildcards, predicates]
related: [rune, wayfinder, conduit]
exports:
  [
    createWard,
    rule,
    defineRules,
    owns,
    matchesPattern,
    patternCovers,
    guardRequest,
    guardRequestWith,
    createExpressGuard,
    createHonoGuard,
    WILDCARD,
    ANONYMOUS,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="ward" />

## Why Ward?

Spreading authorization checks across route handlers, service methods, and UI components leads to inconsistent enforcement, no central place to audit permissions, and rules that drift as the codebase grows.

```ts
// Before — ad-hoc checks scattered across handlers
function deletePost(user: User, post: Post) {
  if (user.role !== 'admin' && user.id !== post.authorId) {
    throw new Error('Forbidden');
  }
  // no logging, no explain, no wildcard, no composition
}

// After — Ward declarative rules with typed enforcement
import { createWard } from '@vielzeug/ward';

const ward = createWard([
  { role: 'admin', action: '*', resource: '*', effect: 'allow' },
  { role: 'author', action: ['delete', 'edit'], resource: 'post',
    effect: 'allow', predicate: (ctx) => ctx.resource.authorId === ctx.principal.id },
]);

const guard = ward.forUser(currentUser);
guard.can('delete', post);           // boolean — typed, predictable
guard.explain('delete', post);       // { effect, rule } — auditable
```

| Feature                           | Ward                                       | CASL    | AccessControl        |
| --------------------------------- | ------------------------------------------ | ------- | -------------------- |
| Bundle size                       | <PackageInfo package="ward" type="size" /> | ~11 kB  | ~7 kB                |
| Typed rule contracts              | <sg-icon name="check" size="16"></sg-icon>                                         | Partial | Partial              |
| Deterministic deny precedence     | <sg-icon name="check" size="16"></sg-icon>                                         | <sg-icon name="check" size="16"></sg-icon>      | <sg-icon name="check" size="16"></sg-icon>                   |
| Rule predicates with request data | <sg-icon name="check" size="16"></sg-icon>                                         | <sg-icon name="check" size="16"></sg-icon>      | <sg-icon name="triangle-alert" size="16"></sg-icon> (manual patterns) |
| Wildcard action support           | <sg-icon name="check" size="16"></sg-icon>                                         | <sg-icon name="check" size="16"></sg-icon>      | <sg-icon name="check" size="16"></sg-icon>                   |
| Principal-bound API               | <sg-icon name="check" size="16"></sg-icon> (`forUser`)                             | Partial | <sg-icon name="x" size="16"></sg-icon>                   |
| Explainable decisions             | <sg-icon name="check" size="16"></sg-icon>                                         | Partial | <sg-icon name="x" size="16"></sg-icon>                   |
| Zero dependencies                 | <sg-icon name="check" size="16"></sg-icon>                                         | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>                   |

<div class="decision-callout">

**Use Ward when** you want predictable authorization decisions with typed rules and explicit introspection APIs.

**Consider larger policy frameworks when** you need ecosystem-specific integrations or policy storage outside application code.

</div>

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
  { role: ['viewer', 'editor'], resource: 'posts', action: 'read', effect: 'allow' },
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
trace.candidates.forEach((c) => console.log(c.rule.effect, c.score, c.won));

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

## Features

<div class="features-grid">

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
- Built-in Express and Hono middleware guards via `createExpressGuard`, `createHonoGuard`, `guardRequest`, and `guardRequestWith`
- **Debug logging** via `debugWard()` (`@vielzeug/ward/devtools`) — logs every authorization decision (`can`, `explain`, `trace`, etc.) with `[ward:decision]` prefixes including rule effect; tree-shaken from production bundles

</div>


## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Wayfinder](../wayfinder/index.md) for route-level authorization middleware.
- [Rune](../rune/index.md) for structured audit logs of permission checks.
- [Herald](../herald/index.md) for event-driven permission workflows.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
