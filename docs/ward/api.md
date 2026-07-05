---
title: Ward — API Reference
description: Complete API reference for @vielzeug/ward.
---

[[toc]]

## API Overview

| Symbol                                                                   | Purpose                                              | Execution | Common gotcha                                                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------------- | --------- | ------------------------------------------------------------------------------------ |
| `createWard(rules, options?)`                                            | Create an immutable ward instance                    | Sync      | Rules cannot be mutated after creation                                               |
| `allow(role, resource, actions, options?)`                               | Create allow rules — returns `WardRule[]`            | Sync      | Spread into `createWard([ ...allow(...) ])` — returns an array                       |
| `deny(role, resource, actions, options?)`                                | Create deny rules — returns `WardRule[]`             | Sync      | Same spreading pattern as `allow`                                                    |
| `ruleFor(effect, role, resource, actions, options?)`                     | Low-level rule factory (effect as first arg)         | Sync      | Prefer `allow`/`deny` for readability                                                |
| `predicate.owns(attributeKey)`                                           | Ownership predicate — `data[key] === principal.id`   | Sync      | Returns `false` when `data` is absent, not an object, or key not an own property     |
| `predicate.and(...preds)`                                                | Combine predicates with AND                          | Sync      | Zero arguments → always returns `true` (vacuously)                                   |
| `predicate.or(...preds)`                                                 | Combine predicates with OR                           | Sync      | Zero arguments → always returns `false`                                              |
| `predicate.not(pred)`                                                    | Invert a predicate                                   | Sync      | —                                                                                    |
| `owns(attributeKey)`                                                     | Top-level alias for `predicate.owns`                 | Sync      | Prefer `predicate.owns` when using other `predicate.*` helpers                       |
| `matchesPattern(pattern, value)`                                         | Test a pattern against a concrete string             | Sync      | Works for both resources and actions (namespace wildcards)                           |
| `patternCovers(broad, narrow)`                                           | Test whether one pattern statically covers another   | Sync      | Used by `detectConflicts`; exported for custom tooling                               |
| `ward.checkAll(principal, checks)`                                       | Evaluate multiple decisions in one call              | Sync      | Returns `WardDecisionResult[]` — each entry includes originating `resource`+`action` |
| `ward.explain(principal, resource, action, data?)`                       | Full decision object with deny reason                | Sync      | `rule` only present on `'allow'` and `'explicit-deny'` variants; fires logger        |
| `ward.trace(principal, resource, action, data?)`                         | Decision trace with all matching candidates          | Sync      | **Does not fire the logger** — use `explain` when logger output is needed            |
| `ward.allowedActions(principal, resource, knownActions, data?)`          | List allowed actions; no logger                      | Sync      | Wildcard-action rules require a non-empty `knownActions`                             |
| `ward.rulesInScope(principal, resource, data?)`                          | Rules in scope for introspection; no logger          | Sync      | Without `data`, predicate rules appear unfiltered                                    |
| `ward.detectConflicts()`                                                 | Lazily detect and cache policy conflicts             | Sync      | O(n²); predicate-gated rules excluded from static analysis                           |
| `ward.forUser(principal)`                                                | Create a principal-bound ward view                   | Sync      | Principal is deep-snapshotted at bind time                                           |
| `guardRequest(ward, principal, resource, action, data?)`                 | Framework-agnostic sync guard — direct principal     | Sync      | Use `guardRequestWith` when the principal must be extracted from a request object    |
| `guardRequestWith(ward, req, extractPrincipal, resource, action, data?)` | Framework-agnostic async guard — request + extractor | Async     | Extractor may be async (e.g. JWT verification)                                       |

## Package Entry Points

| Import                    | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `@vielzeug/ward`          | Main exports and types                   |
| `@vielzeug/ward/devtools` | `debugWard` — decision logger (dev only) |

## Constants

- `WILDCARD = '*'`
- `ANONYMOUS = 'anonymous'`

