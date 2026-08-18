---
title: Ward — API Reference
description: Complete API reference for @vielzeug/ward.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createWard` | Creates immutable policy | Sync | Rules cannot be mutated after creation |
| `allow` / `deny` / `ruleFor` | Builds policy rules | Sync | Priority wins before specificity |
| `Ward.explain` | Returns one decision | Sync | Pass resource data for predicate rules |
| `Ward.trace` | Inspects decision candidates | Sync | Does not invoke the logger |
| `Ward.forUser` | Binds a principal | Sync | Rebind when identity or roles change |
| `Ward.checkAll` | Batch permission checks | Sync | Pass resource data for predicate rules |
| `Ward.allowedActions` | Filters known actions to allowed set | Sync | Does not invoke the logger |
| `Ward.rulesInScope` | Lists rules matching a principal/resource | Sync | Pass data to evaluate predicates |
| `Ward.detectConflicts` | Detects duplicate/shadowed rules | Sync | O(n²) — use `maxConflicts` for large policies |
| `predicate.owns` / `owns` | Ownership predicate on resource data | Sync | Skipped for anonymous principals |
| `predicate.and` / `or` / `not` | Combine predicates | Sync | All inputs must be synchronous |
| `matchesPattern` / `patternCovers` | Test resource pattern coverage | Sync | `'*'` is the only wildcard |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/ward` | Rules, factory, predicates, pattern helpers, errors, and public types |
| `@vielzeug/ward/devtools` | `debugWard()` diagnostic factory |

## Core Factory

### `createWard(rules, options?)`

```ts
createWard<TAction extends string = string, TData = unknown>(
  rules: readonly (WardRule<TAction, TData> | readonly WardRule<TAction, TData>[])[] = [],
  options?: WardOptions<TAction, TData>,
): Ward<TAction, TData>;
```

Creates an immutable ward instance. `rules` accepts a flat mix of single rules and rule arrays — `allow()`/`deny()`/`ruleFor()` results can be passed directly without spread. Validates `logger`, `onConflict`, and `maxConflicts` options before compiling rules; invalid values throw `WardConfigError`.

**Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `rules` | `readonly (WardRule \| readonly WardRule[])[]` | Rule list. Single rules and rule arrays can be mixed. |
| `options.logger` | `(ctx: WardLoggerContext) => void` | Called for `explain()` and `checkAll()` decisions. |
| `options.onConflict` | `(conflict: WardConflict) => void` | Called synchronously per conflict at creation time. |
| `options.strict` | `boolean` | Throws `WardConfigError` on the first conflict. |
| `options.maxConflicts` | `number` | Caps the number of conflicts returned by `detectConflicts()`. |

**Returns:** `Ward<TAction, TData>` — an immutable policy instance.

**Example:**

```ts
import { allow, createWard, deny, WILDCARD } from '@vielzeug/ward';

const ward = createWard([
  allow('viewer', 'posts', ['read']),
  allow('editor', 'posts', ['update']),
  deny('blocked', WILDCARD, [WILDCARD], { priority: 100 }),
]);
```

---

## Rule Builders

### `allow(role, resource, actions, options?)`

```ts
allow<TAction extends string = string, TData = unknown>(
  role: string | readonly string[],
  resource: string | typeof WILDCARD,
  actions: readonly (TAction | typeof WILDCARD)[],
  options?: { priority?: number; when?: WardPredicate<TData> },
): WardRule<TAction, TData>[];
```

Creates one `WardRule` per action with `effect: 'allow'`. Reads naturally: "allow editor to read/update posts".

**Returns:** `WardRule[]` — one rule per action.

---

### `deny(role, resource, actions, options?)`

```ts
deny<TAction extends string = string, TData = unknown>(
  role: string | readonly string[],
  resource: string | typeof WILDCARD,
  actions: readonly (TAction | typeof WILDCARD)[],
  options?: { priority?: number; when?: WardPredicate<TData> },
): WardRule<TAction, TData>[];
```

Creates one `WardRule` per action with `effect: 'deny'`. Reads naturally: "deny blocked from reading posts".

**Returns:** `WardRule[]` — one rule per action.

---

