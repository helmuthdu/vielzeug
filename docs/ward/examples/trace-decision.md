---
title: 'Ward Examples — Trace a Decision'
description: 'Inspect the full candidate list for a ward authorization decision.'
---

## Trace a Decision

### Problem

A rule is not matching as expected and you need to understand which rules were considered, how they scored against each other, and why a particular rule won. `explain()` gives you the winner but not the full picture.

### Solution

Use `ward.trace()` to get every candidate rule that matched the principal, resource, and action, along with their priority, specificity score, deny bonus, and whether they won:

```ts
import { createWard } from '@vielzeug/ward';

const ward = createWard([
  { role: '*',      resource: 'posts', action: 'read', effect: 'allow', priority: 0 },
  { role: 'editor', resource: 'posts', action: 'read', effect: 'allow', priority: 0 },
  { role: 'blocked', resource: 'posts', action: 'read', effect: 'deny',  priority: 5 },
]);

const { decision, candidates } = ward.trace(
  { id: 'u1', roles: ['editor', 'blocked'] },
  'posts',
  'read',
);

candidates.forEach(({ rule, priority, score, denyBonus, won }) => {
  console.log(
    `[${won ? 'WINNER' : '      '}]`,
    `effect=${rule.effect}`,
    `role=${rule.role}`,
    `priority=${priority}`,
    `score=${score}`,
    `denyBonus=${denyBonus}`,
  );
});

console.log('Decision:', decision.allowed ? 'allow' : `deny (${decision.reason})`);
```

Example output:
```
[      ] effect=allow role=* priority=0 score=0 denyBonus=0
[      ] effect=allow role=editor priority=0 score=1 denyBonus=0
[WINNER] effect=deny  role=blocked priority=5 score=1 denyBonus=1
Decision: deny (explicit-deny)
```

### Candidate fields explained

| Field | Type | Description |
|---|---|---|
| `rule` | `WardRule` | The compiled rule that matched. Frozen — mutations throw. |
| `priority` | `number` | The rule's `priority` value (default `0`). |
| `score` | `number` | Specificity score across role + resource + action (`exact=1`, `ns:*=0.5`, `*=0`). Higher is more specific. |
| `denyBonus` | `0 \| 1` | `1` for `deny` rules, `0` for `allow`. Tie-breaks in favour of explicit denials. |
| `won` | `boolean` | `true` for exactly one candidate — the winner. |

### Trace with `BoundWard`

`trace()` is available on `BoundWard` instances returned by `ward.forUser()`:

```ts
const bound = ward.forUser({ id: 'u1', roles: ['editor'] });

const { decision, candidates } = bound.trace('posts', 'read');
```

### Audit safety

`trace()` fires the logger with the same payload as `explain()`. Switching from `explain` to `trace` for richer diagnostics does not silently suppress audit records.

```ts
const ward = createWard(rules, {
  logger: (ctx) => {
    // ctx is the same shape whether you call explain() or trace()
    console.log(ctx.decision, ctx.principal?.id, ctx.resource, ctx.action);
  },
});

ward.explain(principal, 'posts', 'read'); // logs once
ward.trace(principal, 'posts', 'read');   // also logs once
```

### Pitfalls

- `candidates` only contains rules that **matched** (role, resource, and action all passed pattern matching). Rules that never applied are absent.
- If no rules matched at all, `candidates` is empty and `decision` has `reason: 'no-matching-rule'`.
- Rules with `when` predicates appear in `candidates` only when the predicate passes. If the predicate returns `false`, the rule is excluded.

### Related

- [Logger For Auditing](./logger-for-auditing.md)
- [Conflict Detection](./conflict-detection.md)
- [Inheritance And Overrides](./inheritance-and-overrides.md)