`WILDCARD` can be used as role, resource, or action.

## WardRule Fields

| Field      | Type                          | Required                                   | Description                                                                                                                                                                                                 |
| ---------- | ----------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`     | `string \| readonly string[]` | <ore-icon name="check" size="16"></ore-icon> | One role or an array of roles. A rule matches if the principal holds **any** of the listed roles (OR semantics). Use `WILDCARD` for all authenticated principals, `ANONYMOUS` for unauthenticated requests. |
| `resource` | `string`                      | <ore-icon name="check" size="16"></ore-icon> | Resource identifier. Use `WILDCARD` to match any resource.                                                                                                                                                  |
| `action`   | `string`                      | <ore-icon name="check" size="16"></ore-icon> | Action identifier. Use `WILDCARD` to match any action.                                                                                                                                                      |
| `effect`   | `'allow' \| 'deny'`           | <ore-icon name="check" size="16"></ore-icon> | Whether the rule grants or denies access.                                                                                                                                                                   |
| `priority` | `number`                      | —                                          | Higher value wins. Optional when authoring a rule (defaults to `0`); always present on rules returned from decisions/trace/conflicts. Must be a finite number.                                              |
| `when`     | `WardPredicate<TData>`        | —                                          | Runtime predicate evaluated only for authenticated principals.                                                                                                                                              |

### Multi-Role Rules

When `role` is an array, the rule matches if the principal holds **any** of the listed roles. This lets you consolidate rules that share identical permissions across several roles:

```ts
// Instead of three separate allow rules, write one:
const ward = createWard([
  { role: ['viewer', 'editor', 'admin'], resource: 'posts', action: 'read', effect: 'allow' },
  { role: ['editor', 'admin'], resource: 'posts', action: 'update', effect: 'allow' },
  { role: 'admin', resource: 'posts', action: 'delete', effect: 'allow' },
]);
```

`ANONYMOUS` works inside multi-role arrays too:

```ts
// Allows both unauthenticated visitors and authenticated viewers to read
{ role: [ANONYMOUS, 'viewer'], resource: 'posts', action: 'read', effect: 'allow' }
```

For specificity scoring, a multi-role rule is treated as specific (score 1) unless the array contains `WILDCARD`.

## Core Functions

### `createWard()`

```ts
createWard<TAction extends string = string, TData = unknown>(
  rules?: readonly WardRule<TAction, TData>[],
  options?: WardOptions<TAction, TData>,
): Ward<TAction, TData>
```

Creates an immutable ward instance with the given rules. All rules are compiled once at creation time — pass a new array to update the policy.

**Parameters — `WardOptions`:**

| Option         | Type                                   | Default     | Description                                                                                                              |
| -------------- | -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `logger`       | `(context: WardLoggerContext) => void` | `undefined` | Called after every decision method (`explain`, `checkAll`, `trace`). Not called by `allowedActions` or `rulesInScope`. |
| `onConflict`   | `(conflict: WardConflict) => void`     | `undefined` | Called synchronously for each conflict detected at creation time.                                                        |
| `strict`       | `boolean`                              | `false`     | Throws immediately if any rule conflicts are detected.                                                                   |
| `maxConflicts` | `number`                               | `Infinity`  | Caps the number of conflicts returned by `detectConflicts()`. Set to `0` to disable conflict detection entirely.         |

**Winner selection** when multiple rules match:

1. Higher `priority` wins.
2. On priority tie, higher specificity wins (`exact > ns:* > *`, applied independently to role, resource, and action).
3. On specificity tie, `deny` beats `allow`.
4. On absolute tie (identical priority, specificity, and effect), the rule declared **first in the array** wins.

**Returns:** `Ward<TAction, TData>`

**Example:**

```ts
import { createWard, owns } from '@vielzeug/ward';

