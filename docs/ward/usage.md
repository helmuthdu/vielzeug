---
title: Ward — Usage Guide
description: Build deterministic authorization policies with immutable rule sets, wildcard support, and runtime predicates.
---

[[toc]]

## Basic Usage

Create a ward instance with an array of rules. Rules are compiled once at creation time.

```ts
import { WILDCARD, createWard } from '@vielzeug/ward';

const ward = createWard([
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow' },
  // High-priority deny blocks the blocked role from every action on posts
  { role: 'blocked', resource: 'posts', action: WILDCARD, effect: 'deny', priority: 100 },
]);

ward.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read').allowed; // true
ward.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'update').allowed; // false
ward.explain({ id: 'u2', roles: ['blocked'] }, 'posts', 'read').allowed; // false
```

To update the policy, create a new instance — rules are immutable after creation.

## Rule Factories

Use `allow()` / `deny()` as an alternative to raw rule objects. Each produces one `WardRule` per action — spread the result into the array passed to `createWard`. They read naturally: "allow editor to read/update posts".

```ts
import { allow, createWard, owns } from '@vielzeug/ward';

const ward = createWard<'read' | 'update' | 'delete', { authorId: string }>([
  ...allow(['viewer', 'editor'], 'posts', ['read']),
  ...allow('editor', 'posts', ['update', 'delete'], { when: owns('authorId') }),
]);
```

Pass `{ priority: n }` and/or `{ when: predicate }` as the fourth argument. `deny()` is the same shape with `effect: 'deny'` fixed:

```ts
import { WILDCARD, deny } from '@vielzeug/ward';

deny('blocked', 'posts', [WILDCARD], { priority: 100 });
```

`ruleFor(effect, role, resource, actions, options?)` is the low-level factory that `allow()`/`deny()` wrap — use it when the effect is only known dynamically.

## Hierarchical Resources

Use colon-namespaced patterns to scope rules to resource instances:

```ts
const ward = createWard([
  // Applies to any resource under 'posts:' namespace
  { role: 'editor', resource: 'posts:*', action: 'update', effect: 'allow' },
  // Applies only to one specific post
  { role: 'viewer', resource: 'posts:123', action: 'read', effect: 'allow' },
]);

ward.explain(editor, 'posts:456', 'update').allowed; // true  — matches posts:*
ward.explain(viewer, 'posts:123', 'read').allowed; // true  — exact match
ward.explain(viewer, 'posts:456', 'read').allowed; // false — no matching rule
```

The same namespace-wildcard syntax works for actions (action hierarchy):

```ts
// 'read:*' matches 'read:own', 'read:all', 'read:draft:1', etc.
const ward = createWard([{ role: 'viewer', resource: 'posts', action: 'read:*', effect: 'allow' }]);

ward.explain(viewer, 'posts', 'read:own').allowed; // true
ward.explain(viewer, 'posts', 'read:all').allowed; // true
ward.explain(viewer, 'posts', 'write').allowed; // false
```

`matchesPattern(pattern, value)` is exported for custom integration code. `patternCovers(broad, narrow)` is exported to test whether one pattern statically covers another (used by `detectConflicts`).

## Check Permissions

```ts
const principal = { id: 'u1', roles: ['editor'] };

ward.explain(principal, 'posts', 'read').allowed;
ward.explain(principal, 'posts', 'delete').allowed;
ward.explain(null, 'posts', 'read').allowed;
```

`principal` must be either:

- `null` for anonymous users
- `{ id: string, roles: readonly string[] }` for authenticated users

Malformed principal values throw errors.

## Bind a User with `forUser`

::: tip Detect conflicts before binding
`BoundWard` does not expose `detectConflicts()`. Run `ward.detectConflicts()` on the parent ward before calling `forUser()` — typically at startup or during policy initialization.
:::

```ts
const bound = ward.forUser({ id: 'u1', roles: ['editor'] });

bound.explain('posts', 'read').allowed;
bound.explain('posts', 'update', { authorId: 'u1' }).allowed;
```

