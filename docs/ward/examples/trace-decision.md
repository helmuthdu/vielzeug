---
title: 'Ward Examples — Trace a Decision'
description: 'Inspect the full candidate list for a ward authorization decision.'
---

## Trace a Decision

### Problem

A rule is not matching as expected and you need to understand which rules were considered, how they scored against each other, and why a particular rule won. `explain()` gives you the winner but not the full picture.

### Solution

Use `ward.trace()` to get every candidate rule that matched the principal, resource, and action, along with their priority, specificity score, and whether they won:

```ts
import { createWard } from '@vielzeug/ward';

const ward = createWard([
  { role: '*', resource: 'posts', action: 'read', effect: 'allow', priority: 0 },
  { role: 'editor', resource: 'posts', action: 'read', effect: 'allow', priority: 0 },
  { role: 'blocked', resource: 'posts', action: 'read', effect: 'deny', priority: 5 },
]);

const { decision, candidates } = ward.trace({ id: 'u1', roles: ['editor', 'blocked'] }, 'posts', 'read');

candidates.forEach(({ rule, priority, score, won }) => {
  console.log(
    `[${won ? 'WINNER' : '      '}]`,
    `effect=${rule.effect}`,
    `role=${rule.role}`,
    `priority=${priority}`,
    `score=${score}`,
  );
});

console.log('Decision:', decision.allowed ? 'allow' : `deny (${decision.reason})`);
```

Example output:

```
[      ] effect=allow role=* priority=0 score=4
[      ] effect=allow role=editor priority=0 score=5
[WINNER] effect=deny  role=blocked priority=5 score=5
Decision: deny (explicit-deny)
```

`blocked` wins here on `priority` alone (5 beats 0) — its score just happens to tie with `editor`'s. Priority is always checked before specificity.

### Candidate fields explained

| Field      | Type       | Description                                                                                                             |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| `index`    | `number`   | The rule's original index in the array passed to `createWard`.                                                          |
| `rule`     | `WardRule` | The compiled rule that matched. Frozen — mutations throw.                                                                |
| `priority` | `number`   | The rule's `priority` value (default `0`).                                                                              |
| `score`    | `number`   | Specificity score (0–5): `roleScore(0\|1) + resourceScore(0\|1\|2) + actionScore(0\|1\|2)`. Higher is more specific.     |
| `won`      | `boolean`  | `true` for exactly one candidate — the winner.                                                                          |

### Trace with `BoundWard`

`trace()` is available on `BoundWard` instances returned by `ward.forUser()`:

```ts
const bound = ward.forUser({ id: 'u1', roles: ['editor'] });

const { decision, candidates } = bound.trace('posts', 'read');
```

### Audit safety

Unlike `explain()`, `trace()` does **not** fire the logger — it is a side-channel-free inspection tool for debugging, not for auditing. If you need both the audit trail and the full candidate list, call `explain()` for the log and `trace()` for the diagnostics:

```ts
const ward = createWard(rules, {
  logger: (ctx) => {
    const outcome = ctx.allowed ? 'allow' : ctx.reason;
    console.log(outcome, ctx.principal?.id, ctx.resource, ctx.action);
  },
});

ward.explain(principal, 'posts', 'read'); // logs once
ward.trace(principal, 'posts', 'read'); // never logs
```

### Pitfalls

- `candidates` only contains rules that **matched** (role, resource, and action all passed pattern matching). Rules that never applied are absent.
- If no rules matched at all, `candidates` is empty and `decision` has `reason: 'no-matching-rule'`.
- Rules with `when` predicates appear in `candidates` only when the predicate passes. If the predicate returns `false`, the rule is excluded.

### Related

- [Logger For Auditing](./logger-for-auditing.md)
- [Conflict Detection](./conflict-detection.md)
- [Inheritance And Overrides](./inheritance-and-overrides.md)
