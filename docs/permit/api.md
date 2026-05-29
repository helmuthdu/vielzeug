---
title: Permit — API Reference
description: Complete API reference for @vielzeug/permit.
---

[[toc]]

## API At a Glance

| Symbol                                                            | Purpose                                                  | Execution | Common gotcha                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------- | --------- | ------------------------------------------------------ |
| `createPermit(rules, options?)`                                   | Create an immutable permit instance                      | Sync      | Rules cannot be mutated after creation                 |
| `permit.can(principal, resource, action, data?)`                  | Evaluate one decision                                    | Sync      | Invalid principal throws; `null` is valid for anonymous |
| `permit.canAll(principal, resource, actions, data?)`              | Require all actions to be allowed                        | Sync      | Empty `actions` array always returns `true`            |
| `permit.canAny(principal, resource, actions, data?)`              | Require at least one allowed action                      | Sync      | Empty `actions` array always returns `false`           |
| `permit.checkAll(principal, checks)`                              | Evaluate multiple decisions in one call                  | Sync      | Empty `checks` array returns `[]` without validation   |
| `permit.allowedActions(principal, resource, knownActions, data?)` | List allowed concrete actions; does not invoke logger    | Sync      | Wildcard-action rules require a non-empty `knownActions` |
| `permit.explain(principal, resource, action, data?)`              | Return full decision object with deny reason             | Sync      | Returned `rule` is a copy; mutations do not propagate  |
| `permit.rulesInScope(principal, resource, data?)`                 | List rules in scope for introspection; no side effects   | Sync      | Without `data`, predicate rules are included unfiltered |
| `permit.forUser(principal)`                                       | Create a principal-bound permit view                     | Sync      | Principal is snapshotted at bind time                  |
| `owns(attributeKey)`                                              | Create an ownership predicate helper                     | Sync      | Returns `false` when `data` is absent or not an object |

## Package Entry Point

| Import             | Purpose                |
| ------------------ | ---------------------- |
| `@vielzeug/permit` | Main exports and types |

## Constants

- `WILDCARD = '*'`
- `ANONYMOUS = 'anonymous'`

`WILDCARD` can be used as role, resource, or action.

## PermitRule Fields

| Field      | Type                         | Required | Description                                                                 |
| ---------- | ---------------------------- | -------- | --------------------------------------------------------------------------- |
| `role`     | `string \| readonly string[]` | ✅       | One role or an array of roles. A rule matches if the principal holds **any** of the listed roles (OR semantics). Use `WILDCARD` for all authenticated principals, `ANONYMOUS` for unauthenticated requests. |
| `resource` | `string`                     | ✅       | Resource identifier. Use `WILDCARD` to match any resource.                  |
| `action`   | `string`                     | ✅       | Action identifier. Use `WILDCARD` to match any action.                      |
| `effect`   | `'allow' \| 'deny'`          | ✅       | Whether the rule grants or denies access.                                   |
| `priority` | `number`                     | —        | Higher value wins. Defaults to `0`. Must be a finite number.                |
| `when`     | `PermitPredicate<TData>`     | —        | Runtime predicate evaluated only for authenticated principals.              |

### Multi-Role Rules

When `role` is an array, the rule matches if the principal holds **any** of the listed roles. This lets you consolidate rules that share identical permissions across several roles:

```ts
// Instead of three separate allow rules, write one:
const permit = createPermit([
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

### `createPermit()`

```ts
createPermit<TAction extends string = string, TData = unknown>(
  rules?: readonly PermitRule<TAction, TData>[],
  options?: PermitOptions<TAction, TData>,
): Permit<TAction, TData>
```

Creates an immutable permit instance with the given rules. All rules are compiled once at creation time — pass a new array to update the policy.

**Parameters — `PermitOptions`:**

| Option   | Type                                              | Default     | Description                                                     |
| -------- | ------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| `logger` | `(context: PermitLoggerContext) => void`          | `undefined` | Called after every decision method (`can`, `checkAll`, etc.). Not called by `allowedActions` or `rulesInScope`. |

**Returns:** `Permit<TAction, TData>`

**Example:**

```ts
import { createPermit, owns } from '@vielzeug/permit';

