---
title: 'Ward Examples — Trace a Decision'
description: 'Inspect the full candidate list for a ward authorization decision.'
---

## Trace a Decision

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

candidates.forEach((c) => {
  console.log(c.index, c.rule.effect, c.priority, c.score, c.won);
});

console.log(decision.allowed ? 'allow' : decision.reason);
```