`forUser()` returns a reusable bound ward object and snapshots roles/attributes at binding time.

## Check Multiple Actions

Ward has no dedicated "all"/"any" helper — use `checkAll()` and reduce with `Array.every` / `Array.some`:

```ts
const checks = [
  { action: 'read', resource: 'posts' },
  { action: 'update', resource: 'posts', data: { authorId: 'u1' } },
] as const;

const decisions = ward.checkAll({ id: 'u1', roles: ['editor'] }, checks);

const allAllowed = decisions.every((d) => d.allowed);
const anyAllowed = decisions.some((d) => d.allowed);
```

## Batch Decisions with `checkAll`

```ts
const decisions = ward.checkAll({ id: 'u1', roles: ['editor'] }, [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'update', data: { authorId: 'u1' } },
]);

const bound = ward.forUser({ id: 'u1', roles: ['editor'] });
const boundDecisions = bound.checkAll([
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'delete' },
]);
```

`checkAll()` returns a `WardDecisionResult[]` — each entry is a `WardDecision` with the originating `resource` and `action` fields attached, so callers do not need to zip the result by index.

## List Allowed Actions

`allowedActions(principal, resource, knownActions, data?)` returns the subset of `knownActions` that the principal is allowed to perform on `resource`.

`knownActions` is required because Ward cannot enumerate actions on its own — an action defined with `WILDCARD` has no finite list of concrete values. Passing `knownActions` resolves wildcard-action rules against that set:

```ts
// Returns the subset of the provided list that is allowed
const actions = ward.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts', ['read', 'update', 'delete']);

// With runtime data for predicate-gated rules
const ownedActions = ward.allowedActions({ id: 'u1', roles: ['editor'] }, 'posts', ['read', 'update', 'delete'], {
  authorId: 'u1',
});
```

`allowedActions` does not invoke the logger — it is a side-effect-free enumeration helper.

## Inspect Rule Scope with `rulesInScope`

```ts
const rules = ward.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts');
const narrowed = ward.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' });

const bound = ward.forUser({ id: 'u1', roles: ['editor'] });
const boundRules = bound.rulesInScope('posts');
```

`rulesInScope()` is introspection-only. It returns rules in scope for the principal/resource pair and never mutates the ward.
If you pass `data`, Ward also filters predicate rules by whether they match that runtime payload.

## Explain Denials and Winners

```ts
const decision = ward.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'delete');

if (!decision.allowed) {
  console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'
  // decision.rule is only present for 'explicit-deny', not 'no-matching-rule'
  if (decision.reason === 'explicit-deny') {
    console.log(decision.rule.effect); // 'deny'
  }
}
```

`explain()` returns a **3-variant discriminated union**:

| Variant       | `allowed` | `reason`             | `rule`                |
| ------------- | --------- | -------------------- | --------------------- |
| Allow         | `true`    | —                    | The winning rule      |
| Explicit deny | `false`   | `'explicit-deny'`    | The winning deny rule |
| No match      | `false`   | `'no-matching-rule'` | Not present           |

Use `'rule' in decision` to safely access the rule across all variants.

## Trace Decisions

`trace()` returns the complete decision trace: every rule that matched the request before the winner was selected, with per-candidate scoring details.

```ts
const { decision, candidates } = ward.trace({ id: 'u1', roles: ['editor'] }, 'posts', 'read');

candidates.forEach(({ rule, priority, score, won }) => {
  console.log(rule.effect, priority, score, won ? '← winner' : '');
});
```

`trace()` does **not** fire the logger — it is a side-channel-free inspection tool. Use `explain()` when you need the logger to fire and only need the final decision.

`trace()` is also available on `BoundWard`: `bound.trace(resource, action, data?)`.

## Detect Policy Conflicts

`detectConflicts()` performs a static O(n²) analysis of your rule set and returns all detected conflicts. The result is lazily computed — every call after the first returns the same array reference.

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

Two conflict kinds, narrowable by `kind`:

- **`'duplicate'`** — two predicate-free rules have the same (role set, resource, action). The second (`ruleB`/`indexB`) can never fire because the first (`ruleA`/`indexA`) always wins.
- **`'shadowed'`** — a higher-ranked predicate-free rule (`shadowingRule`/`shadowingIndex`) covers the other's (`shadowedRule`/`shadowedIndex`) patterns entirely. The shadowed rule can never win.

Rules with a `when` predicate are excluded from both checks because their applicability is determined at runtime, not statically.

To surface conflicts eagerly at startup:

```ts
// Warn on conflicts
const ward = createWard(rules, {
  onConflict: (c) =>
    console.warn(c.kind === 'duplicate' ? `[ward] duplicate: Rule[${c.indexB}]` : `[ward] shadowed: Rule[${c.shadowedIndex}]`),
});

// Throw on first conflict (strict mode)
const ward = createWard(rules, { strict: true });

// Cap O(n²) cost for large auto-generated policies
const ward = createWard(rules, { maxConflicts: 20 });
```

## Use Dynamic Conditions with `when`

```ts
const ward = createWard<'update', { authorId: string }>([
  {
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: ({ principal, data }) => principal.id === data?.authorId,
  },
]);
```

`when` only runs for authenticated principals. For anonymous (`null`) checks, predicates are skipped and the rule does not match. Do not pair `owns()` or any `when` predicate with an `ANONYMOUS`-role rule — it can never match.

### Ownership Checks with `owns`

```ts
import { createWard, owns } from '@vielzeug/ward';

const ward = createWard<'update', { authorId: string }>([
  {
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: owns('authorId'),
  },
]);
```

`owns()` is a convenience helper for the common `principal.id === data[attributeKey]` pattern.

### Attribute-Based Conditions (ABAC)

```ts
const ward = createWard<'publish'>([
  {
    role: 'editor',
    resource: 'posts',
    action: 'publish',
    effect: 'allow',
    when: ({ principal }) => principal.attributes?.tier === 'pro',
  },
]);
```

`principal.attributes` can store arbitrary user metadata for runtime policy checks.

## Multi-Role Rules

The `role` field accepts either a single string or an array of strings. A rule matches if the principal holds **any** of the listed roles (OR semantics).

Multi-role rules reduce repetition when several roles share identical permissions:

```ts
import { createWard } from '@vielzeug/ward';

const ward = createWard([
  // One rule instead of three separate allow rules
  { role: ['viewer', 'editor', 'admin'], resource: 'posts', action: 'read', effect: 'allow' },
  { role: ['editor', 'admin'], resource: 'posts', action: 'update', effect: 'allow' },
  { role: 'admin', resource: 'posts', action: 'delete', effect: 'allow' },
]);

ward.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read').allowed; // true
ward.explain({ id: 'u2', roles: ['editor'] }, 'posts', 'update').allowed; // true
ward.explain({ id: 'u2', roles: ['editor'] }, 'posts', 'delete').allowed; // false
```

`ANONYMOUS` works inside multi-role arrays. The rule matches both unauthenticated visitors and any authenticated role listed alongside it:

```ts
import { ANONYMOUS, createWard } from '@vielzeug/ward';

const ward = createWard([{ role: [ANONYMOUS, 'viewer'], resource: 'posts', action: 'read', effect: 'allow' }]);

ward.explain(null, 'posts', 'read').allowed; // true (anonymous)
ward.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read').allowed; // true (viewer)
ward.explain({ id: 'u2', roles: ['admin'] }, 'posts', 'read').allowed; // false (not in list)
```

## Anonymous and Wildcards

```ts
import { ANONYMOUS, WILDCARD } from '@vielzeug/ward';

const ward = createWard([
  { role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' },
  { role: WILDCARD, resource: 'status', action: 'read', effect: 'allow' },
]);
```

Use `ANONYMOUS` for anonymous-only rules and `WILDCARD` for any role/resource/action.

## Logger and Auditing

