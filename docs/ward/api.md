---
title: Ward — API Reference
description: Complete API reference for @vielzeug/ward.
---

[[toc]]

## API Overview

| Symbol                              | Purpose                                | Execution mode | Common gotcha                          |
| ----------------------------------- | -------------------------------------- | -------------- | -------------------------------------- |
| `createWard`                        | Creates immutable policy               | Sync           | Rules cannot be mutated after creation |
| `allow` / `deny` / `ruleFor`        | Builds policy rules                    | Sync           | Priority wins before specificity       |
| `Ward.explain`                      | Returns one decision                   | Sync           | Pass resource data for predicate rules |
| `Ward.trace`                        | Inspects decision candidates           | Sync           | Does not invoke the logger             |
| `Ward.forUser`                      | Binds a principal                      | Sync           | Rebind when identity or roles change   |
| `guardRequest` / `guardRequestWith` | Adapts decisions to request boundaries | Sync / Async   | Enforce again at mutation boundaries   |

## Package Entry Point

| Import                    | Purpose                                                              |
| ------------------------- | -------------------------------------------------------------------- |
| `@vielzeug/ward`          | Rules, factory, predicates, request guards, errors, and public types |
| `@vielzeug/ward/devtools` | `debugWard()` diagnostic factory                                     |

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
explain(input: WardDecisionInput<TAction, TData>): WardDecision<TAction, TData>;
```

`WardDecisionInput`:

```ts
{
  principal: Principal;
  resource: string;
  action: TAction;
  data?: TData;
}
```

### `trace(input)`

```ts
trace(input: WardDecisionInput<TAction, TData>): WardTrace<TAction, TData>;
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
  principal: Principal;
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
  principal: Principal;
  resource: string;
  data?: TData;
}
```

### `detectConflicts()`

```ts
detectConflicts(): readonly WardConflict<TAction, TData>[];
```

### `forUser(principal)`

```ts
forUser(principal: Principal): BoundWard<TAction, TData>;
```

Returns a principal-bound view.

## `BoundWard` Methods

```ts
interface BoundWard<TAction extends string = string, TData = unknown> {
  checkAll(checks: ReadonlyArray<WardCheck<TAction, TData>>): WardDecisionResult<TAction, TData>[];
  explain(input: BoundWardDecisionInput<TAction, TData>): WardDecision<TAction, TData>;
  trace(input: BoundWardDecisionInput<TAction, TData>): WardTrace<TAction, TData>;
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
  principal: Principal;
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

### `debugWard(rules, options?)`

Sub-path import: `@vielzeug/ward/devtools`.

```ts
import { debugWard } from '@vielzeug/ward/devtools';
```

## Types

```ts
export type Principal = UserPrincipal | null;
export type UserPrincipal = { id: string; roles: readonly string[] };
export type WardRule<TAction extends string = string, TData = unknown> = Readonly<{
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority?: number;
  resource: string | typeof WILDCARD;
  role: string | typeof ANONYMOUS | readonly (string | typeof ANONYMOUS)[];
  when?: WardPredicate<TData>;
}>;
export type WardDecisionInput<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  principal: Principal;
  resource: string;
};
export type BoundWardDecisionInput<TAction extends string = string, TData = unknown> = Omit<
  WardDecisionInput<TAction, TData>,
  'principal'
>;
```

`Ward`, `BoundWard`, `WardDecision`, `WardDecisionResult`, `WardTrace`, `WardTraceCandidate`, `WardConflict`,
`WardOptions`, `WardCheck`, `WardAllowedActionsInput`, `WardRulesInScopeInput`, `RuleContext`,
`WardLoggerContext`, `ConflictKind`, `GuardRequestInput`, `GuardRequestWithInput`, `GuardResult`,
`PrincipalExtractor`, and `WardRequest` are exported from the root entry point.

## Errors

- `WardError` is the base error class; use `WardError.is(value)` for narrowing.
- `WardConfigError` reports malformed rules, principals, and strict conflict initialization.
- `WardPredicateError` reports a throwing synchronous predicate and includes its `ruleIndex` and cause.
