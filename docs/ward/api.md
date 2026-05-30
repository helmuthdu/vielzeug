---
title: Ward — API Reference
description: Complete API reference for @vielzeug/ward.
---

[[toc]]

## API At a Glance

| Symbol                                                            | Purpose                                                  | Execution | Common gotcha                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------- | --------- | ------------------------------------------------------ |
| `createWard(rules, options?)`                                   | Create an immutable ward instance                      | Sync      | Rules cannot be mutated after creation                 |
| `rule<TAction, TData>()`                                        | Fluent rule builder                                    | Sync      | Call `.build()` to get a `WardRule[]` for `createWard` |
| `matchesResource(pattern, resource)`                            | Test a resource pattern against a concrete string      | Sync      | Patterns ending in `:*` match any resource in that namespace |
| `ward.can(principal, resource, action, data?)`                  | Evaluate one decision                                    | Sync      | Invalid principal throws; `null` is valid for anonymous |
| `ward.canAll(principal, resource, actions, data?)`              | Require all actions to be allowed                        | Sync      | Empty `actions` array always returns `true`            |
| `ward.canAny(principal, resource, actions, data?)`              | Require at least one allowed action                      | Sync      | Empty `actions` array always returns `false`           |
| `ward.checkAll(principal, checks)`                              | Evaluate multiple decisions in one call                  | Sync      | Empty `checks` array returns `[]` without validation   |
| `ward.allowedActions(principal, resource, knownActions, data?)` | List allowed concrete actions; does not invoke logger    | Sync      | Wildcard-action rules require a non-empty `knownActions` |
| `guardRequest(ward, req, extractPrincipal, resource, action, data?)`  | Framework-agnostic async guard helper     | Async     | Returns `GuardResult` — check `.granted` to proceed   |
| `createExpressGuard(ward, extractPrincipal, resource, action, options?)` | Express middleware guard factory        | Sync/Async | Calls `next()` on allow, returns `403` on deny         |
| `createHonoGuard(ward, extractPrincipal, resource, action, options?)`  | Hono middleware guard factory            | Async     | Returns `Response(403)` on deny                        |
| `ward.explain(principal, resource, action, data?)`              | Return full decision object with deny reason             | Sync      | Returned `rule` is **frozen**; mutations throw `TypeError` |
| `ward.rulesInScope(principal, resource, data?)`                 | List rules in scope for introspection; no side effects   | Sync      | Without `data`, predicate rules are included unfiltered |
| `ward.forUser(principal)`                                       | Create a principal-bound ward view                     | Sync      | Principal is snapshotted at bind time                  |
| `owns(attributeKey)`                                              | Create an ownership predicate helper                     | Sync      | Returns `false` when `data` is absent or not an object |

## Package Entry Point

| Import             | Purpose                |
| ------------------ | ---------------------- |
| `@vielzeug/ward` | Main exports and types |

## Constants

- `WILDCARD = '*'`
- `ANONYMOUS = 'anonymous'`

`WILDCARD` can be used as role, resource, or action.

## WardRule Fields

| Field      | Type                         | Required | Description                                                                 |
| ---------- | ---------------------------- | -------- | --------------------------------------------------------------------------- |
| `role`     | `string \| readonly string[]` | ✅       | One role or an array of roles. A rule matches if the principal holds **any** of the listed roles (OR semantics). Use `WILDCARD` for all authenticated principals, `ANONYMOUS` for unauthenticated requests. |
| `resource` | `string`                     | ✅       | Resource identifier. Use `WILDCARD` to match any resource.                  |
| `action`   | `string`                     | ✅       | Action identifier. Use `WILDCARD` to match any action.                      |
| `effect`   | `'allow' \| 'deny'`          | ✅       | Whether the rule grants or denies access.                                   |
| `priority` | `number`                     | —        | Higher value wins. Defaults to `0`. Must be a finite number.                |
| `when`     | `WardPredicate<TData>`     | —        | Runtime predicate evaluated only for authenticated principals.              |

### Multi-Role Rules

When `role` is an array, the rule matches if the principal holds **any** of the listed roles. This lets you consolidate rules that share identical permissions across several roles:

```ts
// Instead of three separate allow rules, write one:
const ward = createWard([
  { role: ['viewer', 'editor', 'admin'], resource: 'posts', action: 'read', effect: 'allow' },
  { role: ['editor', 'admin'],          resource: 'posts', action: 'update', effect: 'allow' },
  { role: 'admin',                      resource: 'posts', action: 'delete', effect: 'allow' },
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

| Option   | Type                                              | Default     | Description                                                     |
| -------- | ------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| `logger` | `(context: WardLoggerContext) => void`          | `undefined` | Called after every decision method (`can`, `checkAll`, etc.). Not called by `allowedActions` or `rulesInScope`. `decision` is `'allow'`, `'explicit-deny'`, or `'no-matching-rule'` — not just `'deny'`. |

**Returns:** `Ward<TAction, TData>`

**Example:**

```ts
import { createWard, owns } from '@vielzeug/ward';

const ward = createWard<'read' | 'update', { authorId: string }>([
  { role: 'viewer', resource: 'posts', action: 'read',   effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow', when: owns('authorId') },
]);
```

---

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
): WardDecision<TAction, TData>[]
```

Evaluates each check independently and returns one `WardDecision` per entry in the same order. Returns `[]` for an empty array without validating the principal.

**Returns:** `WardDecision<TAction, TData>[]`

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
const actions = ward.allowedActions(
  { id: 'u1', roles: ['editor'] },
  'posts',
  ['read', 'update', 'delete'],
);

// With runtime data for predicate-gated rules
const owned = ward.allowedActions(
  { id: 'u1', roles: ['editor'] },
  'posts',
  ['read', 'update', 'delete'],
  { authorId: 'u1' },
);
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

Returns a full decision object including the winning rule (for allow and explicit deny) or a deny reason (for no-match). The returned `rule` object is **frozen** — mutations throw `TypeError` in strict mode.

**Returns:** `WardDecision<TAction, TData>`

**Example:**

```ts
const decision = ward.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'delete');

if (!decision.allowed) {
  console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'
}
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

Returns all rules that match the principal/resource combination, regardless of action. When `data` is provided, predicate rules are also evaluated against it and excluded if they do not match. Without `data`, predicate-gated rules appear in the result unfiltered. Does not invoke the logger.

**Returns:** `WardRule<TAction, TData>[]`

**Example:**

```ts
const rules   = ward.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts');
const narrowed = ward.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' });
```

---

### `forUser()`

```ts
ward.forUser(principal: UserPrincipal): BoundWard<TAction, TData>
```

Creates a principal-bound view of the ward. The principal — including nested `attributes` — is deep-snapshotted at call time; subsequent mutations to the original object have no effect on the bound view.

**Returns:** `BoundWard<TAction, TData>`

**Methods on `BoundWard`:**

| Method           | Signature                                                        | Description                             |
| ---------------- | ---------------------------------------------------------------- | --------------------------------------- |
| `can`            | `(resource, action, data?) => boolean`                           | Single action check                     |
| `canAll`         | `(resource, actions, data?) => boolean`                          | All-actions check                       |
| `canAny`         | `(resource, actions, data?) => boolean`                          | Any-action check                        |
| `checkAll`       | `(checks) => WardDecision[]`                                   | Batch decisions                         |
| `allowedActions` | `(resource, knownActions, data?) => TAction[]`                   | Action enumeration (no logger)          |
| `explain`        | `(resource, action, data?) => WardDecision`                    | Full decision with reason               |
| `rulesInScope`   | `(resource, data?) => WardRule[]`                              | Rule introspection (no logger)          |

**Example:**

```ts
const bound = ward.forUser({ id: 'u1', roles: ['editor'] });

bound.can('posts', 'read');
bound.canAll('posts', ['read', 'update'], { authorId: 'u1' });
bound.allowedActions('posts', ['read', 'update', 'delete']);
bound.allowedActions('posts', ['read', 'update', 'delete'], { authorId: 'u1' });
bound.explain('posts', 'delete');
bound.rulesInScope('posts');
```

---

## Helper Functions

### `owns()`

```ts
owns<TData = unknown>(attributeKey: keyof TData & string): WardPredicate<TData>
```

Returns a predicate that allows the action when `principal.id === data[attributeKey]`. Returns `false` when `data` is absent, not an object, or the attribute value does not match.

**Returns:** `WardPredicate<TData>`

**Example:**

```ts
import { createWard, owns } from '@vielzeug/ward';

const ward = createWard<'update', { authorId: string }>([
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow', when: owns('authorId') },
]);

ward.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' }); // true
ward.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' }); // false
```

---

### `rule()`

```ts
rule<TAction extends string = string, TData = unknown>(): {
  allow(role: string | readonly string[]): RoleStep<TAction, TData>;
  deny(role: string | readonly string[]): RoleStep<TAction, TData>;
}
```

Fluent rule builder. Chain `.allow()` or `.deny()` → `.on(resource)` → `.to(...actions)` → optionally `.when(predicate)` → `.build()`. `.to()` accepts multiple actions and produces one `WardRule` per action.

**Returns:** `WardRule<TAction, TData>[]` from `.build()`

**Example:**

```ts
import { createWard, owns, rule } from '@vielzeug/ward';

const ward = createWard<'read' | 'update', { authorId: string }>([
  ...rule<'read' | 'update', { authorId: string }>().allow('viewer').on('posts').to('read').build(),
  ...rule<'read' | 'update', { authorId: string }>()
    .allow('editor').on('posts').to('read', 'update').when(owns('authorId')).build(),
]);
```

---

### `matchesResource()`

```ts
matchesResource(pattern: string, resource: string): boolean
```

Tests whether a rule's resource pattern matches a concrete resource string. Used internally by the engine; exported for building custom integrations or middleware.

**Pattern semantics:**

| Pattern       | Matches                                           |
| ------------- | ------------------------------------------------- |
| `*`           | Any resource                                      |
| `posts`       | Exactly `posts`                                   |
| `posts:*`     | Any resource starting with `posts:` (e.g. `posts:123`, `posts:draft:1`) |
| `posts:123`   | Exactly `posts:123`                               |

**Example:**

```ts
matchesResource('posts:*', 'posts:123'); // true
matchesResource('posts:*', 'comments:1'); // false
```

---

### Middleware Factories

#### `guardRequest()`

```ts
guardRequest<TAction, TData, TReq>(
  ward: Ward<TAction, TData>,
  req: TReq,
  extractPrincipal: (req: TReq) => Principal | Promise<Principal>,
  resource: string,
  action: TAction,
  data?: TData,
): Promise<GuardResult<TAction, TData>>
```

Framework-agnostic async helper that evaluates one access check and returns a `GuardResult`:

```ts
type GuardResult =
  | { granted: true; principal: Principal }
  | { granted: false; decision: WardDecision; principal: Principal };
```

**Example:**

```ts
const result = await guardRequest(ward, req, (req) => req.user ?? null, 'posts', 'update');

if (!result.granted) {
  return response.status(403).json({ reason: result.decision.reason });
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

**Example:**

```ts
import express from 'express';
import { createWard, createExpressGuard } from '@vielzeug/ward';

const ward = createWard([
  { role: 'editor', resource: 'posts:*', action: 'update', effect: 'allow' },
]);

const requireEdit = createExpressGuard(ward, (req) => req.user ?? null, 'posts:*', 'update');

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

Creates a Hono middleware. Returns a `Response(403, { reason })` when denied.

**Example:**

```ts
import { Hono } from 'hono';
import { createWard, createHonoGuard } from '@vielzeug/ward';

const ward = createWard([
  { role: 'editor', resource: 'posts:*', action: 'update', effect: 'allow' },
]);

const requireEdit = createHonoGuard(ward, (c) => c.get('user') ?? null, 'posts:*', 'update');

app.put('/posts/:id', requireEdit, handler);
```

---

## Types

```ts
type UserPrincipal = {
  id: string;
  roles: readonly string[];
  attributes?: Record<string, unknown>;
};

type Principal = UserPrincipal | null;

type RuleContext<TData = unknown> = {
  principal: UserPrincipal;
  data?: TData;
};

type WardPredicate<TData = unknown> = (ctx: RuleContext<TData>) => boolean;

type WardRule<TAction extends string = string, TData = unknown> = {
  role: string | readonly string[];
  resource: string | typeof WILDCARD;
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority?: number;
  when?: WardPredicate<TData>;
};

type WardDecision<TAction extends string = string, TData = unknown> =
  | { allowed: true;  rule: WardRule<TAction, TData> }
  | { allowed: false; reason: 'no-matching-rule' | 'explicit-deny'; rule?: WardRule<TAction, TData> };

type WardCheck<TAction extends string = string, TData = unknown> = {
  resource: string;
  action: TAction;
  data?: TData;
};

type WardLoggerContext<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  decision: 'allow' | 'explicit-deny' | 'no-matching-rule';
  principal: Principal;
  resource: string;
  rule?: WardRule<TAction, TData>;
};

type WardOptions<TAction extends string = string, TData = unknown> = {
  logger?: (context: WardLoggerContext<TAction, TData>) => void;
};

// Ward and BoundWard are returned by createWard() and forUser() respectively.
// Full method signatures are documented in the sections above.
type Ward<TAction extends string = string, TData = unknown> = { /* see Ward Methods */ };
type BoundWard<TAction extends string = string, TData = unknown> = { /* see forUser() */ };
```
