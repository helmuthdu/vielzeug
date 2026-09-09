---
title: Ward — Usage Guide
description: Define ordered role, wildcard, attribute, and ownership authorization rules.
---

[[toc]]

## Basic Usage

```ts
import { allow, createWard, deny, WILDCARD } from '@vielzeug/ward';

const ward = createWard<'read' | 'update', 'posts'>([
  deny('blocked', WILDCARD, [WILDCARD]),
  allow('editor', 'posts', ['read', 'update']),
  allow('viewer', 'posts', ['read']),
]);

const decision = ward.decide({
  action: 'update',
  principal: { id: 'u1', roles: ['editor'] },
  resource: 'posts',
});
```

Order is policy. Put exceptions and explicit denies before broad allows. No match returns a default-deny decision with `matched: false`.

## Check ownership with typed attributes

```ts
import { allow, createWard, predicate } from '@vielzeug/ward';

type Attributes = { authorId: string; status: 'draft' | 'published' };

const ward = createWard<'update', 'posts', Attributes>([
  allow<'update', 'posts', Attributes>('editor', 'posts', ['update'], {
    when: predicate.owns<Attributes>('authorId'),
  }),
]);

ward.decide({
  action: 'update',
  attributes: { authorId: post.authorId, status: post.status },
  principal,
  resource: 'posts',
});
```

Attribute values support finite numbers, strings, booleans, `null`, arrays, and plain objects. Ward rejects class instances, dates, maps, sets, functions, `undefined`, non-finite numbers, and circular values.

## Combine conditions

```ts
const canPublishOwnPost = predicate.and<Attributes>(
  predicate.hasRole<Attributes>('editor'),
  predicate.owns<Attributes>('authorId'),
  ({ attributes }) => attributes?.status === 'draft',
);
```

Conditions are synchronous. A thrown error, Promise, or non-boolean result becomes a `WardConditionError` with the original value in `cause`.

## Bind a principal

```ts
const permissions = ward.forPrincipal(principal);

permissions.decide({ action: 'update', attributes, resource: 'posts' });
permissions.checkAll([
  { action: 'read', attributes, resource: 'posts' },
  { action: 'update', attributes, resource: 'posts' },
]);
permissions.allowedActions({ attributes, knownActions: ['read', 'update'], resource: 'posts' });
```

`forPrincipal()` snapshots the principal, roles, and principal attributes. Later caller mutations cannot alter bound decisions.

## Observe decisions

```ts
const controller = new AbortController();

ward.tap((event) => audit.write(event), { signal: controller.signal });
controller.abort();
```

`tap()` observes `decide()` and `checkAll()`. It does not observe the hypothetical checks performed by `allowedActions()`. Handler failures are swallowed.

## Anonymous and wildcard roles

- `ANONYMOUS` matches `null` and an omitted principal.
- `WILDCARD` as a role matches any authenticated principal.
- `WILDCARD` as an action or resource matches every value.

## Testing

Construct a fresh Ward for each policy test. Assert decisions and ordering through the public API; rules are immutable snapshots.

## Framework Integration

Keep one Ward instance near the application boundary. Bind the current principal when rendering several related controls, and repeat authorization at the mutation boundary.

## Working with Other Vielzeug Libraries

Send `WardEvent` values to a Rune logger or Herald bus when an application needs centralized diagnostics. Keep durable audit persistence in the application.

## Best Practices

- Put narrow exceptions before broad rules.
- Keep default deny.
- Prefer `allow()` and `deny()` for role policies.
- Prefer declarative attributes before custom conditions.
- Type action, resource, and attribute generics at shared policy boundaries.
- Pass only authorization-relevant attributes.
- Treat `reason` as diagnostics, not user-facing prose.
