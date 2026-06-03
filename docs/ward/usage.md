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

ward.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read'); // true
ward.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'update'); // false
ward.can({ id: 'u2', roles: ['blocked'] }, 'posts', 'read'); // false
```

To update the policy, create a new instance — rules are immutable after creation.

## Fluent Rule Builder

Use the `rule()` builder as an alternative to raw rule objects. It's especially readable for rules with multiple actions or predicates:

```ts
import { createWard, owns, rule } from '@vielzeug/ward';

const ward = createWard<'read' | 'update' | 'delete', { authorId: string }>([
  ...rule<'read' | 'update' | 'delete', { authorId: string }>()
    .allow(['viewer', 'editor'])
    .on('posts')
    .to('read')
    .build(),

  ...rule<'read' | 'update' | 'delete', { authorId: string }>()
    .allow('editor')
    .on('posts')
    .to('update', 'delete')
    .when(owns('authorId'))
    .build(),
]);
```

Each `.to()` call produces one rule per action. Spread `build()` into the outer array.

Chain `.priority(n)` before or after `.when()` to set the rule priority:

```ts
rule().deny('blocked').on('posts').to(WILDCARD).priority(100).build();
// or after .when():
rule().allow('editor').on('posts').to('update').when(owns('authorId')).priority(5).build();
```

## Hierarchical Resources

Use colon-namespaced patterns to scope rules to resource instances:

```ts
const ward = createWard([
  // Applies to any resource under 'posts:' namespace
  { role: 'editor', resource: 'posts:*', action: 'update', effect: 'allow' },
  // Applies only to one specific post
  { role: 'viewer', resource: 'posts:123', action: 'read', effect: 'allow' },
]);

ward.can(editor, 'posts:456', 'update'); // true  — matches posts:*
ward.can(viewer, 'posts:123', 'read'); // true  — exact match
ward.can(viewer, 'posts:456', 'read'); // false — no matching rule
```

The same namespace-wildcard syntax works for actions (action hierarchy):

```ts
// 'read:*' matches 'read:own', 'read:all', 'read:draft:1', etc.
const ward = createWard([{ role: 'viewer', resource: 'posts', action: 'read:*', effect: 'allow' }]);

ward.can(viewer, 'posts', 'read:own'); // true
ward.can(viewer, 'posts', 'read:all'); // true
ward.can(viewer, 'posts', 'write'); // false
```

`matchesPattern(pattern, value)` is exported for custom integration code. `patternCovers(broad, narrow)` is exported to test whether one pattern statically covers another (used by `detectConflicts`).

## Check Permissions

```ts
const principal = { id: 'u1', roles: ['editor'] };

ward.can(principal, 'posts', 'read');
ward.can(principal, 'posts', 'delete');
ward.can(null, 'posts', 'read');
```

`principal` must be either:

- `null` for anonymous users
- `{ id: string, roles: readonly string[] }` for authenticated users

Malformed principal values throw errors.

## Bind a User with `forUser`

```ts
const bound = ward.forUser({ id: 'u1', roles: ['editor'] });

bound.can('posts', 'read');
bound.can('posts', 'update', { authorId: 'u1' });
```

`forUser()` returns a reusable bound ward object and snapshots roles/attributes at binding time.

## Check Multiple Actions

```ts
ward.canAll({ id: 'u1', roles: ['editor'] }, 'posts', ['read', 'update'], { authorId: 'u1' });
ward.canAny({ id: 'u1', roles: ['editor'] }, 'posts', ['update', 'delete'], { authorId: 'u1' });
```

Use `canAll()` when every action must pass, and `canAny()` when one passing action is enough.

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

`checkAll()` returns one decision per input check in the same order.

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

`trace()` fires the logger with the same context as `explain()` — audit records are preserved when you switch from `explain` to `trace` for richer diagnostics.

`trace()` is also available on `BoundWard`: `bound.trace(resource, action, data?)`.

## Detect Policy Conflicts

`detectConflicts()` performs a static O(n²) analysis of your rule set and returns all detected conflicts. The result is lazily computed and cached after the first call.

```ts
const conflicts = ward.detectConflicts();