const ward = createWard<'read' | 'update', { authorId: string }>([
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow', when: owns('authorId') },
]);
```

## Ward Methods

### `checkAll()`

```ts
ward.checkAll(
  principal: Principal,
  checks: readonly WardCheck<TAction, TData>[],
): WardDecisionResult<TAction, TData>[]
```

Evaluates each check independently and returns one `WardDecisionResult` per entry in the same order. Each result includes the originating `resource` and `action` fields, so callers do not need to zip the input array by index. Returns `[]` for an empty array without validating the principal.

**Returns:** `WardDecisionResult<TAction, TData>[]`

**Example:**

```ts
const decisions = ward.checkAll({ id: 'u1', roles: ['editor'] }, [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'update', data: { authorId: 'u1' } },
]);
```

---

### `allowedActions()`

```ts
ward.allowedActions(
  principal: Principal,
  resource: string,
  knownActions: readonly TAction[],
  data?: TData,
): TAction[]
```

Returns the subset of `knownActions` that the principal is currently allowed to perform on `resource`. Evaluates wildcard-action rules against each entry in `knownActions`. Deduplicates the input list.

::: tip Side-effect-free
`allowedActions` does **not** invoke the logger. Use `checkAll` if you need an auditable batch decision.
:::

**Returns:** `TAction[]`

**Example:**

```ts
// Resolves wildcard-action rules against the provided list
const actions = ward.allowedActions({ id: 'u1', roles: ['editor'] }, 'posts', ['read', 'update', 'delete']);

// With runtime data for predicate-gated rules
const owned = ward.allowedActions({ id: 'u1', roles: ['editor'] }, 'posts', ['read', 'update', 'delete'], {
  authorId: 'u1',
});
```

---

### `explain()`

```ts
ward.explain(
  principal: Principal,
  resource: string,
  action: TAction,
  data?: TData,
): WardDecision<TAction, TData>
```

Returns a full decision object including the winning rule (for allow and explicit deny). The returned `rule` object is **frozen** — mutations throw `TypeError`. Uses `'rule' in decision` to safely narrow across all three variants.

**Returns:** `WardDecision<TAction, TData>`

**Example:**

```ts
const decision = ward.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'delete');

if (!decision.allowed) {
  console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'
  if (decision.reason === 'explicit-deny') {
    console.log(decision.rule.effect); // safe — rule is present
  }
}
```

---

### `trace()`

```ts
ward.trace(
  principal: Principal,
  resource: string,
  action: TAction,
  data?: TData,
): WardTrace<TAction, TData>
```

Returns the complete decision trace: every rule that matched before the winner was selected, plus the final `WardDecision`. Each candidate exposes `priority`, `score`, `rule`, and a `won` flag.

::: tip Audit-safe
`trace()` fires the logger with the same context as `explain()`. Switching from `explain` to `trace` for richer diagnostics does not silently drop audit records.
:::

**Returns:** `WardTrace<TAction, TData>`

**Example:**

```ts
const { decision, candidates } = ward.trace({ id: 'u1', roles: ['editor'] }, 'posts', 'read');

candidates.forEach(({ rule, priority, score, won }) => {
  console.log(rule.effect, priority, score, won ? '← winner' : '');
});
```

---

### `rulesInScope()`

```ts
ward.rulesInScope(
  principal: Principal,
  resource: string,
  data?: TData,
): ReadonlyArray<Readonly<WardRule<TAction, TData>>>
```

Returns all rules matching the principal/resource combination regardless of action. When `data` is provided, predicate rules are also evaluated and excluded if they do not match. Without `data`, predicate-gated rules appear unfiltered. Does not invoke the logger.

**Returns:** `ReadonlyArray<Readonly<WardRule<TAction, TData>>>`

**Example:**

```ts
const rules = ward.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts');
const narrowed = ward.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' });
```

---

### `detectConflicts()`

```ts
ward.detectConflicts(): WardConflict<TAction, TData>[]
```

Returns all rule conflicts in the policy. Lazily computed and cached — every call after the first returns the same array reference. O(n²) in the number of rules.

Two conflict kinds, narrowable by `kind`:

- **`'duplicate'`** — two predicate-free rules share the same (role set, resource, action). Fields: `ruleA`/`indexA` (first-declared, wins) and `ruleB`/`indexB` (unreachable).
- **`'shadowed'`** — a higher-ranked predicate-free rule covers the narrower rule's patterns entirely. Fields: `shadowingRule`/`shadowingIndex` (always wins) and `shadowedRule`/`shadowedIndex` (can never win).

Rules with a `when` predicate are excluded from both checks — their applicability can only be determined at runtime.

**Returns:** `WardConflict<TAction, TData>[]`

**Example:**

```ts
const conflicts = ward.detectConflicts();

