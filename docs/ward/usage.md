---
title: Ward — Usage Guide
description: Build deterministic authorization policies with immutable rule sets, wildcard support, and runtime predicates.
---

[[toc]]

## Basic Usage

```ts
import { WILDCARD, allow, createWard, deny } from '@vielzeug/ward';

const ward = createWard([
  allow('viewer', 'posts', ['read']),
  allow('editor', 'posts', ['update']),
  deny('blocked', 'posts', [WILDCARD], { priority: 100 }),
]);
```

`allow()`, `deny()`, and `ruleFor()` return `WardRule[]` (one rule per action). Pass them directly to `createWard` — no spread needed. Rules are immutable after creation. Create a new ward to update policy.

## Explain a Decision

```ts
const decision = ward.explain({
  principal: { id: 'u1', roles: ['editor'] },
  resource: 'posts',
  action: 'update',
  data: { authorId: 'u1' },
});

if (decision.allowed) {
  console.log(decision.rule);
} else {
  console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'
}
```

## Batch Decisions

```ts
const results = ward.checkAll({ id: 'u1', roles: ['editor'] }, [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'update', data: { authorId: 'u1' } },
]);
```

## Bound Ward (`forUser`)

```ts
const bound = ward.forUser({ id: 'u1', roles: ['editor'] });

bound.explain({ resource: 'posts', action: 'read' });
bound.trace({ resource: 'posts', action: 'update', data: { authorId: 'u1' } });
bound.rulesInScope({ resource: 'posts' });
bound.allowedActions({ resource: 'posts', knownActions: ['read', 'update', 'delete'] as const });
```

`forUser()` snapshots the principal. Re-bind when roles/identity change.

## Allowed Actions

`allowedActions()` evaluates a provided action set:

```ts
const actions = ward.allowedActions({
  principal: { id: 'u1', roles: ['admin'] },
  resource: 'posts',
  knownActions: ['read', 'update', 'delete'] as const,
});
```

It does not fire the logger.

## Rule Introspection

```ts
const scoped = ward.rulesInScope({
  principal: { id: 'u1', roles: ['editor'] },
  resource: 'posts',
});
```

Use optional `data` to filter predicate-gated matches.

## Trace Candidates

```ts
const trace = ward.trace({
  principal: { id: 'u1', roles: ['editor', 'blocked'] },
  resource: 'posts',
  action: 'read',
});

trace.candidates.forEach((c) => {
  console.log(c.index, c.priority, c.score, c.won);
});
```

`trace()` does not fire the logger.

## Predicate Helpers

```ts
import { owns, predicate } from '@vielzeug/ward';

const isOwner = owns('authorId');
const canEdit = predicate.and(isOwner, ({ principal }) => principal !== null);
```

Async predicates are rejected at runtime with `WardPredicateError`.

## Request Guards

Use `explain()` directly at request boundaries. Extract the principal from your framework's request object and pass it to Ward:

```ts
const principal = await extractPrincipal(req);
const decision = ward.explain({ principal, resource: 'posts', action: 'read' });

if (!decision.allowed) {
  return res.status(403).json({ error: decision.reason });
}
```

## Testing

Test policy outcomes through `explain()` so each test captures an allowed, explicit-deny, or no-match result.

```ts
import { expect, it } from 'vitest';

it('denies an action with no matching rule', () => {
  expect(
    ward.explain({ principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts', action: 'delete' }).allowed,
  ).toBe(false);
});
```

## Framework Integration

Keep Ward independent from rendering frameworks. Obtain a current principal from framework state, bind it with `forUser()`, and rebind whenever identity or roles change.

::: code-group

```tsx [React]
const actions = ward.forUser(user).allowedActions({ resource: 'posts', knownActions: ['read', 'update'] as const });
```

```vue [Vue 3]
<script setup lang="ts">
const actions = ward
  .forUser(user.value)
  .allowedActions({ resource: 'posts', knownActions: ['read', 'update'] as const });
</script>
```

```ts [Svelte]
const actions = ward.forUser(user).allowedActions({ resource: 'posts', knownActions: ['read', 'update'] as const });
```

:::

## Working with Other Vielzeug Libraries

### With Wayfinder

Enforce Ward decisions in Wayfinder route guards by calling `explain()` inside the guard callback:

```ts
const decision = ward.explain({ principal, resource: route.meta.resource, action: 'read' });

if (!decision.allowed) return '/forbidden';
```

### With Conduit

Inject a Ward instance into Conduit-managed services so authorization checks share a single compiled policy:

```ts
const ward = createWard(rules);
container.register('ward', ward);
```

## Best Practices

- Model default-deny by adding only explicit allow rules.
- Keep predicates synchronous and provide required resource data.
- Assign priority deliberately before relying on specificity.
- Rebind `forUser()` when identity or roles change.
- Use `trace()` and `detectConflicts()` to diagnose policy behavior.
- Enforce authorization again at request and mutation boundaries.
