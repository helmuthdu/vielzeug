---
title: Ward — API Reference
description: Ordered authorization rules, typed decisions, immutable policies, and observability.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createWard()` | Compile immutable ordered rules | Sync | First match wins |
| `allow()` / `deny()` | Create role-conditioned rules | Sync | One rule is produced per action |
| `predicate` | Compose typed synchronous conditions | Sync | Async results throw |
| `matchesPattern()` | Match exact and wildcard values | Sync | `posts:*` does not match `posts` |
| `patternCovers()` | Compare pattern coverage | Sync | It does not inspect conditions |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/ward` | All runtime APIs, errors, constants, and public types |

## Core API

### `createWard()`

```ts
function createWard<Action extends string, Resource extends string, Attributes extends WardAttributes>(
  rules?: readonly (WardRule<Action, Resource, Attributes> | readonly WardRule<Action, Resource, Attributes>[])[],
): Ward<Action, Resource, Attributes>
```

Returns an immutable ordered policy. Nested rule arrays are flattened once. Rules, declarative attributes, and bound principals are snapshotted.

| Parameter | Type | Description |
| --- | --- | --- |
| `rules` | `readonly (WardRule \| readonly WardRule[])[]` | Rules in first-match order |

**Returns:** `Ward<Action, Resource, Attributes>`.

```ts
import { allow, createWard } from '@vielzeug/ward';

const ward = createWard<'read', 'posts'>([allow('viewer', 'posts', ['read'])]);
```

| Method | Returns | Behavior |
| --- | --- | --- |
| `decide(input)` | `WardDecision` | Evaluates and emits one decision event |
| `checkAll(inputs)` | `WardDecision[]` | Evaluates each input in order |
| `allowedActions(input)` | `Action[]` | Deduplicates and filters known actions without emitting events |
| `forPrincipal(principal?)` | `BoundWard` | Binds an immutable principal snapshot |
| `tap(handler, options?)` | `() => void` | Observes decisions; supports `AbortSignal` |
| `rules` | `readonly WardRule[]` | Immutable compiled rules |

---

### `allow()` and `deny()`

```ts
allow<Action, Resource, Attributes>(role, resource, actions, options?): WardRule[]
deny<Action, Resource, Attributes>(role, resource, actions, options?): WardRule[]
```

Return one role-conditioned rule per action.

| Parameter | Type | Description |
| --- | --- | --- |
| `role` | `string \| readonly string[]` | Role, role alternatives, `ANONYMOUS`, or `WILDCARD` |
| `resource` | `WardPattern<Resource>` | Exact or wildcard resource |
| `actions` | `readonly WardPattern<Action>[]` | Exact or wildcard actions |
| `options.when` | `WardCondition<Attributes>` | Additional synchronous condition |

**Returns:** `WardRule<Action, Resource, Attributes>[]`.

```ts
import { allow, deny, WILDCARD } from '@vielzeug/ward';

const rules = [deny('blocked', WILDCARD, [WILDCARD]), allow(['editor', 'admin'], 'posts', ['read'])];
```

---

### `predicate`

```ts
predicate.hasRole<Attributes>(role)
predicate.owns<Attributes>(attribute)
predicate.and<Attributes>(...conditions)
predicate.or<Attributes>(...conditions)
predicate.not<Attributes>(condition)
```

Returns typed `WardCondition` functions. `owns()` accepts only a string key from the selected attribute type.

---

### Pattern helpers

```ts
matchesPattern(pattern: string, value: string): boolean
patternCovers(broad: string, narrow: string): boolean
```

`matchesPattern()` supports exact values, `*`, and namespace wildcards such as `posts:*`. `patternCovers()` compares those pattern sets.

## Types

```ts
type WardAttributeValue =
  | boolean
  | number
  | string
  | null
  | readonly WardAttributeValue[]
  | { readonly [key: string]: WardAttributeValue };

type WardAttributes = Readonly<Record<string, WardAttributeValue>>;
type WardPattern<Value extends string> = Value | typeof WILDCARD | `${string}:*`;
```

```ts
type UserPrincipal = Readonly<{
  attributes?: WardAttributes;
  id: string;
  roles: readonly string[];
}>;

type Principal = UserPrincipal | null;
```

```ts
type WardConditionInput<Attributes extends WardAttributes> = Readonly<{
  attributes?: Attributes;
  principal: Principal;
}>;

type WardCondition<Attributes extends WardAttributes> = (
  input: WardConditionInput<Attributes>,
) => boolean;
```

```ts
type WardRule<Action extends string, Resource extends string, Attributes extends WardAttributes> = Readonly<{
  action: WardPattern<Action>;
  attributes?: Attributes;
  condition?: WardCondition<Attributes>;
  effect: 'allow' | 'deny';
  resource: WardPattern<Resource>;
}>;
```

```ts
type WardDecisionInput<Action extends string, Resource extends string, Attributes extends WardAttributes> = Readonly<{
  action: Action;
  attributes?: Attributes;
  principal?: Principal;
  resource: Resource;
}>;
```

```ts
type WardDecision<Action extends string, Resource extends string, Attributes extends WardAttributes> =
  | { effect: 'allow' | 'deny'; matched: true; reason: string; rule: WardRule<Action, Resource, Attributes> }
  | { effect: 'deny'; matched: false; reason: string; rule?: never };
```

```ts
type WardEvent<Action extends string, Resource extends string, Attributes extends WardAttributes> = Readonly<{
  decision: WardDecision<Action, Resource, Attributes>;
  input: WardDecisionInput<Action, Resource, Attributes> & { principal: Principal };
  type: 'decision';
}>;
```

`BoundWard`, `WardAllowedActionsInput`, `BoundWardAllowedActionsInput`, and `BoundWardDecisionInput` expose the corresponding principal-bound method contracts.

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `WardError` | Base for Ward-originated errors | Standard `cause` support |
| `WardConfigError` | Invalid rules, principals, inputs, or attribute values | Configuration message with field path |
| `WardConditionError` | Thrown, async, or non-boolean condition result | `ruleIndex`, `cause` |