conflicts.forEach((c) => {
  if (c.kind === 'duplicate') {
    console.warn(`Rule[${c.indexB}] is an unreachable duplicate of Rule[${c.indexA}]`);
  } else {
    console.warn(`Rule[${c.shadowedIndex}] is shadowed by Rule[${c.shadowingIndex}]`);
  }
});
```

---

### `forUser()`

```ts
ward.forUser(principal: UserPrincipal): BoundWard<TAction, TData>
```

Creates a principal-bound view of the ward. The principal — including nested `attributes` — is deep-snapshotted at call time; subsequent mutations to the original object have no effect on the bound view.

**Returns:** `BoundWard<TAction, TData>`

**Methods on `BoundWard`:**

| Method           | Signature                                      | Description                    |
| ---------------- | ---------------------------------------------- | ------------------------------ |
| `checkAll`       | `(checks) => WardDecisionResult[]`             | Batch decisions                |
| `allowedActions` | `(resource, knownActions, data?) => TAction[]` | Action enumeration (no logger) |
| `explain`        | `(resource, action, data?) => WardDecision`    | Full decision with reason      |
| `rulesInScope`   | `(resource, data?) => ReadonlyArray<Readonly<WardRule>>` | Rule introspection (no logger) |
| `trace`          | `(resource, action, data?) => WardTrace`       | Decision trace (does not fire the logger) |

**Example:**

```ts
const bound = ward.forUser({ id: 'u1', roles: ['editor'] });

bound.explain('posts', 'read').allowed;
bound.checkAll([
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'update', data: { authorId: 'u1' } },
]);
bound.allowedActions('posts', ['read', 'update', 'delete']);
bound.allowedActions('posts', ['read', 'update', 'delete'], { authorId: 'u1' });
bound.explain('posts', 'delete');
bound.trace('posts', 'read');
bound.rulesInScope('posts');
```

## Helper Functions

### `allow()` / `deny()`

```ts
allow<TAction extends string = string, TData = unknown>(
  role: string | readonly string[],
  resource: string | typeof WILDCARD,
  actions: readonly (TAction | typeof WILDCARD)[],
  options?: { priority?: number; when?: WardPredicate<TData> },
): WardRule<TAction, TData>[]

deny<TAction extends string = string, TData = unknown>(
  role: string | readonly string[],
  resource: string | typeof WILDCARD,
  actions: readonly (TAction | typeof WILDCARD)[],
  options?: { priority?: number; when?: WardPredicate<TData> },
): WardRule<TAction, TData>[]
```

Ergonomic rule factories — one `WardRule` per action, with `effect` fixed to `'allow'` or `'deny'`. Spread the result into the array passed to `createWard`.

**Returns:** `WardRule<TAction, TData>[]`

**Example:**

```ts
import { WILDCARD, allow, createWard, deny, owns } from '@vielzeug/ward';

