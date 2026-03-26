# @vielzeug/permit

> Minimal, deterministic authorization engine.

[![npm version](https://img.shields.io/npm/v/@vielzeug/permit)](https://www.npmjs.com/package/@vielzeug/permit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/permit` is a small policy engine built around one rule primitive and one decision function.

## Installation

```sh
pnpm add @vielzeug/permit
# npm install @vielzeug/permit
# yarn add @vielzeug/permit
```

## Quick Start

```ts
import { ANONYMOUS, WILDCARD, createPermit } from '@vielzeug/permit';

const permit = createPermit({
  predicates: {
    isOwner: ({ principal, data }) => principal.id === data?.authorId,
  },
});

permit
  .set({ role: 'editor', resource: 'posts', action: 'read', effect: 'allow' })
  .set({ role: 'editor', resource: 'posts', action: 'update', effect: 'allow', when: 'isOwner' })
  .set({ role: 'blocked', resource: 'posts', action: WILDCARD, effect: 'deny', priority: 100 })
  .set({ role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' })
  .set({ role: WILDCARD, resource: 'status', action: 'read', effect: 'allow' });

const principal = { id: 'u1', roles: ['editor'] };

permit.can(principal, 'posts', 'read');
permit.can(principal, 'posts', 'update', { authorId: 'u1' });
permit.withUser(principal).can('status', 'read');
```

## API

- `createPermit<TAction, TData>(options?)`
- `permit.set(rule)`
- `permit.can(principal, resource, action, data?)`
- `permit.withUser(principal).can(resource, action, data?)`
- `permit.clear()`
- `permit.exportPolicy()`
- `permit.importPolicy(policy)`

## Decision Rules

- Default outcome is deny.
- Higher `priority` wins.
- For equal priority, more specific rules win over wildcard rules.
- If top-precedence rules conflict, `deny` overrides `allow`.
- Result does not depend on role order in the principal payload.

## Notes

- Role/resource/action values are normalized (trim + lowercase).
- Predicates are referenced by id (`when`) and resolved through the `predicates` option.
- Exported policy is JSON-serializable.
- Invalid principal payloads throw instead of silently falling back to anonymous.

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