conflicts.forEach(({ kind, rule, ruleIndex, shadowedBy, shadowedByIndex }) => {
  console.warn(`Rule[${ruleIndex}] is ${kind} by Rule[${shadowedByIndex}]`);
});
```

Two conflict kinds:

- **`'duplicate'`** — two predicate-free rules have the same (role set, resource, action). The second can never fire because the first always wins.
- **`'shadowed'`** — a higher-ranked predicate-free rule covers the other's patterns entirely. The lower-ranked rule can never win.

Rules with a `when` predicate are excluded from both checks because their applicability is determined at runtime, not statically.

To surface conflicts eagerly at startup:

```ts
// Warn on conflicts
const ward = createWard(rules, {
  onConflict: (c) => console.warn(`[ward] ${c.kind}: Rule[${c.ruleIndex}] shadowed by Rule[${c.shadowedByIndex}]`),
});

// Throw on first conflict (strict mode)
const ward = createWard(rules, { strict: true });

// Cap O(n²) cost for large auto-generated policies
const ward = createWard(rules, { maxConflicts: 20 });
```

## Typed Rule Slices with `defineRules`

Use `defineRules` to define typed rule slices that can be spread into `createWard`. The value is entirely in generic type inference — the function returns the array unchanged.

```ts
import { defineRules, rule, owns } from '@vielzeug/ward';

type PostAction = 'read' | 'update' | 'delete';
type Post = { authorId: string };

const postsRules = defineRules<PostAction, Post>([
  ...rule<PostAction, Post>().allow(['viewer', 'editor']).on('posts:*').to('read').build(),
  ...rule<PostAction, Post>().allow('editor').on('posts:*').to('update').when(owns('authorId')).build(),
]);

const ward = createWard([...postsRules, ...commentsRules]);
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

ward.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read'); // true
ward.can({ id: 'u2', roles: ['editor'] }, 'posts', 'update'); // true
ward.can({ id: 'u2', roles: ['editor'] }, 'posts', 'delete'); // false
```

`ANONYMOUS` works inside multi-role arrays. The rule matches both unauthenticated visitors and any authenticated role listed alongside it:

```ts
import { ANONYMOUS, createWard } from '@vielzeug/ward';

const ward = createWard([{ role: [ANONYMOUS, 'viewer'], resource: 'posts', action: 'read', effect: 'allow' }]);

ward.can(null, 'posts', 'read'); // true (anonymous)
ward.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read'); // true (viewer)
ward.can({ id: 'u2', roles: ['admin'] }, 'posts', 'read'); // false (not in list)
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
  logger: ({ action, decision, principal, resource }) => {
    const subject = principal === null ? 'anonymous' : principal.id;
    console.log(subject, resource, action, decision);
  },
});
```

The logger runs after `can()`, `canAll()`, `canAny()`, `checkAll()`, `explain()`, and `trace()`.
Enumeration and introspection helpers (`allowedActions()`, `rulesInScope()`) stay side-effect free.

The `WardLoggerContext` type is a **discriminated union** on `decision` — `rule` is only present on `'allow'` and `'explicit-deny'`:

```ts
logger: (ctx) => {
  if (ctx.decision !== 'no-matching-rule') {
    console.log(ctx.rule.role); // no ?. needed — rule is present
  }
},
```

- `'allow'` — a matching allow rule won
- `'explicit-deny'` — a matching deny rule won
- `'no-matching-rule'` — no rule matched at all (default deny)

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

ward.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read'); // true
ward.can({ id: 'u1', roles: ['ADMIN'] }, 'posts', 'read'); // false
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
  return ward.can(user, resource, action);
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
  return computed(() => (user.value ? ward.can(user.value, resource, action) : false));
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

  $: canEdit = ward.can(user, 'posts', 'write');
</script>

{#if canEdit}<button>Edit</button>{/if}
```

:::

### Pitfalls

