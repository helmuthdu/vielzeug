---
title: Ward — Deterministic authorization for TypeScript
description: Typed authorization policies with wildcard matching, deterministic precedence, and decision tracing.
package: ward
category: auth
keywords: [authorization, rbac, permissions, policy, roles, wildcard, predicates]
related: [wayfinder, conduit, herald]
exports: [createWard, allow, deny, ruleFor, owns, predicate, ANONYMOUS, WILDCARD, WardError, WardConfigError, WardPredicateError, NormalizedWardRule, matchesPattern, patternCovers]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="ward" />

## Why Ward?

Ward keeps authorization policies declarative and decision ordering deterministic. Define rules once, then explain or trace every permission decision without embedding role checks across handlers.

```ts
// Before
const canUpdate = user.roles.includes('editor') && post.authorId === user.id;

// After
import { allow, createWard, owns } from '@vielzeug/ward';

const ward = createWard([
  allow('editor', 'posts', ['update'], { when: owns('authorId') }),
]);

const decision = ward.explain({ principal: user, resource: 'posts', action: 'update', data: post });
const canUpdate = decision.allowed;
```

| Feature                  | Ward                                         | CASL                                     | AccessControl                            |
| ------------------------ | -------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Bundle size              | <PackageInfo package="ward" type="size" />   | Larger policy engine                     | Larger policy engine                     |
| Zero dependencies        | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Deterministic precedence | Priority, specificity, deny, order           | Rule-dependent                           | Role-grant dependent                     |
| Decision tracing         | `trace()` candidates and winner              | Manual inspection                        | Manual inspection                        |

<div class="decision-callout">

**Use Ward when** your application needs typed role/resource/action policies with explainable, deterministic outcomes.

**Consider framework-specific authorization when** your application only needs one framework's built-in route or component guard layer.

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

Create a small policy and handle both allowed and denied decisions at the request boundary.

```ts
import { allow, createWard } from '@vielzeug/ward';

const ward = createWard([
  allow('viewer', 'posts', ['read']),
  allow('editor', 'posts', ['update']),
]);

const decision = ward.explain({
  principal: { id: 'u1', roles: ['editor'] },
  resource: 'posts',
  action: 'update',
});

if (decision.allowed) console.log('Update post');
else console.log(decision.reason);
```

## Features

<div class="features-grid">

- `createWard()` creates immutable typed policy instances. Accepts `allow()`/`deny()` results directly — no spread needed.
- `allow()`, `deny()`, and `ruleFor()` build role/resource/action rules.
- `WILDCARD` and `ANONYMOUS` model broad or unauthenticated access explicitly.
- `owns()` and `predicate` constrain rules with synchronous request data.
- `explain()`, `trace()`, and `detectConflicts()` make policy decisions diagnosable.
- `forUser()` creates a principal-bound view for repeated checks.
- `checkAll()` evaluates multiple resource/action pairs in one call.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Wayfinder](/wayfinder/) — route middleware can enforce Ward decisions during navigation.
- [Conduit](/conduit/) — inject a Ward policy into application services.
- [Herald](/herald/) — publish authorization outcomes as typed application events.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