const permit = createPermit<'read' | 'update', { authorId: string }>([
  { role: 'viewer', resource: 'posts', action: 'read',   effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow', when: owns('authorId') },
]);
```

---

## Permit Methods

### `can()`

```ts
permit.can(principal: Principal, resource: string, action: TAction, data?: TData): boolean
```

Returns `true` if the principal is allowed to perform `action` on `resource`.

**Returns:** `boolean`

**Example:**

```ts
permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read');
permit.can(null, 'posts', 'read'); // anonymous check
```

---

### `canAll()`

```ts
permit.canAll(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean
```

Returns `true` only if every action in `actions` is allowed. Returns `true` for an empty array without validating the principal.

**Returns:** `boolean`

**Example:**

```ts
permit.canAll({ id: 'u1', roles: ['editor'] }, 'posts', ['read', 'update'], { authorId: 'u1' });
```

---

### `canAny()`

```ts
permit.canAny(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean
```

Returns `true` if at least one action in `actions` is allowed. Returns `false` for an empty array without validating the principal.

**Returns:** `boolean`

**Example:**

```ts
permit.canAny({ id: 'u1', roles: ['editor'] }, 'posts', ['update', 'delete'], { authorId: 'u1' });
```

---

### `checkAll()`

```ts
permit.checkAll(
  principal: Principal,
  checks: readonly PermitCheck<TAction, TData>[],
): PermitDecision<TAction, TData>[]
```

Evaluates each check independently and returns one `PermitDecision` per entry in the same order. Returns `[]` for an empty array without validating the principal.

**Returns:** `PermitDecision<TAction, TData>[]`

**Example:**

```ts
const decisions = permit.checkAll({ id: 'u1', roles: ['editor'] }, [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'update', data: { authorId: 'u1' } },
]);
```

---

### `allowedActions()`

```ts
permit.allowedActions(
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
const actions = permit.allowedActions(
  { id: 'u1', roles: ['editor'] },
  'posts',
  ['read', 'update', 'delete'],
);

// With runtime data for predicate-gated rules
const owned = permit.allowedActions(
  { id: 'u1', roles: ['editor'] },
  'posts',
  ['read', 'update', 'delete'],
  { authorId: 'u1' },
);
```

---

### `explain()`

```ts
permit.explain(
  principal: Principal,
  resource: string,
  action: TAction,
  data?: TData,
): PermitDecision<TAction, TData>
```

Returns a full decision object including the winning rule (for allow and explicit deny) or a deny reason (for no-match). The returned `rule` object is a copy — mutating it does not affect the permit's internal state.

**Returns:** `PermitDecision<TAction, TData>`

**Example:**

```ts
const decision = permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'delete');

if (!decision.allowed) {
  console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'
}
```

---

### `rulesInScope()`

```ts
permit.rulesInScope(
  principal: Principal,
  resource: string,
  data?: TData,
): PermitRule<TAction, TData>[]
```

Returns all rules that match the principal/resource combination, regardless of action. When `data` is provided, predicate rules are also evaluated against it and excluded if they do not match. Without `data`, predicate-gated rules appear in the result unfiltered. Does not invoke the logger.

**Returns:** `PermitRule<TAction, TData>[]`

**Example:**

```ts
const rules   = permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts');
const narrowed = permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' });
```

---

### `forUser()`

```ts
permit.forUser(principal: UserPrincipal): BoundPermit<TAction, TData>
```

Creates a principal-bound view of the permit. The principal — including nested `attributes` — is deep-snapshotted at call time; subsequent mutations to the original object have no effect on the bound view.

**Returns:** `BoundPermit<TAction, TData>`

**Methods on `BoundPermit`:**

| Method           | Signature                                                        | Description                             |
| ---------------- | ---------------------------------------------------------------- | --------------------------------------- |
| `can`            | `(resource, action, data?) => boolean`                           | Single action check                     |
| `canAll`         | `(resource, actions, data?) => boolean`                          | All-actions check                       |
| `canAny`         | `(resource, actions, data?) => boolean`                          | Any-action check                        |
| `checkAll`       | `(checks) => PermitDecision[]`                                   | Batch decisions                         |
| `allowedActions` | `(resource, knownActions, data?) => TAction[]`                   | Action enumeration (no logger)          |
| `explain`        | `(resource, action, data?) => PermitDecision`                    | Full decision with reason               |
| `rulesInScope`   | `(resource, data?) => PermitRule[]`                              | Rule introspection (no logger)          |

**Example:**

```ts
const bound = permit.forUser({ id: 'u1', roles: ['editor'] });

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
owns<TData = unknown>(attributeKey: keyof TData & string): PermitPredicate<TData>
```

Returns a predicate that allows the action when `principal.id === data[attributeKey]`. Returns `false` when `data` is absent, not an object, or the attribute value does not match.

**Returns:** `PermitPredicate<TData>`

**Example:**

```ts
import { createPermit, owns } from '@vielzeug/permit';

const permit = createPermit<'update', { authorId: string }>([
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow', when: owns('authorId') },
]);

permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' }); // true
permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' }); // false
```

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

type PermitPredicate<TData = unknown> = (ctx: RuleContext<TData>) => boolean;

type PermitRule<TAction extends string = string, TData = unknown> = {
  role: string | readonly string[];
  resource: string | typeof WILDCARD;
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority?: number;
  when?: PermitPredicate<TData>;
};

type PermitDecision<TAction extends string = string, TData = unknown> =
  | { allowed: true;  rule: PermitRule<TAction, TData> }
  | { allowed: false; reason: 'no-matching-rule' | 'explicit-deny'; rule?: PermitRule<TAction, TData> };

type PermitCheck<TAction extends string = string, TData = unknown> = {
  resource: string;
  action: TAction;
  data?: TData;
};

type PermitLoggerContext<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  decision: 'allow' | 'deny';
  principal: Principal;
  resource: string;
  rule?: PermitRule<TAction, TData>;
};

type PermitOptions<TAction extends string = string, TData = unknown> = {
  logger?: (context: PermitLoggerContext<TAction, TData>) => void;
};

// Permit and BoundPermit are returned by createPermit() and forUser() respectively.
// Full method signatures are documented in the sections above.
type Permit<TAction extends string = string, TData = unknown> = { /* see Permit Methods */ };
type BoundPermit<TAction extends string = string, TData = unknown> = { /* see forUser() */ };
```
