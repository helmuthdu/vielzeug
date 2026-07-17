---
title: Ward — API Reference
description: Complete API reference for @vielzeug/ward.
---

[[toc]]

## Core Factory

### `createWard(rules, options?)`

```ts
createWard<TAction extends string = string, TData = unknown>(
  rules: ReadonlyArray<Readonly<WardRule<TAction, TData>>>,
  options?: WardOptions<TAction, TData>,
): Ward<TAction, TData>;
```

Creates an immutable ward instance.

## Rule Builders

### `allow(role, resource, actions, options?)`
### `deny(role, resource, actions, options?)`
### `ruleFor(effect, role, resource, actions, options?)`

All three return `WardRule[]` (one rule per action).

## Ward Methods

### `checkAll(principal, checks)`

```ts
checkAll(
  principal: UserPrincipal,
  checks: ReadonlyArray<WardCheck<TAction, TData>>,
): WardDecisionResult<TAction, TData>[];
```

### `explain(input)`

```ts
explain(input: WardExplainInput<TAction, TData>): WardDecision<TAction, TData>;
```

`WardExplainInput`:

```ts
{
  principal: UserPrincipal;
  resource: string;
  action: TAction;
  data?: TData;
}
```

### `trace(input)`

```ts
trace(input: WardTraceInput<TAction, TData>): WardTrace<TAction, TData>;
```

Same request shape as `explain()`. Returns winner + candidate list. Does not fire logger.

### `allowedActions(input)`

```ts
allowedActions<TKnown extends TAction>(
  input: WardAllowedActionsInput<TKnown, TData>,
): TKnown[];
```

Input shape:

```ts
{
  principal: UserPrincipal;
  resource: string;
  knownActions: readonly TKnown[];
  data?: TData;
}
```

### `rulesInScope(input)`

```ts
rulesInScope(input: WardRulesInScopeInput<TData>): ReadonlyArray<Readonly<WardRule<TAction, TData>>>;
```

Input shape:

```ts
{
  principal: UserPrincipal;
  resource: string;
  data?: TData;
}
```

### `detectConflicts()`

```ts
detectConflicts(): WardConflict<TAction, TData>[];
```

### `forUser(principal)`

```ts
forUser(principal: UserPrincipal): BoundWard<TAction, TData>;
```

Returns a principal-bound view.

## `BoundWard` Methods

```ts
interface BoundWard<TAction extends string = string, TData = unknown> {
  checkAll(checks: ReadonlyArray<WardCheck<TAction, TData>>): WardDecisionResult<TAction, TData>[];
  explain(input: BoundWardExplainInput<TAction, TData>): WardDecision<TAction, TData>;
  trace(input: BoundWardTraceInput<TAction, TData>): WardTrace<TAction, TData>;
  allowedActions<TKnown extends TAction>(input: BoundWardAllowedActionsInput<TKnown, TData>): TKnown[];
  rulesInScope(input: BoundWardRulesInScopeInput<TData>): ReadonlyArray<Readonly<WardRule<TAction, TData>>>;
}
```

Bound input shapes remove `principal`:

```ts
{ resource: string; action: TAction; data?: TData }           // explain/trace
{ resource: string; knownActions: readonly TKnown[]; data?: TData } // allowedActions
{ resource: string; data?: TData }                            // rulesInScope
```

## Predicate Helpers

### `predicate.owns(attributeKey)`
### `predicate.and(...predicates)`
### `predicate.or(...predicates)`
### `predicate.not(predicate)`
### `owns(attributeKey)` (alias)

Predicates run synchronously. Returning a Promise throws `WardPredicateError`.

## Pattern Helpers

### `matchesPattern(pattern, value): boolean`
### `patternCovers(broad, narrow): boolean`

## Middleware Guards

### `guardRequest(input)`

```ts
guardRequest<TAction extends string = string, TData = unknown>(
  input: GuardRequestInput<TAction, TData>,
): GuardResult<TAction, TData>;
```

Input:

```ts
{
  ward: Ward<TAction, TData>;
  principal: UserPrincipal;
  resource: string;
  action: TAction;
  data?: TData;
}
```

### `guardRequestWith(input)`

```ts
guardRequestWith<TReq, TAction extends string = string, TData = unknown>(
  input: GuardRequestWithInput<TReq, TAction, TData>,
): Promise<GuardResult<TAction, TData>>;
```

Input:

```ts
{
  ward: Ward<TAction, TData>;
  req: TReq;
  extractPrincipal: PrincipalExtractor<TReq>;
  resource: string;
  action: TAction;
  data?: TData;
}
```

## Devtools

### `debugWard(ward, logger?)`

Sub-path import: `@vielzeug/ward/devtools`.

```ts
import { debugWard } from '@vielzeug/ward/devtools';
```
