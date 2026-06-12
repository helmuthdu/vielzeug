---
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
    createExpressGuard,
    createHonoGuard,
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

**Key exports:** `createWard`, `rule`, `defineRules`, `owns`, `matchesPattern`, `patternCovers`, `guardRequest`, `createExpressGuard`, `createHonoGuard`, `WILDCARD`, `ANONYMOUS`

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
  // High-priority deny overrides any allow rule for blocked principals
  { role: 'blocked', resource: 'posts', action: WILDCARD, effect: 'deny', priority: 100 },
  // Anonymous visitors can read posts
  { role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' },
]);

const principal = { id: 'u1', roles: ['editor'] };

// Direct checks
ward.can(principal, 'posts', 'read');
ward.can(principal, 'posts', 'update', { authorId: 'u1' });
ward.can(null, 'posts', 'read'); // anonymous

// Full decision object — three distinct variants
const decision = ward.explain(principal, 'posts', 'update', { authorId: 'u2' });
if (!decision.allowed) console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'

// Full decision trace with all matching candidates
const trace = ward.trace(principal, 'posts', 'update', { authorId: 'u2' });
trace.candidates.forEach((c) => console.log(c.rule.effect, c.score, c.won));

// Principal-bound view — principal is snapshotted at bind time
const bound = ward.forUser(principal);

bound.can('posts', 'read');
bound.canAll('posts', ['read', 'update'], { authorId: 'u1' });
bound.allowedActions('posts', ['read', 'update', 'delete']);
bound.explain('posts', 'update', { authorId: 'u2' });

// Conflict detection
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
