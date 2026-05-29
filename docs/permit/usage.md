---
title: Permit — Usage Guide
description: Build deterministic authorization policies with immutable rule sets, wildcard support, and runtime predicates.
---

[[toc]]

## Basic Usage

Create a permit instance with an array of rules. Rules are compiled once at creation time.

```ts
import { WILDCARD, createPermit } from '@vielzeug/permit';

const permit = createPermit([
  { role: 'viewer',  resource: 'posts', action: 'read',   effect: 'allow' },
  { role: 'editor',  resource: 'posts', action: 'update', effect: 'allow' },
  // High-priority deny blocks the blocked role from every action on posts
  { role: 'blocked', resource: 'posts', action: WILDCARD,  effect: 'deny', priority: 100 },
]);

permit.can({ id: 'u1', roles: ['viewer'] },  'posts', 'read');   // true
permit.can({ id: 'u1', roles: ['viewer'] },  'posts', 'update'); // false
permit.can({ id: 'u2', roles: ['blocked'] }, 'posts', 'read');   // false
```

To update the policy, create a new instance — rules are immutable after creation.

## Check Permissions

```ts
const principal = { id: 'u1', roles: ['editor'] };

permit.can(principal, 'posts', 'read');
permit.can(principal, 'posts', 'delete');
permit.can(null, 'posts', 'read');
```

`principal` must be either:

- `null` for anonymous users
- `{ id: string, roles: readonly string[] }` for authenticated users

Malformed principal values throw errors.

## Bind a User with `forUser`

```ts
const bound = permit.forUser({ id: 'u1', roles: ['editor'] });

bound.can('posts', 'read');
bound.can('posts', 'update', { authorId: 'u1' });
```

`forUser()` returns a reusable bound permit object and snapshots roles/attributes at binding time.

## Check Multiple Actions

```ts
permit.canAll({ id: 'u1', roles: ['editor'] }, 'posts', ['read', 'update'], { authorId: 'u1' });
permit.canAny({ id: 'u1', roles: ['editor'] }, 'posts', ['update', 'delete'], { authorId: 'u1' });
```

Use `canAll()` when every action must pass, and `canAny()` when one passing action is enough.

## Batch Decisions with `checkAll`

```ts
const decisions = permit.checkAll({ id: 'u1', roles: ['editor'] }, [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'update', data: { authorId: 'u1' } },
]);

const bound = permit.forUser({ id: 'u1', roles: ['editor'] });
const boundDecisions = bound.checkAll([
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'delete' },
]);
```

`checkAll()` returns one decision per input check in the same order.

## List Allowed Actions

`allowedActions(principal, resource, knownActions, data?)` returns the subset of `knownActions` that the principal is allowed to perform on `resource`.

`knownActions` is required because Permit cannot enumerate actions on its own — an action defined with `WILDCARD` has no finite list of concrete values. Passing `knownActions` resolves wildcard-action rules against that set:

```ts
// Returns the subset of the provided list that is allowed
const actions = permit.allowedActions(
  { id: 'u1', roles: ['admin'] },
  'posts',
  ['read', 'update', 'delete'],
);

// With runtime data for predicate-gated rules
const ownedActions = permit.allowedActions(
  { id: 'u1', roles: ['editor'] },
  'posts',
  ['read', 'update', 'delete'],
  { authorId: 'u1' },
);
```

`allowedActions` does not invoke the logger — it is a side-effect-free enumeration helper.

## Inspect Rule Scope with `rulesInScope`

```ts
const rules = permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts');
const narrowed = permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' });

const bound = permit.forUser({ id: 'u1', roles: ['editor'] });
const boundRules = bound.rulesInScope('posts');
```

`rulesInScope()` is introspection-only. It returns rules in scope for the principal/resource pair and never mutates the permit.
If you pass `data`, Permit also filters predicate rules by whether they match that runtime payload.

## Explain Denials and Winners

```ts
const decision = permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'delete');

if (!decision.allowed) {
  console.log(decision.reason); // 'no-matching-rule' | 'explicit-deny'
}
```

`explain()` returns a discriminated union that includes the winning rule for allow decisions and explicit deny decisions.

## Use Dynamic Conditions with `when`

```ts
const permit = createPermit<'update', { authorId: string }>([
  {
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: ({ principal, data }) => principal.id === data?.authorId,
  },
]);
```

`when` only runs for authenticated principals. For anonymous (`null`) checks, `when` rules do not match.

### Ownership Checks with `owns`

```ts
import { createPermit, owns } from '@vielzeug/permit';

const permit = createPermit<'update', { authorId: string }>([
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
const permit = createPermit<'publish'>([
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
import { createPermit } from '@vielzeug/permit';

const permit = createPermit([
  // One rule instead of three separate allow rules
  { role: ['viewer', 'editor', 'admin'], resource: 'posts', action: 'read',   effect: 'allow' },
  { role: ['editor', 'admin'],           resource: 'posts', action: 'update', effect: 'allow' },
  { role: 'admin',                       resource: 'posts', action: 'delete', effect: 'allow' },
]);

permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');   // true
permit.can({ id: 'u2', roles: ['editor'] }, 'posts', 'update'); // true
permit.can({ id: 'u2', roles: ['editor'] }, 'posts', 'delete'); // false
```

`ANONYMOUS` works inside multi-role arrays. The rule matches both unauthenticated visitors and any authenticated role listed alongside it:

