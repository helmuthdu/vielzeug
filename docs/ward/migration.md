---
title: Ward 3.0 Migration
description: Migrate to Ward's immutable ordered decision model and typed attributes.
---

# Ward 3.0 Migration

## Evaluation is ordered

Priority, specificity scoring, conflict detection, and inheritance are removed. Rules run in declaration order and the first match wins. Put explicit denies and exceptions before broad allows.

```ts
// Before
allow('editor', 'posts', ['read'], { priority: 10 });

// After
createWard([
  deny('suspended', 'posts', ['read']),
  allow('editor', 'posts', ['read']),
]);
```

## Replace `explain()` with `decide()`

```ts
// Before
const decision = ward.explain({ action: 'read', principal, resource: 'posts' });
const allowed = decision.allowed;

// After
const decision = ward.decide({ action: 'read', principal, resource: 'posts' });
const allowed = decision.effect === 'allow';
```

`decide()` returns `matched: true` with an immutable matched rule, or `matched: false` for default deny. `trace()` and `rulesInScope()` are removed because declaration order and the returned rule provide the decision explanation.

## Bind principals with `forPrincipal()`

```ts
// Before
const permissions = ward.forUser(principal);
permissions.explain({ action: 'read', resource: 'posts' });

// After
const permissions = ward.forPrincipal(principal);
permissions.decide({ action: 'read', resource: 'posts' });
```

An omitted principal and `null` now both represent anonymous access. Bound principals are immutable snapshots.

## Update batch checks

```ts
// Before
ward.checkAll(principal, [{ action: 'read', resource: 'posts' }]);

// After
ward.checkAll([{ action: 'read', principal, resource: 'posts' }]);
// or
ward.forPrincipal(principal).checkAll([{ action: 'read', resource: 'posts' }]);
```

`allowedActions()` remains available with typed actions, resources, and attributes.

## Type attributes explicitly

The second generic now types resources. The third generic types decision attributes and condition keys.

```ts
type Attributes = { authorId: string };

const ward = createWard<'read' | 'update', 'posts', Attributes>([
  allow<'read' | 'update', 'posts', Attributes>('editor', 'posts', ['update'], {
    when: predicate.owns<Attributes>('authorId'),
  }),
]);

ward.decide({ action: 'update', attributes: { authorId: post.authorId }, principal, resource: 'posts' });
```

Rename prior `data` fields to `attributes`. Attribute values must be JSON-compatible, finite, and acyclic.

## Update condition errors

`WardPredicateError` is replaced by `WardConditionError`. Conditions must return a boolean synchronously. Thrown errors are preserved as `cause`; Promises and non-boolean results throw the same typed error.

## Update observation

`tap()` remains the decision-observation API, with a discriminated event object.

```ts
ward.tap((event) => {
  if (event.type === 'decision') audit.write(event);
});
```

`allowedActions()` performs hypothetical checks and does not emit events.
