---
title: 'Ripple Examples — Scope Ownership'
description: Dispose a group of reactive work through one explicit scope.
---

## Scope Ownership

### Problem

A temporary panel owns reactive work that must stop together when the panel closes. Individual effect disposal is easy to forget.

### Solution

Create a scope, create work inside `run()`, then dispose the scope.

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const scope = ripple.createScope('panel');
const count = ripple.signal(0);

scope.run(() => {
  ripple.effect(() => console.log(`Panel count: ${count.value}`));
});

count.value = 1;
scope.dispose();
count.value = 2;
ripple.dispose();
```

### Pitfalls

- Call `scope.run()` before creating work that belongs to the scope.
- Do not call `run()` after scope disposal.
- Dispose request and feature scopes even when their parent graph remains active.

### Related

- [Isolated Graph](./isolated-runtime.md)
- [Reactive Counter](./reactive-counter.md)
- [Ore](/ore/)