```ts
const ward = createWard([{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }], {
  logger: (ctx) => {
    const subject = ctx.principal === null ? 'anonymous' : ctx.principal.id;
    const outcome = ctx.allowed ? 'allow' : ctx.reason;
    console.log(subject, ctx.resource, ctx.action, outcome);
  },
});
```

The logger runs after `explain()` and `checkAll()` (including through a `BoundWard`). It does **not** run after `trace()`.
Enumeration and introspection helpers (`allowedActions()`, `rulesInScope()`, `detectConflicts()`) stay side-effect free.

`WardLoggerContext` is structurally identical to `WardDecision` plus the request fields, so `rule` narrows the same way — present when `allowed` is `true` or `reason` is `'explicit-deny'`:

```ts
logger: (ctx) => {
  if (ctx.allowed || ctx.reason === 'explicit-deny') {
    console.log(ctx.rule.role); // no ?. needed — rule is present
  }
},
```

- `allowed: true` — a matching allow rule won
- `allowed: false, reason: 'explicit-deny'` — a matching deny rule won
- `allowed: false, reason: 'no-matching-rule'` — no rule matched at all (default deny)

This lets you distinguish explicit blocks from gaps in your policy in audit logs and metrics.

## Decision Precedence

Ward uses one deterministic model:

1. If no rule matches, decision is deny.
2. Higher `priority` wins.
3. For equal `priority`, higher specificity wins — `exact > namespace-wildcard (ns:*) > global-wildcard (*)`, applied independently to role, resource, and action.
4. For equal `priority` and specificity, deny overrides allow.
5. On absolute tie (identical priority, specificity, and effect), the rule declared **first in the array** wins.

## Exact Matching

Ward uses exact string matching for role/resource/action.

```ts
const ward = createWard([{ role: 'admin', resource: 'posts', action: 'read', effect: 'allow' }]);

ward.explain({ id: 'u1', roles: ['admin'] }, 'posts', 'read').allowed; // true
ward.explain({ id: 'u1', roles: ['ADMIN'] }, 'posts', 'read').allowed; // false
```

Adopt one identifier convention (for example all lowercase) at your app boundary.

## Framework Integration

::: code-group

```tsx [React]
import { createContext, useContext, type ReactNode } from 'react';
import { createWard } from '@vielzeug/ward';

type User = { id: string; roles: string[] };

const ward = createWard([
  { role: 'admin', resource: '*', action: '*', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'write', effect: 'allow' },
]);

const UserContext = createContext<User | null>(null);

function useWard(resource: string, action: string) {
  const user = useContext(UserContext);
  if (!user) return false;
  return ward.explain(user, resource, action).allowed;
}

function EditButton({ postId }: { postId: string }) {
  const canEdit = useWard('posts', 'write');
  if (!canEdit) return null;
  return <button>Edit {postId}</button>;
}
```

```ts [Vue 3]
import { computed } from 'vue';
import { createWard } from '@vielzeug/ward';

type User = { id: string; roles: string[] };

const ward = createWard([
  { role: 'admin', resource: '*', action: '*', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'write', effect: 'allow' },
]);

function useWard(user: { value: User | null }, resource: string, action: string) {
  return computed(() => (user.value ? ward.explain(user.value, resource, action).allowed : false));
}
```

```svelte [Svelte]
<script lang="ts">
  import { createWard } from '@vielzeug/ward';

  type User = { id: string; roles: string[] };

  export let user: User;

  const ward = createWard([
    { role: 'admin', resource: '*', action: '*', effect: 'allow' },
    { role: 'editor', resource: 'posts', action: 'write', effect: 'allow' },
  ]);

  $: canEdit = ward.explain(user, 'posts', 'write').allowed;
</script>

{#if canEdit}<button>Edit</button>{/if}
```

:::

### Pitfalls

- **React:** If the ward is created inside a component that re-renders often, `createWard()` runs on every render. Memoize with `useMemo(() => createWard(...), [role])`, or define it once at module scope as in the example above.
- **Vue 3:** Injecting `ward` as a plain value (not a `ComputedRef`) means role changes don't propagate to child components. Always inject as a reactive ref.
- **Svelte:** `setContext` must be called synchronously during component initialization. Calling it inside a reactive statement (`$:`) works only for setting the initial value — child components reading the context must use `getContext` in their own `<script>` block.

