# @vielzeug/permit

> Minimal, deterministic authorization engine.

[![npm version](https://img.shields.io/npm/v/@vielzeug/permit)](https://www.npmjs.com/package/@vielzeug/permit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/permit` is a small authorization engine built around one rule primitive and one decision function.

## Installation

```sh
pnpm add @vielzeug/permit
# npm install @vielzeug/permit
# yarn add @vielzeug/permit
```

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
  { role: WILDCARD, resource: 'status', action: 'read', effect: 'allow' },
]);

const principal = { id: 'u1', roles: ['editor'] };

const bound = permit.forUser(principal);

permit.can(principal, 'posts', 'read');
permit.can(principal, 'posts', 'update', { authorId: 'u1' });
bound.can('status', 'read');
bound.canAll('posts', ['read', 'update'], { authorId: 'u1' });
bound.explain('posts', 'update', { authorId: 'u2' });
```

## Features

- Immutable rule engine: rules are compiled once at creation
- Runtime predicates per rule via `when`
- Deterministic precedence (priority -> specificity -> deny-overrides)
- Anonymous support via `null` principal and `ANONYMOUS` role constant
- Wildcards for role/resource/action via `WILDCARD`
- Multi-action checks with `canAll()` and `canAny()`
- Batch decision checks with `checkAll()`
- Action filtering with `allowedActions(knownActions?)`
- Explainable denials with `explain()` and deny reasons
- Rule introspection with `rulesInScope(principal, resource, data?)`
- Principal-bound API via `permit.forUser(principal)`
- Ownership helper via `owns(attributeKey)`
- Optional principal attributes for ABAC checks
- Auditable decision methods through logger context
- Zero dependencies

## API

- `createPermit(rules?, options?)`
- `permit.can(principal, resource, action, data?)`
- `permit.canAll(principal, resource, actions, data?)`
- `permit.canAny(principal, resource, actions, data?)`
- `permit.checkAll(principal, checks)`
- `permit.allowedActions(principal, resource, data?, knownActions?)`
- `permit.explain(principal, resource, action, data?)`
- `permit.rulesInScope(principal, resource, data?)`
- `permit.forUser(principal)`
- `owns(attributeKey)`

## Decision Model

Permit applies one deterministic model:

1. No matching rule means deny.
2. Highest `priority` wins.
3. If priority ties, more specific rules win over wildcard rules.
4. If priority and specificity tie, `deny` overrides `allow`.

## Notes

- Matching is exact. Use a consistent identifier convention in your app.
- `when` is a predicate function on the rule itself.
- `null` is the only anonymous principal value.
- Invalid principal payloads throw instead of silently falling back to anonymous.
- Invalid rule fields (empty role/resource/action, non-finite priority, wrong effect or `when` type) throw at `createPermit` time.
- Permit instances are immutable: all rules are compiled at creation time.
- `allowedActions(...)` returns `[]` for wildcard-only action matches unless `knownActions` is provided.
- `rulesInScope(...)` is introspection-only and can optionally refine predicate rules when `data` is provided.
- The logger runs for decision methods like `can`, `canAll`, `canAny`, `checkAll`, and `explain`, but not for `allowedActions` or `rulesInScope`.
- `forUser(principal)` deep-clones principal attributes at binding time; later mutations to the original object do not affect the bound view.

## API Summary

| Symbol | Purpose |
| --- | --- |
| `createPermit(rules?, { logger? })` | Create an immutable permit instance |
| `permit.can(principal, resource, action, data?)` | Evaluate one permission check |
| `permit.canAll(principal, resource, actions, data?)` | Require all actions to pass |
| `permit.canAny(principal, resource, actions, data?)` | Require at least one action to pass |
| `permit.checkAll(principal, checks)` | Evaluate multiple checks and return decisions in order |
| `permit.allowedActions(principal, resource, data?, knownActions?)` | List allowed concrete actions |
| `permit.explain(principal, resource, action, data?)` | Return structured decision diagnostics |
| `permit.rulesInScope(principal, resource, data?)` | List rules in scope for principal/resource introspection |
| `permit.forUser(principal)` | Create a principal-bound permit view |
| `owns(attributeKey)` | Create an ownership predicate |

## Documentation

Full docs at **[vielzeug.dev/permit](https://vielzeug.dev/permit)**

| | |
| --- | --- |
| [Usage Guide](https://vielzeug.dev/permit/usage) | Rule authoring, matching behavior, and runtime patterns |
| [API Reference](https://vielzeug.dev/permit/api) | Public API, types, and signatures |
| [Examples](https://vielzeug.dev/permit/examples) | Practical recipes for real application flows |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
