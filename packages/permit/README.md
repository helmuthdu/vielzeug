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
import { ANONYMOUS, WILDCARD, createPermit } from '@vielzeug/permit';

const permit = createPermit<'read' | 'update', { authorId: string }>();

permit
  .set({ role: 'editor', resource: 'posts', action: 'read', effect: 'allow' })
  .set({
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: ({ principal, data }) => principal.id === data?.authorId,
  })
  .set({ role: 'blocked', resource: 'posts', action: WILDCARD, effect: 'deny', priority: 100 })
  .set({ role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' })
  .set({ role: WILDCARD, resource: 'status', action: 'read', effect: 'allow' });

const principal = { id: 'u1', roles: ['editor'] };

const can = permit.forUser(principal);

permit.can(principal, 'posts', 'read');
permit.can(principal, 'posts', 'update', { authorId: 'u1' });
can('status', 'read');
```

## Features

- Single rule model: `set({ role, resource, action, effect, ... })`
- Runtime predicates per rule via `when`
- Deterministic precedence (priority -> specificity -> deny-overrides)
- Anonymous support via `null` principal and `ANONYMOUS` role constant
- Wildcards for role/resource/action via `WILDCARD`
- User-bound checks with `forUser()`
- Auditable decisions through logger context
- Zero dependencies

## API

- `createPermit<TAction, TData>(options?)`
- `permit.set(rule)`
- `permit.can(principal, resource, action, data?)`
- `permit.forUser(principal)(resource, action, data?)`
- `permit.rules()`
- `permit.replace(rules)`
- `permit.clear()`

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
| `permit.set(rule)` | Append one rule |
| `permit.can(principal, resource, action, data?)` | Evaluate one permission check |
| `permit.forUser(principal)` | Create a user-bound checker function |
| `permit.rules()` | Get a snapshot of current rules |
| `permit.replace(rules)` | Replace the entire rule set |
| `permit.clear()` | Remove all rules |

## Documentation

Full docs at **[vielzeug.dev/permit](https://vielzeug.dev/permit)**

| | |
| --- | --- |
| [Usage Guide](https://vielzeug.dev/permit/usage) | Rule authoring, matching behavior, and runtime patterns |
| [API Reference](https://vielzeug.dev/permit/api) | Public API, types, and signatures |
| [Examples](https://vielzeug.dev/permit/examples) | Practical recipes for real application flows |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
