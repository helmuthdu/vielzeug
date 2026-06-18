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
| `role`     | `string \| readonly string[]` | <sg-icon name="check" size="16"></sg-icon> | One role or an array of roles. A rule matches if the principal holds **any** of the listed roles (OR semantics). Use `WILDCARD` for all authenticated principals, `ANONYMOUS` for unauthenticated requests. |
| `resource` | `string`                      | <sg-icon name="check" size="16"></sg-icon> | Resource identifier. Use `WILDCARD` to match any resource.                                                                                                                                                  |
| `action`   | `string`                      | <sg-icon name="check" size="16"></sg-icon> | Action identifier. Use `WILDCARD` to match any action.                                                                                                                                                      |
| `effect`   | `'allow' \| 'deny'`           | <sg-icon name="check" size="16"></sg-icon> | Whether the rule grants or denies access.                                                                                                                                                                   |
| `priority` | `number`                      | —                                          | Higher value wins. Optional in `WardRuleInput` (defaults to `0`); always a `number` on `WardRule`. Must be a finite number.                                                                                 |
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
  rules?: readonly WardRuleInput<TAction, TData>[],
  options?: WardOptions<TAction, TData>,
): Ward<TAction, TData>
```

Creates an immutable ward instance with the given rules. All rules are compiled once at creation time — pass a new array to update the policy.

**Parameters — `WardOptions`:**

| Option         | Type                                   | Default     | Description                                                                                                              |
| -------------- | -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `logger`       | `(context: WardLoggerContext) => void` | `undefined` | Called after every decision method (`can`, `checkAll`, `trace`, etc.). Not called by `allowedActions` or `rulesInScope`. |
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

### `can()`

```ts
ward.can(principal: Principal, resource: string, action: TAction, data?: TData): boolean
```

Returns `true` if the principal is allowed to perform `action` on `resource`.

**Returns:** `boolean`

**Example:**

```ts
ward.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read');
ward.can(null, 'posts', 'read'); // anonymous check
```

---

### `canAll()`

```ts
ward.canAll(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean
```

Returns `true` only if every action in `actions` is allowed. Returns `true` for an empty array without validating the principal.

**Returns:** `boolean`

**Example:**

```ts
ward.canAll({ id: 'u1', roles: ['editor'] }, 'posts', ['read', 'update'], { authorId: 'u1' });
```

---

### `canAny()`

```ts
ward.canAny(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean
```

Returns `true` if at least one action in `actions` is allowed. Returns `false` for an empty array without validating the principal.

**Returns:** `boolean`

**Example:**

```ts
ward.canAny({ id: 'u1', roles: ['editor'] }, 'posts', ['update', 'delete'], { authorId: 'u1' });
```

---

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
): WardRule<TAction, TData>[]
```

Returns all rules matching the principal/resource combination regardless of action. When `data` is provided, predicate rules are also evaluated and excluded if they do not match. Without `data`, predicate-gated rules appear unfiltered. Does not invoke the logger.

**Returns:** `WardRule<TAction, TData>[]`

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

Returns all rule conflicts in the policy. Lazily computed and cached after the first call. O(n²) in the number of rules.

Two conflict kinds:

- **`'duplicate'`** — two predicate-free rules share the same (role set, resource, action). The second can never fire.
- **`'shadowed'`** — a higher-ranked predicate-free rule covers the narrower rule's patterns entirely. The narrower rule can never win.

Rules with a `when` predicate are excluded from both checks.

**Returns:** `WardConflict<TAction, TData>[]`

**Example:**

```ts
const conflicts = ward.detectConflicts();

conflicts.forEach(({ kind, ruleIndex, shadowedByIndex }) => {
  console.warn(`Rule[${ruleIndex}] is ${kind} by Rule[${shadowedByIndex}]`);
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
| `can`            | `(resource, action, data?) => boolean`         | Single action check            |
| `canAll`         | `(resource, actions, data?) => boolean`        | All-actions check              |
| `canAny`         | `(resource, actions, data?) => boolean`        | Any-action check               |
| `checkAll`       | `(checks) => WardDecisionResult[]`             | Batch decisions                |
| `allowedActions` | `(resource, knownActions, data?) => TAction[]` | Action enumeration (no logger) |
| `explain`        | `(resource, action, data?) => WardDecision`    | Full decision with reason      |
| `rulesInScope`   | `(resource, data?) => WardRule[]`              | Rule introspection (no logger) |
| `trace`          | `(resource, action, data?) => WardTrace`       | Decision trace (fires logger)  |

**Example:**

```ts
const bound = ward.forUser({ id: 'u1', roles: ['editor'] });

bound.can('posts', 'read');
bound.canAll('posts', ['read', 'update'], { authorId: 'u1' });
bound.allowedActions('posts', ['read', 'update', 'delete']);
bound.allowedActions('posts', ['read', 'update', 'delete'], { authorId: 'u1' });
bound.explain('posts', 'delete');
bound.trace('posts', 'read');
bound.rulesInScope('posts');
```

## Helper Functions

### `owns()`

```ts
owns<TData = unknown>(attributeKey: keyof TData & string): WardPredicate<TData>
```

Returns a predicate that allows the action when `principal.id === data[attributeKey]`. Returns `false` when `data` is absent, not an object, or the attribute value does not match.

::: warning ANONYMOUS
`owns()` must only be used with rules that require authentication (non-`ANONYMOUS` role). Predicates are skipped for unauthenticated requests — pairing `owns` with `ANONYMOUS` produces a rule that can never match.
:::

**Example:**

```ts
import { owns, rule } from '@vielzeug/ward';

rule<'update', { authorId: string }>().allow('editor').on('posts:*').to('update').when(owns('authorId')).build();
```

---

### `rule()`

```ts
rule<TAction extends string = string, TData = unknown>(): {
  allow(role: string | readonly string[]): RoleStep<TAction, TData>;
  deny(role: string | readonly string[]): RoleStep<TAction, TData>;
}
```

Fluent rule builder. Chain: `.allow()` / `.deny()` → `.on(resource)` → `.to(...actions)` → optionally `.priority(n)` and/or `.when(predicate)` → `.build()`. `.to()` accepts multiple actions and produces one `WardRuleInput` per action. `.priority(n)` is chainable before or after `.when()`.

**Returns:** `WardRuleInput<TAction, TData>[]` from `.build()`

**Example:**

```ts
import { WILDCARD, createWard, owns, rule } from '@vielzeug/ward';

const ward = createWard<'read' | 'update', { authorId: string }>([
  ...rule<'read' | 'update', { authorId: string }>().allow('viewer').on('posts').to('read').build(),
  ...rule<'read' | 'update', { authorId: string }>()
    .allow('editor')
    .on('posts')
    .to('read', 'update')
    .when(owns('authorId'))
    .priority(5)
    .build(),
  ...rule().deny('blocked').on('posts').to(WILDCARD).priority(100).build(),
]);
```

---

### `defineRules()`

```ts
defineRules<TAction extends string = string, TData = unknown>(
  rules: readonly WardRuleInput<TAction, TData>[],
): readonly WardRuleInput<TAction, TData>[]
```

Type-safe rule slice factory for policy composition. Returns the input array unchanged; the value is purely in generic type inference.

**Returns:** `readonly WardRuleInput<TAction, TData>[]`

**Example:**

```ts
import { defineRules, rule, owns } from '@vielzeug/ward';

type PostAction = 'read' | 'update' | 'delete';
type Post = { authorId: string };

export const postsRules = defineRules<PostAction, Post>([
  ...rule<PostAction, Post>().allow(['viewer', 'editor']).on('posts:*').to('read').build(),
  ...rule<PostAction, Post>().allow('editor').on('posts:*').to('update').when(owns('authorId')).build(),
]);

const ward = createWard([...postsRules, ...commentsRules]);
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

---

#### `createExpressGuard()`

```ts
createExpressGuard<TAction, TData, TReq>(
  ward: Ward<TAction, TData>,
  extractPrincipal: (req: TReq) => Principal | Promise<Principal>,
  resource: string,
  action: TAction,
  options?: ExpressGuardOptions,
): ExpressMiddleware
```

Creates an Express-style `(req, res, next)` middleware. Calls `next()` when access is granted. Returns `403` with `{ reason }` when denied, unless `options.onDenied` is provided.

**`ExpressGuardOptions`:**

| Option     | Type                                                | Description                                                                |
| ---------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| `data`     | `TData`                                             | Static data payload forwarded to `when` predicates.                        |
| `onDenied` | `(req, res, next, result) => void \| Promise<void>` | Custom denial handler. When provided, the default 403 response is skipped. |

**Example:**

```ts
import express from 'express';
import { createWard, createExpressGuard } from '@vielzeug/ward';

const ward = createWard([{ role: 'editor', resource: 'posts:*', action: 'update', effect: 'allow' }]);

const requireEdit = createExpressGuard(ward, (req) => req.user ?? null, 'posts:*', 'update');

// With static data forwarded to when predicates.
// Note: options.data is a static value set at guard-creation time, not per-request.
// For per-request data (e.g. req.params.id), resolve it inside the extractor or
// create the guard inside the route handler:
app.put('/posts/:id', async (req, res, next) => {
  const guard = createExpressGuard(ward, () => req.user ?? null, `posts:${req.params.id}`, 'update');
  return guard(req, res, next);
});

app.put('/posts/:id', requireEdit, handler);
```

---

#### `createHonoGuard()`

```ts
createHonoGuard<TAction, TData>(
  ward: Ward<TAction, TData>,
  extractPrincipal: (c: HonoContext) => Principal | Promise<Principal>,
  resource: string,
  action: TAction,
  options?: HonoGuardOptions,
): HonoMiddleware
```

Creates a Hono middleware. Returns `Response(403, { reason })` when denied. Errors thrown by `extractPrincipal` propagate to Hono's `app.onError` handler.

**`HonoGuardOptions`:**

| Option     | Type                                             | Description                                         |
| ---------- | ------------------------------------------------ | --------------------------------------------------- |
| `data`     | `TData`                                          | Static data payload forwarded to `when` predicates. |
| `onDenied` | `(c, next, result) => Promise<Response \| void>` | Custom denial handler.                              |

**Example:**

```ts
import { Hono } from 'hono';
import { createWard, createHonoGuard } from '@vielzeug/ward';

const ward = createWard([{ role: 'editor', resource: 'posts:*', action: 'update', effect: 'allow' }]);

const requireEdit = createHonoGuard(ward, (c) => c.get('user') ?? null, 'posts:*', 'update');

// With static data:
const requireEditOwn = createHonoGuard(ward, (c) => c.get('user') ?? null, 'posts:*', 'update', {
  data: { postId: c.req.param('id') },
});

app.put('/posts/:id', requireEdit, handler);
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

### `WardRuleInput` / `WardRule`

`WardRuleInput` is the shape accepted by `createWard` and the fluent `rule()` builder (`role` may be a string or array). `WardRule` is the normalized output shape: `role` is always `readonly string[]`, and `priority` is always a `number` (defaulted to `0` when not provided). Returned rules are **frozen** objects.

```ts
type WardRuleInput<TAction extends string = string, TData = unknown> = {
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority?: number; // optional in input — defaults to 0
  resource: string | typeof WILDCARD;
  role: string | readonly string[];
  when?: WardPredicate<TData>;
};

type WardRule<TAction extends string = string, TData = unknown> = Readonly<{
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority: number; // always present — 0 when not authored
  resource: string | typeof WILDCARD;
  role: readonly string[];
  when?: WardPredicate<TData>;
}>;
```

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

Discriminated union on `decision` — `rule` is only present when a rule matched:

```ts
type WardLoggerContext<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  principal: Principal;
  resource: string;
} & (
  | { decision: 'allow'; rule: WardRule<TAction, TData> }
  | { decision: 'explicit-deny'; rule: WardRule<TAction, TData> }
  | { decision: 'no-matching-rule' }
);
```

```ts
logger: (ctx) => {
  if (ctx.decision !== 'no-matching-rule') {
    console.log(ctx.rule.role); // no ?. needed
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

```ts
type ConflictKind = 'duplicate' | 'shadowed';

type WardConflict<TAction extends string = string, TData = unknown> = {
  kind: ConflictKind;
  rule: WardRule<TAction, TData>;
  ruleIndex: number;
  shadowedBy: WardRule<TAction, TData>;
  shadowedByIndex: number;
};
```

### `WardTrace` / `WardTraceCandidate`

```ts
type WardTraceCandidate<TAction extends string = string, TData = unknown> = {
  priority: number;
  rule: WardRule<TAction, TData>;
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

permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');
// [ward:decision] allow             (allow)   viewer  posts  read

permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete');
// [ward:decision] no-matching-rule            viewer  posts  delete
```

Wraps `createWard()` with a `logger` pre-wired to `console.debug`. Returns the same `Ward` instance — all methods are identical to `createWard()`.

Import from the dedicated sub-path so the `console.debug` reference is tree-shaken from production bundles when not imported.

Accepts the same `options` as `createWard()` except `logger`, which is reserved for the debug output. All other options (`maxConflicts`, `onConflict`) pass through unchanged.

### `WardDecisionAllowed` / `WardDecisionDenied` / `WardDecisionResult`

```ts
type WardDecisionAllowed<TAction, TData> = { allowed: true; rule: WardRule<TAction, TData> };

type WardDecisionDenied<TAction, TData> =
  | { allowed: false; reason: 'explicit-deny'; rule: WardRule<TAction, TData> }
  | { allowed: false; reason: 'no-matching-rule' };

type WardDecisionResult<TAction, TData> = WardDecision<TAction, TData> & {
  action: TAction;
  resource: string;
};
```

`WardDecisionAllowed` and `WardDecisionDenied` are named aliases for the two branches of `WardDecision` — use them to annotate variables that hold a pre-narrowed branch. `WardDecisionResult` is the return type of `checkAll()` — a `WardDecision` with the originating `resource` and `action` attached.

---

### `RoleStep` / `ResourceStep` / `ActionStep` / `FinalStep`

Intermediate types for the fluent `rule()` builder chain. Export these to annotate partially-constructed builder pipelines:

```ts
import type { ActionStep, FinalStep, ResourceStep, RoleStep } from '@vielzeug/ward';

// Annotate a stored builder step
const editorStep: RoleStep<'read' | 'update', { authorId: string }> = rule<
  'read' | 'update',
  { authorId: string }
>().allow('editor');

const resourceStep: ResourceStep<'read' | 'update', { authorId: string }> = editorStep.on('posts');

const actionStep: ActionStep<'read' | 'update', { authorId: string }> = resourceStep.to('update');

const finalStep: FinalStep<'read' | 'update', { authorId: string }> = actionStep.when(owns('authorId'));
```

### `WardRequest`

```ts
type WardRequest = Record<string, unknown>;
```

Base constraint for the request object type used in `guardRequestWith` and `createExpressGuard`. Any object type satisfies this constraint.

### `Ward` / `BoundWard`

`Ward` is returned by `createWard()`. `BoundWard` is returned by `ward.forUser()` and omits `forUser` and `detectConflicts`. Full method signatures are documented in the sections above.