const ward = createWard<'read' | 'update', { authorId: string }>([
  ...allow(['viewer', 'editor'], 'posts', ['read']),
  ...allow('editor', 'posts', ['update'], { when: owns('authorId'), priority: 5 }),
  ...deny('blocked', WILDCARD, [WILDCARD], { priority: 100 }),
]);
```

---

### `ruleFor()`

```ts
ruleFor<TAction extends string = string, TData = unknown>(
  effect: 'allow' | 'deny',
  role: string | readonly string[],
  resource: string | typeof WILDCARD,
  actions: readonly (TAction | typeof WILDCARD)[],
  options?: { priority?: number; when?: WardPredicate<TData> },
): WardRule<TAction, TData>[]
```

Low-level rule factory with `effect` as the first argument. `allow()` and `deny()` are thin wrappers over `ruleFor()` — prefer them for readability; use `ruleFor()` when the effect is only known dynamically.

**Returns:** `WardRule<TAction, TData>[]`

**Example:**

```ts
import { ruleFor } from '@vielzeug/ward';

ruleFor('allow', 'viewer', 'posts', ['read', 'update']);
ruleFor('deny', ['blocked', 'suspended'], WILDCARD, [WILDCARD], { priority: 100 });
```

---

### `owns()` / `predicate`

```ts
owns<TData = unknown>(attributeKey: keyof TData & string): WardPredicate<TData>

const predicate: {
  and<TData = unknown>(...preds: WardPredicate<TData>[]): WardPredicate<TData>;
  not<TData = unknown>(pred: WardPredicate<TData>): WardPredicate<TData>;
  or<TData = unknown>(...preds: WardPredicate<TData>[]): WardPredicate<TData>;
  owns<TData = unknown>(attributeKey: keyof TData & string): WardPredicate<TData>;
};
```

`owns()` returns a predicate that allows the action when `principal.id === data[attributeKey]`. Returns `false` when `data` is absent, not an object, or the attribute is not an own property (guards against prototype-inherited values). `predicate.owns` is the same function, grouped under the `predicate` namespace alongside the combinators:

- `predicate.and(...preds)` — all predicates must return `true`. Zero arguments → `true` (vacuously).
- `predicate.or(...preds)` — at least one predicate must return `true`. Zero arguments → `false`.
- `predicate.not(pred)` — inverts a predicate.

::: warning ANONYMOUS
`owns()` (and any `when` predicate) must only be used with rules that require authentication (non-`ANONYMOUS` role). Predicates are skipped for unauthenticated requests — pairing `owns` with `ANONYMOUS` produces a rule that can never match.
:::

**Example:**

```ts
import { allow, predicate } from '@vielzeug/ward';

allow('editor', 'posts:*', ['update'], { when: predicate.owns('authorId') });
allow('user', 'posts:*', ['read'], { when: predicate.and(predicate.owns('authorId'), isBusinessHours) });
```

---

### `matchesPattern()`

```ts
matchesPattern(pattern: string, value: string): boolean
```

Tests whether a pattern matches a concrete value string. Works for both resource patterns and action patterns.

**Pattern semantics:**

| Pattern     | Matches                                                              |
| ----------- | -------------------------------------------------------------------- |
| `*`         | Any value                                                            |
| `posts`     | Exactly `posts`                                                      |
| `posts:*`   | Any value starting with `posts:` (e.g. `posts:123`, `posts:draft:1`) |
| `posts:123` | Exactly `posts:123`                                                  |
| `read:*`    | Any action starting with `read:` (e.g. `read:own`, `read:all`)       |

**Example:**

```ts
import { matchesPattern } from '@vielzeug/ward';

matchesPattern('posts:*', 'posts:123'); // true
matchesPattern('posts:*', 'comments:1'); // false
matchesPattern('read:*', 'read:own'); // true
```

---

### `patternCovers()`

```ts
patternCovers(broad: string, narrow: string): boolean
```

Returns `true` if every concrete value matching `narrow` also matches `broad`. This is the static coverage relation used by `detectConflicts`. Exported for custom policy analysis tooling.

**Example:**

```ts
import { patternCovers } from '@vielzeug/ward';