- **React:** If `WardProvider` is placed inside a component that re-renders often, `createWard()` is called on every render. Memoize with `useMemo(() => createWard(...), [role])`.
- **Vue 3:** Injecting `ward` as a plain value (not a `ComputedRef`) means role changes don't propagate to child components. Always inject as a reactive ref.
- **Svelte:** `setContext` must be called synchronously during component initialization. Calling it inside a reactive statement (`$:`) works only for setting the initial value — child components reading the context must use `getContext` in their own `<script>` block.

## Middleware Integration

Ward ships built-in middleware factories for Express-compatible and Hono-compatible servers.

### Express / Connect

```ts
import { createWard, createExpressGuard } from '@vielzeug/ward';

const ward = createWard([{ role: 'editor', resource: 'posts:*', action: 'update', effect: 'allow' }]);

const requireEdit = createExpressGuard(ward, (req) => req.user ?? null, 'posts:*', 'update');

// With static data forwarded to when predicates:
const requireEditOwn = createExpressGuard(ward, (req) => req.user ?? null, 'posts:*', 'update', {
  data: resolvePostData(),
});

app.put('/posts/:id', requireEdit, handler);
```

On denial, returns `403 { reason: 'explicit-deny' | 'no-matching-rule' }`. Override with `options.onDenied`.

### Hono

```ts
import { createWard, createHonoGuard } from '@vielzeug/ward';

const ward = createWard([{ role: 'editor', resource: 'posts:*', action: 'update', effect: 'allow' }]);

const requireEdit = createHonoGuard(ward, (c) => c.get('user') ?? null, 'posts:*', 'update');

// With static data:
const requireEditOwn = createHonoGuard(ward, (c) => c.get('user') ?? null, 'posts:*', 'update', {
  data: resolvePostData(),
});

app.put('/posts/:id', requireEdit, handler);
```

Errors from the principal extractor propagate to Hono's `app.onError` handler. Wrap your extractor if finer control is needed.

### Framework-agnostic guard

Use `guardRequest` or `guardRequestWith` to wire Ward into any async middleware pattern.

```ts
import { guardRequest, guardRequestWith } from '@vielzeug/ward';

// Principal is already resolved (e.g. from session)
const result = await guardRequest(ward, principal, 'posts', 'update');

// Principal must be extracted from a request object (e.g. verify JWT)
const result = await guardRequestWith(ward, req, getPrincipal, 'posts', 'update');

if (!result.granted) {
  return new Response(JSON.stringify({ reason: result.reason }), { status: 403 });
}
```

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
      if (!ward.can(user, 'settings', 'read')) {
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

## Debug Mode

Import `debugWard` from the dedicated sub-path to create a ward with decision logging pre-enabled. The sub-path is tree-shaken from production bundles when not imported.

```ts
import { debugWard } from '@vielzeug/ward/debug';

const permit = debugWard([
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow' },
]);

permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');
// [ward:decision] allow             viewer  posts  read

permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'update');
// [ward:decision] no-matching-rule  viewer  posts  update

permit.can(null, 'posts', 'read');
// [ward:decision] no-matching-rule  anonymous  posts  read
```

The ward returned is identical to `createWard()` — all methods (`can`, `canAll`, `explain`, `forUser`, etc.) work the same way.

Alternatively, pass a custom `logger` directly to `createWard()` to route decisions to a structured logger:

```ts
const permit = createWard(rules, {
  logger: (ctx) => myLogger.debug('access decision', ctx),
});
```

Debug logging fires on `can`, `canAll`, `canAny`, `checkAll`, and `trace`. It does **not** fire on side-effect-free helpers (`allowedActions`, `rulesInScope`, `detectConflicts`).

## Best Practices

- Keep roles and resources explicit and predictable.
- Use `priority` sparingly for explicit overrides.
- Keep `when` predicates pure and side-effect free.
- Prefer one ward instance per app boundary and keep rules centralized.
- Use `forUser({ ... })` for repeated checks in UI or request scopes.
