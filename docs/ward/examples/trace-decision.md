---
title: 'Ward Examples — Explain a Decision'
description: 'Use deterministic decision reasons to diagnose policy order.'
---

## Explain a Decision

### Problem

A denied request needs a deterministic diagnostic explanation.

### Solution

`decide()` returns the matched rule and a deterministic reason.

```ts
const decision = ward.decide({
  action: 'read',
  principal: { id: 'u1', roles: ['blocked'] },
  resource: 'posts',
});

console.log(decision.effect, decision.reason, decision.rule);
```

### Pitfalls

Reasons are diagnostic strings, not stable user-facing copy.

### Related

- [Review rule order](./conflict-detection.md)
