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

const permit = createPermit<'read' | 'update', { authorId: string }>();

permit
  .set({ role: 'editor', resource: 'posts', action: 'read', effect: 'allow' })
  .set({
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: owns('authorId'),
  })
  .set({ role: 'blocked', resource: 'posts', action: WILDCARD, effect: 'deny', priority: 100 })
  .set({ role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' })
  .set({ role: WILDCARD, resource: 'status', action: 'read', effect: 'allow' });

const principal = { id: 'u1', roles: ['editor'] };

const bound = permit.forUser(principal, true);

permit.can(principal, 'posts', 'read');
permit.can(principal, 'posts', 'update', { authorId: 'u1' });
bound.can('status', 'read');
bound.canAll('posts', ['read', 'update'], { authorId: 'u1' });
bound.explain('posts', 'delete');
```

## Features

- Single rule model: `set({ role, resource, action, effect, ... })`
- Runtime predicates per rule via `when`
- Deterministic precedence (priority -> specificity -> deny-overrides)
- Anonymous support via `null` principal and `ANONYMOUS` role constant
- Wildcards for role/resource/action via `WILDCARD`
- Multi-action checks with `canAll()` and `canAny()`
- Action filtering with `allowedActions()`
- Explainable denials with `explain()` and deny reasons
- User-bound checks with `forUser(principal, cache?)`
- Ownership helper via `owns(attributeKey)`
- Optional principal attributes for ABAC checks
- Auditable decisions through logger context
- Zero dependencies

## API

- `createPermit<TAction, TData>(options?)`
- `permit.set(rule | rules)`
- `permit.can(principal, resource, action, data?)`
- `permit.canAll(principal, resource, actions, data?)`
- `permit.canAny(principal, resource, actions, data?)`
- `permit.allowedActions(principal, resource, data?)`
- `permit.explain(principal, resource, action, data?)`
- `permit.forUser(principal, cache?) -> BoundPermit`
- `permit.rules()`
- `permit.replace(rules)`
- `permit.clear()`
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

## API Summary

| Symbol | Purpose |
| --- | --- |
| `createPermit({ initial?, logger? })` | Create a permit instance |
| `permit.set(rule | rules)` | Append one or more rules |
| `permit.can(principal, resource, action, data?)` | Evaluate one permission check |
| `permit.canAll(principal, resource, actions, data?)` | Require all actions to pass |
| `permit.canAny(principal, resource, actions, data?)` | Require at least one action to pass |
| `permit.allowedActions(principal, resource, data?)` | List allowed concrete actions |
| `permit.explain(principal, resource, action, data?)` | Return structured decision diagnostics |
| `permit.forUser(principal, cache?)` | Create a user-bound permit object |
| `permit.rules()` | Get a snapshot of current rules |
| `permit.replace(rules)` | Replace the entire rule set |
| `permit.clear()` | Remove all rules |
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
