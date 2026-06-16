---
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
  ]
---

# @vielzeug/ward

> Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.

[![npm version](https://img.shields.io/npm/v/@vielzeug/ward)](https://www.npmjs.com/package/@vielzeug/ward) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/ward` &nbsp;·&nbsp; **Category:** Auth

**Key exports:** `createWard`, `allow`, `deny`, `predicate`, `owns`, `matchesPattern`, `patternCovers`, `guardRequest`, `guardRequestWith`, `WardPredicateError`, `WILDCARD`, `ANONYMOUS`

**When to use:** Minimal authorization engine with deterministic precedence, wildcard support, and runtime predicates.

**Related:** [@vielzeug/rune](https://vielzeug.dev/rune/) · [@vielzeug/wayfinder](https://vielzeug.dev/wayfinder/) · [@vielzeug/conduit](https://vielzeug.dev/conduit/)

</details>

`@vielzeug/ward` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/ward
npm install @vielzeug/ward
yarn add @vielzeug/ward
```

## Quick Start

```ts
import { ANONYMOUS, WILDCARD, allow, createWard, deny, predicate } from '@vielzeug/ward';

const ward = createWard<'read' | 'update', { authorId: string }>([
  // Multi-role rule: viewer and editor can both read
  ...allow(['viewer', 'editor'], 'posts', ['read']),
  // Editor can update their own posts (ownership predicate)
  ...allow('editor', 'posts', ['update'], { when: predicate.owns('authorId') }),
  // High-priority deny overrides any allow rule for blocked principals
  ...deny('blocked', WILDCARD, [WILDCARD], { priority: 100 }),
  // Anonymous visitors can read posts
  ...allow(ANONYMOUS, 'posts', ['read']),
]);

const principal = { id: 'u1', roles: ['editor'] };

// Full decision object — narrow on .allowed for type-safe access
const decision = ward.explain(principal, 'posts', 'update', { authorId: 'u2' });
if (!decision.allowed) console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'

// Batch decisions across multiple resources/actions in one call
const results = ward.checkAll(principal, [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'update', data: { authorId: 'u1' } },
]);

// Decision trace — candidates with index, score, priority, won (no logger fired)
const trace = ward.trace(principal, 'posts', 'update', { authorId: 'u2' });
trace.candidates.forEach((c) => console.log(`Rule[${c.index}]`, c.rule.effect, c.score, c.won));

// Principal-bound view — principal is snapshotted at bind time
const bound = ward.forUser(principal);
bound.allowedActions('posts', ['read', 'update', 'delete']);
bound.explain('posts', 'update', { authorId: 'u2' });

// Conflict detection — O(n²), lazy + cached
const conflicts = ward.detectConflicts();
if (conflicts.length > 0) console.warn('Policy conflicts:', conflicts);
```

## Documentation

- [Overview](https://vielzeug.dev/ward/)
- [Usage Guide](https://vielzeug.dev/ward/usage)
- [API Reference](https://vielzeug.dev/ward/api)
- [Examples](https://vielzeug.dev/ward/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
