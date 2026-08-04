---
title: 'Ward Examples — Trace a Decision'
description: 'Inspect competing Ward rules and the winning authorization decision.'
---

## Trace a Decision

### Problem

Diagnose why a policy allowed or denied a request when several rules appear relevant.

### Solution

Use `trace()` to inspect the decision and every candidate rule without invoking the policy logger.

```ts
import { createWard } from '@vielzeug/ward';

const ward = createWard([
  { role: '*', resource: 'posts', action: 'read', effect: 'allow', priority: 0 },
  { role: 'editor', resource: 'posts', action: 'read', effect: 'allow', priority: 0 },
  { role: 'blocked', resource: 'posts', action: 'read', effect: 'deny', priority: 5 },
]);

const { decision, candidates } = ward.trace({
  principal: { id: 'u1', roles: ['editor', 'blocked'] },
  resource: 'posts',
  action: 'read',
});

candidates.forEach((candidate) => {
  console.log(candidate.index, candidate.rule.effect, candidate.priority, candidate.score, candidate.won);
});

console.log(decision.allowed ? 'allow' : decision.reason);
```

### Pitfalls

- Candidate order is diagnostic output, not a replacement for understanding precedence.
- `trace()` does not call the configured logger.

### Related

- [Priority and Overrides](./inheritance-and-overrides.md)
- [Rule Specificity](./disabling-wildcard-fallback.md)
- [Conflict Detection](./conflict-detection.md)
