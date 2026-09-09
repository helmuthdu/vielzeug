---
title: Ward — Ordered authorization rules
description: Zero-dependency authorization decisions with ordered rules, role helpers, ownership predicates, and default deny.
package: ward
category: security
keywords: [authorization, rbac, permissions, policy, roles, predicates]
exports: [createWard, allow, deny, predicate, ANONYMOUS, WILDCARD, matchesPattern, patternCovers]
related: [herald, postmaster, refine]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="ward" />

## Why Ward?

Ward evaluates immutable ordered rules. The first matching rule wins; no match means deny. Typed action, resource, and attribute contracts keep role and ownership policies explicit.

## Quick Start

```ts
import { allow, createWard, deny, predicate, WILDCARD } from '@vielzeug/ward';

const ward = createWard([
  deny('blocked', WILDCARD, [WILDCARD]),
  allow('editor', 'posts', ['read', 'update'], { when: predicate.owns('authorId') }),
  allow('viewer', 'posts', ['read']),
]);

const decision = ward.decide({
  action: 'update',
  attributes: { authorId: 'u1' },
  principal: { id: 'u1', roles: ['editor'] },
  resource: 'posts',
});
```

| Feature | Ward | Inline conditionals |
| --- | --- | --- |
| Ordered first-match policy | <ore-icon name="check" size="16"></ore-icon> | Manual |
| Default deny | <ore-icon name="check" size="16"></ore-icon> | Manual |
| Typed actions | <ore-icon name="check" size="16"></ore-icon> | Partial |
| Ownership predicates | <ore-icon name="check" size="16"></ore-icon> | Manual |
| Zero dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

## Features

<div class="features-grid">

- Ordered `allow` and `deny` decisions
- Concise role/action rule factories
- `predicate.owns()`, `and()`, `or()`, and `not()`
- Exact, namespace, and wildcard action/resource patterns
- Immutable rules, principals, and JSON-compatible attributes
- Typed batch, bound-principal, and allowed-action checks
- `tap()` decision observability
- Default deny when no rule matches

</div>

## Installation

```sh
pnpm add @vielzeug/ward
```

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

## See Also

- [Postmaster](/postmaster/) — authorize durable job actions at application boundaries.
- [Refine](/refine/) — consume decisions in accessible UI components.

<!-- markdownlint-enable MD025 MD033 MD060 -->