### `ruleFor(effect, role, resource, actions, options?)`

```ts
ruleFor<TAction extends string = string, TData = unknown>(
  effect: 'allow' | 'deny',
  role: string | readonly string[],
  resource: string | typeof WILDCARD,
  actions: readonly (TAction | typeof WILDCARD)[],
  options?: { priority?: number; when?: WardPredicate<TData> },
): WardRule<TAction, TData>[];
```

Low-level factory. Prefer `allow()` or `deny()` for ergonomic rule authoring.

**Returns:** `WardRule[]` — one rule per action.

---

## Ward Methods

### `checkAll(principal, checks)`

```ts
checkAll(
  principal: Principal,
  checks: readonly WardCheck<TAction, TData>[],
): WardDecisionResult<TAction, TData>[];
```

Evaluates multiple resource/action pairs for one principal. Invokes the logger for each decision.

**Returns:** `WardDecisionResult[]` — each entry carries `action`, `resource`, and the decision.

---

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

Returns one decision. Invokes the logger.

**Returns:** `WardDecision` — `{ allowed: true; rule }` or `{ allowed: false; reason: 'explicit-deny'; rule }` or `{ allowed: false; reason: 'no-matching-rule' }`.

---

### `trace(input)`

```ts
trace(input: WardDecisionInput<TAction, TData>): WardTrace<TAction, TData>;
```

Same request shape as `explain()`. Returns winner + candidate list. Does not fire the logger.

**Returns:** `WardTrace` — `{ candidates: WardTraceCandidate[]; decision: WardDecision }`.

---

### `allowedActions(input)`

```ts
allowedActions(input: WardAllowedActionsInput<TAction, TData>): TAction[];
```

Input shape:

```ts
{
  principal: Principal;
  resource: string;
  knownActions: readonly TAction[];
  data?: TData;
}
```

Filters the provided `knownActions` list to those the principal may perform. Does not invoke the logger.

**Returns:** `TAction[]` — the subset of `knownActions` that `explain()` would allow.

---

### `rulesInScope(input)`

```ts
rulesInScope(input: WardRulesInScopeInput<TData>): ReadonlyArray<Readonly<NormalizedWardRule<TAction, TData>>>;
```

Input shape:

```ts
{
  principal: Principal;
  resource: string;
  data?: TData;
}
```

Lists rules matching the principal/resource pair. Pass `data` to evaluate predicate-gated matches; without it, predicate rules are skipped.

**Returns:** `ReadonlyArray<Readonly<NormalizedWardRule>>` — rules in their normalized form (`role` always array, `priority` always number).

---

### `detectConflicts()`

```ts
detectConflicts(): readonly WardConflict<TAction, TData>[];
```

Lazily computes and caches duplicate/shadowed rule conflicts. O(n²) — use `maxConflicts` for large policies.

**Returns:** `readonly WardConflict[]` — `{ kind: 'duplicate'; indexA; indexB; ruleA; ruleB }` or `{ kind: 'shadowed'; shadowedIndex; shadowedRule; shadowingIndex; shadowingRule }`.

---

### `forUser(principal)`

```ts
forUser(principal: UserPrincipal): BoundWard<TAction, TData>;
```

Returns a principal-bound view. `UserPrincipal` (not nullable — use `null` directly with `explain()` for anonymous).

**Returns:** `BoundWard` — same methods without the `principal` argument.

---

## `BoundWard` Methods

```ts
type BoundWard<TAction extends string = string, TData = unknown> = {
  allowedActions(input: BoundWardAllowedActionsInput<TAction, TData>): TAction[];
  checkAll(checks: readonly WardCheck<TAction, TData>[]): WardDecisionResult<TAction, TData>[];
  explain(input: BoundWardDecisionInput<TAction, TData>): WardDecision<TAction, TData>;
  rulesInScope(input: BoundWardRulesInScopeInput<TData>): ReadonlyArray<Readonly<NormalizedWardRule<TAction, TData>>>;
  trace(input: BoundWardDecisionInput<TAction, TData>): WardTrace<TAction, TData>;
};
```

Bound input shapes remove `principal`:

