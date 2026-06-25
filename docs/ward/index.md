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
    allow,
    deny,
    ruleFor,
    predicate,
    owns,
    matchesPattern,
    patternCovers,
    guardRequest,
    guardRequestWith,
    WardPredicateError,
    WILDCARD,
    ANONYMOUS,
    BoundWard,
    ConflictKind,
    Principal,
    RuleContext,
    UserPrincipal,
    Ward,
    WardCheck,
    WardConflict,
    WardDecision,
    WardDecisionResult,
    WardLoggerContext,
    WardOptions,
    WardPredicate,
    WardRule,
    WardTrace,
    WardTraceCandidate,
    GuardResult,
    PrincipalExtractor,
    WardRequest,
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
import { allow, createWard, predicate } from '@vielzeug/ward';

const ward = createWard<'delete' | 'edit', { authorId: string }>([
  ...allow('admin', '*', ['*']),
  ...allow('author', 'post', ['delete', 'edit'], { when: predicate.owns('authorId') }),
]);

const guard = ward.forUser(currentUser);
guard.explain('post', 'delete', post); // WardDecision — auditable
guard.allowedActions('post', ['delete', 'edit'], post); // ['delete', 'edit'] or []
```

| Feature                           | Ward                                                   | CASL                                       | AccessControl                                                         |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------- |
| Bundle size                       | <PackageInfo package="ward" type="size" />             | ~11 kB                                     | ~7 kB                                                                 |
| Typed rule contracts              | <ore-icon name="check" size="16"></ore-icon>             | Partial                                    | Partial                                                               |
| Deterministic deny precedence     | <ore-icon name="check" size="16"></ore-icon>             | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon>                            |
| Rule predicates with request data | <ore-icon name="check" size="16"></ore-icon>             | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> (manual patterns) |
| Wildcard action support           | <ore-icon name="check" size="16"></ore-icon>             | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon>                            |
| Principal-bound API               | <ore-icon name="check" size="16"></ore-icon> (`forUser`) | Partial                                    | <ore-icon name="x" size="16"></ore-icon>                                |
| Explainable decisions             | <ore-icon name="check" size="16"></ore-icon>             | Partial                                    | <ore-icon name="x" size="16"></ore-icon>                                |
| Zero dependencies                 | <ore-icon name="check" size="16"></ore-icon>             | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>                                |

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
import { ANONYMOUS, WILDCARD, allow, createWard, deny, predicate } from '@vielzeug/ward';

const ward = createWard<'read' | 'update', { authorId: string }>([
  // Multi-role rule: viewer and editor can both read
  ...allow(['viewer', 'editor'], 'posts', ['read']),
  // Editor can update their own posts
  ...allow('editor', 'posts', ['update'], { when: predicate.owns('authorId') }),
  // High-priority deny overrides any allow rule for blocked principals
  ...deny('blocked', WILDCARD, [WILDCARD], { priority: 100 }),
  // Anonymous visitors can read posts
  ...allow(ANONYMOUS, 'posts', ['read']),
]);

const editor = { id: 'u1', roles: ['editor'] };

// Full decision — narrow on .allowed for type-safe access to .reason / .rule
const decision = ward.explain(editor, 'posts', 'update', { authorId: 'u2' });
if (!decision.allowed) console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'

// Decision trace — all candidates with index, score, priority, won (no logger fired)
const trace = ward.trace(editor, 'posts', 'read');
trace.candidates.forEach((c) => console.log(`Rule[${c.index}]`, c.rule.effect, c.score, c.won));

// Detect policy conflicts at startup
const conflicts = ward.detectConflicts();
if (conflicts.length > 0) console.warn('Policy conflicts:', conflicts);

const bound = ward.forUser(editor);

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

- One rule primitive: `WardRule` passed directly to `createWard(rules)`
- **Rule factories**: `allow(role, resource, actions, opts?)` and `deny(...)` — readable, spreadable arrays
- **Grouped predicate namespace**: `predicate.owns()`, `predicate.and()`, `predicate.or()`, `predicate.not()`
- **Multi-role rules**: `role` accepts a string or an array of strings (OR semantics)
- Decision methods: `ward.explain(principal, resource, action, data?)` — full `WardDecision` object
- Batch decisions: `ward.checkAll(principal, checks)`
- Full decision trace: `ward.trace(principal, resource, action, data?)` — all candidates with `index`, `score`, `priority`, `won`; **does not fire the logger**
- Rule introspection: `ward.rulesInScope(principal, resource, data?)`
- Action enumeration: `ward.allowedActions(principal, resource, knownActions, data?)`
- Policy conflict detection: `ward.detectConflicts()` — lazy, cached, O(n²)
- Explicit wildcard support with `WILDCARD`
- Anonymous checks via `null` principal plus `ANONYMOUS` role rules
- Ownership helper via `owns(attributeKey)` or `predicate.owns(attributeKey)`
- Principal-bound API via `ward.forUser(principal)` — principal snapshotted at bind time
- Framework-agnostic guards: `guardRequest`, `guardRequestWith`
- **Debug logging** via `debugWard()` (`@vielzeug/ward/devtools`) — logs `explain` and `checkAll` decisions with `[ward:decision]` prefixes; tree-shaken from production bundles

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