patternCovers('*', 'posts:*'); // true
patternCovers('posts:*', 'posts:123'); // true
patternCovers('posts:*', '*'); // false
patternCovers('posts', 'posts:*'); // false
```

---

### Middleware Factories

#### `guardRequest()`

```ts
guardRequest<TAction, TData>(
  ward: Ward<TAction, TData>,
  principal: Principal,
  resource: string,
  action: TAction,
  data?: TData,
): GuardResult<TAction, TData>
```

Framework-agnostic synchronous guard for a known principal. Returns a `GuardResult`:

```ts
type GuardResult =
  | { granted: true; principal: Principal }
  | { granted: false; decision: WardDecision; principal: Principal; reason: 'explicit-deny' | 'no-matching-rule' };
```

Use `guardRequestWith` when the principal must be resolved asynchronously from a request object.

**Example:**

```ts
import { guardRequest } from '@vielzeug/ward';

const result = guardRequest(ward, principal, 'posts', 'update');

if (!result.granted) {
  return response.status(403).json({ reason: result.reason });
}
```

---

#### `guardRequestWith()`

```ts
guardRequestWith<TAction, TData, TReq>(
  ward: Ward<TAction, TData>,
  req: TReq,
  extractPrincipal: (req: TReq) => Principal | Promise<Principal>,
  resource: string,
  action: TAction,
  data?: TData,
): Promise<GuardResult<TAction, TData>>
```

Framework-agnostic async guard that first extracts the principal from a request object. The extractor may be async (e.g. to verify a JWT). Use `guardRequest` when the principal is already resolved.

**Example:**

```ts
import { guardRequestWith } from '@vielzeug/ward';

const result = await guardRequestWith(ward, req, (req) => req.user ?? null, 'posts', 'update');

if (!result.granted) {
  return response.status(403).json({ reason: result.reason });
}
```

## Types

### `UserPrincipal`

```ts
type UserPrincipal = {
  id: string;
  roles: readonly string[];
  attributes?: Record<string, unknown>;
};
```

### `Principal`

```ts
type Principal = UserPrincipal | null;
```

`null` represents an unauthenticated (anonymous) user.

### `RuleContext`

```ts
type RuleContext<TData = unknown> = {
  principal: UserPrincipal;
  data?: TData;
};
```

### `WardPredicate`

```ts
type WardPredicate<TData = unknown> = (ctx: RuleContext<TData>) => boolean;
```

### `WardRule`

The single rule shape — used both when authoring rules passed to `createWard` and when reading rules back from decisions, `trace()`, `rulesInScope()`, and `detectConflicts()`.

```ts
type WardRule<TAction extends string = string, TData = unknown> = {
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority?: number; // defaults to 0
  resource: string | typeof WILDCARD;
  role: string | readonly string[];
  when?: WardPredicate<TData>;
};
```

Internally, `createWard` normalizes each rule at compile time — `role` becomes a deduplicated `readonly string[]` and `priority` defaults to `0` — and freezes the result. Rules read back from `explain()`, `trace()`, `rulesInScope()`, or `detectConflicts()` are these normalized, frozen objects (`Readonly<WardRule<TAction, TData>>`); mutating them throws `TypeError`.

### `WardDecision`

Three distinct variants — use discriminated narrowing:

```ts
type WardDecision<TAction extends string = string, TData = unknown> =
  | { allowed: true; rule: WardRule<TAction, TData> }
  | { allowed: false; reason: 'explicit-deny'; rule: WardRule<TAction, TData> }
  | { allowed: false; reason: 'no-matching-rule' }; // no rule field
```

```ts
const d = ward.explain(principal, 'posts', 'delete');

if (d.allowed) {
  console.log(d.rule.effect); // 'allow'
} else if (d.reason === 'explicit-deny') {
  console.log(d.rule.effect); // 'deny'
} else {
  // d.reason === 'no-matching-rule' — no rule field present
}