```ts
{ resource: string; action: TAction; data?: TData }                // explain/trace
{ resource: string; knownActions: readonly TAction[]; data?: TData } // allowedActions
{ resource: string; data?: TData }                                 // rulesInScope
```

---

## Predicate Helpers

### `predicate.owns(attributeKey)`

```ts
predicate.owns<TData = unknown>(
  attributeKey: [keyof TData] extends [never] ? string : keyof TData & string,
): WardPredicate<TData>;
```

Returns a `WardPredicate` that checks whether `data[attributeKey]` matches `principal.id`. Skipped for anonymous principals — pairing `owns` with an `ANONYMOUS`-role rule produces a rule that can never match.

**Returns:** `WardPredicate<TData>`.

---

### `predicate.and(...predicates)`

```ts
predicate.and<TData = unknown>(...preds: WardPredicate<TData>[]): WardPredicate<TData>;
```

All predicates must return `true`.

---

### `predicate.or(...predicates)`

```ts
predicate.or<TData = unknown>(...preds: WardPredicate<TData>[]): WardPredicate<TData>;
```

At least one predicate must return `true`.

---

### `predicate.not(predicate)`

```ts
predicate.not<TData = unknown>(pred: WardPredicate<TData>): WardPredicate<TData>;
```

Inverts the given predicate.

---

### `owns(attributeKey)` (alias)

```ts
owns<TData = unknown>(
  attributeKey: [keyof TData] extends [never] ? string : keyof TData & string,
): WardPredicate<TData>;
```

Top-level re-export of `predicate.owns`.

Predicates run synchronously. Returning a Promise throws `WardPredicateError`.

---

## Pattern Helpers

### `matchesPattern(pattern, value): boolean`

```ts
matchesPattern(pattern: string, value: string): boolean;
```

Tests whether `value` matches a `'*'`-wildcard `pattern`. `'*'` matches any value; an exact string matches only itself.

---

### `patternCovers(broad, narrow): boolean`

```ts
patternCovers(broad: string, narrow: string): boolean;
```

Tests whether the `broad` pattern covers the `narrow` pattern. `'*'` covers everything; an exact string covers only itself.

---

## Devtools

### `debugWard(rules, options?)`

Sub-path import: `@vielzeug/ward/devtools`.

```ts
import { debugWard } from '@vielzeug/ward/devtools';
```

Diagnostic factory for development inspection.

---

## Types