```ts
import { ANONYMOUS, createPermit } from '@vielzeug/permit';

const permit = createPermit([
  { role: [ANONYMOUS, 'viewer'], resource: 'posts', action: 'read', effect: 'allow' },
]);

permit.can(null, 'posts', 'read');                             // true (anonymous)
permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read'); // true (viewer)
permit.can({ id: 'u2', roles: ['admin'] }, 'posts', 'read');  // false (not in list)
```

## Anonymous and Wildcards

```ts
import { ANONYMOUS, WILDCARD } from '@vielzeug/permit';

const permit = createPermit([
  { role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' },
  { role: WILDCARD, resource: 'status', action: 'read', effect: 'allow' },
]);
```

Use `ANONYMOUS` for anonymous-only rules and `WILDCARD` for any role/resource/action.

## Logger and Auditing

```ts
const permit = createPermit([{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }], {
  logger: ({ action, decision, principal, resource, rule }) => {
    const subject = principal === null ? 'anonymous' : principal.id;
    console.log(subject, resource, action, decision, rule?.effect);
  },
});
```

The logger runs after decision methods like `can()`, `canAll()`, `canAny()`, `checkAll()`, and `explain()`.
Enumeration and introspection helpers like `allowedActions()` and `rulesInScope()` stay side-effect free.

## Decision Precedence

Permit uses one deterministic model:

1. If no rule matches, decision is deny.
2. Higher `priority` wins.
3. For equal `priority`, higher specificity wins (non-wildcards are more specific).
4. For equal `priority` and specificity, deny overrides allow.

## Exact Matching

Permit uses exact string matching for role/resource/action.

```ts
const permit = createPermit([{ role: 'admin', resource: 'posts', action: 'read', effect: 'allow' }]);

permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read'); // true
permit.can({ id: 'u1', roles: ['ADMIN'] }, 'posts', 'read'); // false
```

Adopt one identifier convention (for example all lowercase) at your app boundary.

## Framework Integration

::: code-group

```tsx [React]
import { createContext, useContext, type ReactNode } from 'react';
import { createPermit } from '@vielzeug/permit';

type User = { id: string; roles: string[] };

const permit = createPermit([
  { role: 'admin', resource: '*', action: '*', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'write', effect: 'allow' },
]);

const UserContext = createContext<User | null>(null);

function usePermit(resource: string, action: string) {
  const user = useContext(UserContext);
  if (!user) return false;
  return permit.can(user, resource, action);
}

function EditButton({ postId }: { postId: string }) {
  const canEdit = usePermit('posts', 'write');
  if (!canEdit) return null;
  return <button>Edit {postId}</button>;
}
```

```ts [Vue 3]
import { computed } from 'vue';
import { createPermit } from '@vielzeug/permit';

type User = { id: string; roles: string[] };

const permit = createPermit([
  { role: 'admin', resource: '*', action: '*', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'write', effect: 'allow' },
]);

function usePermit(user: { value: User | null }, resource: string, action: string) {
  return computed(() => user.value ? permit.can(user.value, resource, action) : false);
}
```

```svelte [Svelte]
<script lang="ts">
  import { createPermit } from '@vielzeug/permit';

  type User = { id: string; roles: string[] };

  export let user: User;

  const permit = createPermit([
    { role: 'admin', resource: '*', action: '*', effect: 'allow' },
    { role: 'editor', resource: 'posts', action: 'write', effect: 'allow' },
  ]);

  $: canEdit = permit.can(user, 'posts', 'write');
</script>

{#if canEdit}<button>Edit</button>{/if}
```

:::


### Pitfalls

- **React:** If `PermitProvider` is placed inside a component that re-renders often, `createPermit()` is called on every render. Memoize with `useMemo(() => createPermit(...), [role])`.
- **Vue 3:** Injecting `permit` as a plain value (not a `ComputedRef`) means role changes don't propagate to child components. Always inject as a reactive ref.
- **Svelte:** `setContext` must be called synchronously during component initialization. Calling it inside a reactive statement (`$:`) works only for setting the initial value — child components reading the context must use `getContext` in their own `<script>` block.

## Working with Other Vielzeug Libraries

### With Route

Use permit guards inside Route middleware to protect routes.

```ts
import { createPermit } from '@vielzeug/permit';
import { createRouter } from '@vielzeug/route';

type User = { id: string; roles: string[] };

const permit = createPermit([
  { role: 'admin', resource: 'settings', action: 'read', effect: 'allow' },
]);

const router = createRouter({
  routes: {
    settings: {
      path: '/settings',
      handler: ({ data }) => renderSettings(data),
    },
  },
  middleware: [(ctx, next) => {
    const user: User = getSessionUser(); // your auth provider
    if (!permit.can(user, 'settings', 'read')) {
      return ctx.navigate({ path: '/login' });
    }
    return next();
  }],
});
```

### With Rune

Use permit's `logger` option to audit every access decision.

```ts
import { createPermit } from '@vielzeug/permit';
import { createLogger } from '@vielzeug/rune';

const log = createLogger({ namespace: 'permit' });

const permit = createPermit([/* rules */], {
  logger: (decision) => log.info('access decision', decision),
});
```

## Best Practices

- Keep roles and resources explicit and predictable.
- Use `priority` sparingly for explicit overrides.
- Keep `when` predicates pure and side-effect free.
- Prefer one permit instance per app boundary and keep rules centralized.
- Use `forUser({ ... })` for repeated checks in UI or request scopes.