// Generic narrowing:
if ('rule' in d) console.log(d.rule);
```

### `WardCheck`

```ts
type WardCheck<TAction extends string = string, TData = unknown> = {
  resource: string;
  action: TAction;
  data?: TData;
};
```

### `WardLoggerContext`

Structurally identical to `WardDecision` plus the request fields — narrow `rule` with the same `if (ctx.allowed)` pattern used for decisions:

```ts
type WardLoggerContext<TAction extends string = string, TData = unknown> = WardDecision<TAction, TData> & {
  action: TAction;
  data?: TData;
  principal: Principal;
  resource: string;
};
```

```ts
logger: (ctx) => {
  if (ctx.allowed) {
    console.log(ctx.rule.role); // no ?. needed — 'allowed: true' always carries a rule
  } else if (ctx.reason === 'explicit-deny') {
    console.log(ctx.rule.role); // 'explicit-deny' also carries a rule
  }
},
```

### `WardOptions`

```ts
type WardOptions<TAction extends string = string, TData = unknown> = {
  logger?: (context: WardLoggerContext<TAction, TData>) => void;
  onConflict?: (conflict: WardConflict<TAction, TData>) => void;
  strict?: boolean;
  maxConflicts?: number;
};
```

### `ConflictKind` / `WardConflict`

`WardConflict` is a discriminated union, narrowable by `kind`:

```ts
type ConflictKind = 'duplicate' | 'shadowed';

type WardConflict<TAction extends string = string, TData = unknown> =
  | {
      kind: 'duplicate';
      indexA: number; // first-declared rule (always wins)
      indexB: number; // second-declared rule (unreachable)
      ruleA: Readonly<WardRule<TAction, TData>>;
      ruleB: Readonly<WardRule<TAction, TData>>;
    }
  | {
      kind: 'shadowed';
      shadowedIndex: number; // the rule that can never win
      shadowedRule: Readonly<WardRule<TAction, TData>>;
      shadowingIndex: number; // the rule that always wins instead
      shadowingRule: Readonly<WardRule<TAction, TData>>;
    };
```

### `WardTrace` / `WardTraceCandidate`

```ts
type WardTraceCandidate<TAction extends string = string, TData = unknown> = {
  index: number; // original index in the input array passed to createWard
  priority: number;
  rule: Readonly<WardRule<TAction, TData>>;
  score: number;
  won: boolean;
};

type WardTrace<TAction extends string = string, TData = unknown> = {
  candidates: WardTraceCandidate<TAction, TData>[];
  decision: WardDecision<TAction, TData>;
};
```

## `debugWard(rules, options?)` <Badge type="tip" text="@vielzeug/ward/devtools" />

```ts
import { debugWard } from '@vielzeug/ward/devtools';

const permit = debugWard(rules);

permit.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');
// [ward:decision] allow             (allow)   viewer  posts  read

permit.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete');
// [ward:decision] no-matching-rule            viewer  posts  delete
```

Wraps `createWard()` with a `logger` pre-wired to `console.debug`. Returns the same `Ward` instance — all methods are identical to `createWard()`. Debug output fires on `explain()` and `checkAll()`; `trace()` never fires the logger (by design — see `trace()` above).

Import from the dedicated sub-path so the `console.debug` reference is tree-shaken from production bundles when not imported.

Accepts the same `options` as `createWard()` except `logger`, which is reserved for the debug output. All other options (`maxConflicts`, `onConflict`, `strict`) pass through unchanged.

### `WardDecisionResult`

```ts
type WardDecisionResult<TAction extends string = string, TData = unknown> = WardDecision<TAction, TData> & {
  action: TAction;
  resource: string;
};
```

The return type of `checkAll()` — a `WardDecision` with the originating `resource` and `action` attached, so callers do not need to zip the result by index.

### `WardRequest`

```ts
type WardRequest = Record<string, unknown>;
```

Base constraint for the request object type used in `guardRequestWith`. Any object type satisfies this constraint.

### `Ward` / `BoundWard`

`Ward` is returned by `createWard()`. `BoundWard` is returned by `ward.forUser()` and omits `forUser` and `detectConflicts`. Full method signatures are documented in the sections above.