```ts
export type UserPrincipal = {
  attributes?: Record<string, unknown>;
  id: string;
  roles: readonly string[];
};

export type Principal = UserPrincipal | null;

export type RuleContext<TData = unknown> = {
  data?: TData;
  principal: UserPrincipal;
};

export type WardPredicate<TData = unknown> = (ctx: RuleContext<TData>) => boolean;

export type WardRule<TAction extends string = string, TData = unknown> = {
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority?: number;
  resource: string | typeof WILDCARD;
  role: string | readonly string[];
  when?: WardPredicate<TData>;
};

export type NormalizedWardRule<TAction extends string = string, TData = unknown> = Readonly<{
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority: number;
  resource: string | typeof WILDCARD;
  role: readonly string[];
  when?: WardPredicate<TData>;
}>;

export type WardDecision<TAction extends string = string, TData = unknown> =
  | { allowed: true; rule: Readonly<NormalizedWardRule<TAction, TData>> }
  | { allowed: false; reason: 'explicit-deny'; rule: Readonly<NormalizedWardRule<TAction, TData>> }
  | { allowed: false; reason: 'no-matching-rule' };

export type WardCheck<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  resource: string;
};

export type WardDecisionResult<TAction extends string = string, TData = unknown> = WardDecision<TAction, TData> & {
  action: TAction;
  resource: string;
};

export type WardDecisionInput<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  principal: Principal;
  resource: string;
};

export type WardAllowedActionsInput<TAction extends string = string, TData = unknown> = {
  data?: TData;
  knownActions: readonly TAction[];
  principal: Principal;
  resource: string;
};

export type WardRulesInScopeInput<TData = unknown> = {
  data?: TData;
  principal: Principal;
  resource: string;
};

export type BoundWardDecisionInput<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  resource: string;
};

export type BoundWardAllowedActionsInput<TAction extends string = string, TData = unknown> = {
  data?: TData;
  knownActions: readonly TAction[];
  resource: string;
};

export type BoundWardRulesInScopeInput<TData = unknown> = {
  data?: TData;
  resource: string;
};

export type ConflictKind = 'duplicate' | 'shadowed';

export type WardConflict<TAction extends string = string, TData = unknown> =
  | {
      indexA: number;
      indexB: number;
      kind: 'duplicate';
      ruleA: Readonly<NormalizedWardRule<TAction, TData>>;
      ruleB: Readonly<NormalizedWardRule<TAction, TData>>;
    }
  | {
      kind: 'shadowed';
      shadowedIndex: number;
      shadowedRule: Readonly<NormalizedWardRule<TAction, TData>>;
      shadowingIndex: number;
      shadowingRule: Readonly<NormalizedWardRule<TAction, TData>>;
    };

export type WardTraceCandidate<TAction extends string = string, TData = unknown> = {
  index: number;
  priority: number;
  rule: Readonly<NormalizedWardRule<TAction, TData>>;
  score: number;
  won: boolean;
};

export type WardTrace<TAction extends string = string, TData = unknown> = {
  candidates: WardTraceCandidate<TAction, TData>[];
  decision: WardDecision<TAction, TData>;
};

export type Ward<TAction extends string = string, TData = unknown> = {
  allowedActions(input: WardAllowedActionsInput<TAction, TData>): TAction[];
  checkAll(principal: Principal, checks: readonly WardCheck<TAction, TData>[]): WardDecisionResult<TAction, TData>[];
  detectConflicts(): readonly WardConflict<TAction, TData>[];
  explain(input: WardDecisionInput<TAction, TData>): WardDecision<TAction, TData>;
  forUser(principal: UserPrincipal): BoundWard<TAction, TData>;
  rulesInScope(input: WardRulesInScopeInput<TData>): ReadonlyArray<Readonly<NormalizedWardRule<TAction, TData>>>;
  trace(input: WardDecisionInput<TAction, TData>): WardTrace<TAction, TData>;
};

export type BoundWard<TAction extends string = string, TData = unknown> = {
  allowedActions(input: BoundWardAllowedActionsInput<TAction, TData>): TAction[];
  checkAll(checks: readonly WardCheck<TAction, TData>[]): WardDecisionResult<TAction, TData>[];
  explain(input: BoundWardDecisionInput<TAction, TData>): WardDecision<TAction, TData>;
  rulesInScope(input: BoundWardRulesInScopeInput<TData>): ReadonlyArray<Readonly<NormalizedWardRule<TAction, TData>>>;
  trace(input: BoundWardDecisionInput<TAction, TData>): WardTrace<TAction, TData>;
};

export type WardLoggerContext<TAction extends string = string, TData = unknown> = WardDecision<TAction, TData> & {
  action: TAction;
  data?: TData;
  principal: Principal;
  resource: string;
};

export type WardOptions<TAction extends string = string, TData = unknown> = {
  logger?: (context: WardLoggerContext<TAction, TData>) => void;
  maxConflicts?: number;
  onConflict?: (conflict: WardConflict<TAction, TData>) => void;
  strict?: boolean;
};
```

`WardDecision`, `WardDecisionResult`, `WardTrace`, `WardTraceCandidate`, and `WardConflict` reference `NormalizedWardRule` (always-array `role`, always-number `priority`).

`Ward`, `BoundWard`, `WardDecision`, `WardDecisionResult`, `WardTrace`, `WardTraceCandidate`, `WardConflict`,
`NormalizedWardRule`, `WardOptions`, `WardCheck`, `WardAllowedActionsInput`, `WardRulesInScopeInput`, `RuleContext`,
`WardLoggerContext`, `WardPredicate`, and `ConflictKind` are exported from the root entry point.

## Errors

- `WardError` is the base error class; use `WardError.is(value)` for narrowing.
- `WardConfigError` reports malformed rules, invalid `createWard` options (`logger`, `onConflict`, `maxConflicts`), invalid principals, and strict conflict initialization.
- `WardPredicateError` reports a throwing synchronous predicate and includes its `ruleIndex` and cause.