## Middleware Integration

Ward has no framework-specific middleware — `guardRequest` and `guardRequestWith` are small, framework-agnostic helpers you wire into a 2–3 line adapter for whichever server you use.

```ts
import { guardRequest, guardRequestWith } from '@vielzeug/ward';

// Principal is already resolved (e.g. from session) — sync, no await needed
const result = guardRequest(ward, principal, 'posts', 'update');

// Principal must be extracted from a request object (e.g. verify JWT) — async
const result = await guardRequestWith(ward, req, getPrincipal, 'posts', 'update');

if (!result.granted) {
  return new Response(JSON.stringify({ reason: result.reason }), { status: 403 });
}
```

### Express / Connect

```ts
app.use('/posts', async (req, res, next) => {
  const result = await guardRequestWith(ward, req, (r) => r.user ?? null, 'posts:*', 'update');
  result.granted ? next() : res.status(403).json({ reason: result.reason });
});
```

### Hono

```ts
app.put('/posts/:id', async (c, next) => {
  const result = guardRequest(ward, c.get('user') ?? null, `posts:${c.req.param('id')}`, 'update');
  return result.granted ? next() : c.json({ reason: result.reason }, 403);
});
```

## Debug Mode

Import `debugWard` from the dedicated sub-path to create a ward with decision logging pre-enabled. The sub-path is tree-shaken from production bundles when not imported.

```ts
import { debugWard } from '@vielzeug/ward/devtools';

const permit = debugWard([
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow' },
]);

permit.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');
// [ward:decision] allow             (allow)   viewer  posts  read

permit.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'update');
// [ward:decision] no-matching-rule            viewer  posts  update

permit.explain(null, 'posts', 'read');
// [ward:decision] no-matching-rule            anonymous  posts  read
```

The ward returned is identical to `createWard()` — all methods (`explain`, `checkAll`, `forUser`, etc.) work the same way.

Alternatively, pass a custom `logger` directly to `createWard()` to route decisions to a structured logger:

```ts
const permit = createWard(rules, {
  logger: (ctx) => myLogger.debug('access decision', ctx),
});
```

Debug logging fires on `explain()` and `checkAll()` (including through a `BoundWard`). It does **not** fire on `trace()`, or on the side-effect-free helpers `allowedActions()`, `rulesInScope()`, and `detectConflicts()`.

## Working with Other Vielzeug Libraries

### With Wayfinder

Use ward guards inside Wayfinder middleware to protect routes.

```ts
import { createWard } from '@vielzeug/ward';
import { createRouter } from '@vielzeug/wayfinder';

type User = { id: string; roles: string[] };

const ward = createWard([{ role: 'admin', resource: 'settings', action: 'read', effect: 'allow' }]);

const router = createRouter({
  routes: {
    settings: {
      path: '/settings',
      handler: ({ data }) => renderSettings(data),
    },
  },
  middleware: [
    (ctx, next) => {
      const user: User = getSessionUser(); // your auth provider
      if (!ward.explain(user, 'settings', 'read').allowed) {
        return ctx.navigate({ path: '/login' });
      }
      return next();
    },
  ],
});
```

### With Rune

Use ward's `logger` option to audit every access decision.

```ts
import { createWard } from '@vielzeug/ward';
import { createLogger } from '@vielzeug/rune';

const log = createLogger({ namespace: 'ward' });

const ward = createWard(
  [
    /* rules */
  ],
  {
    logger: (decision) => log.info('access decision', decision),
  },
);
```

## Best Practices

- Keep roles and resources explicit and predictable.
- Use `priority` sparingly for explicit overrides.
- Keep `when` predicates pure and side-effect free.
- Prefer one ward instance per app boundary and keep rules centralized.
- Use `forUser({ ... })` for repeated checks in UI or request scopes.
