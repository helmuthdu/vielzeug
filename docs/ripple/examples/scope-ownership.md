---
title: 'Ripple Examples: Scope Ownership'
description: Dispose a group of reactive work through one explicit scope.
---

## Scope Ownership

### Problem

A temporary panel owns reactive work that must stop together when the panel closes. Individual effect disposal is easy to forget.

### Solution

Create a scope, create work inside `run()`, then dispose the scope.

```ts
import { createScope, effect, onCleanup, signal } from '@vielzeug/ripple';

const scope = createScope({ name: 'panel' });
const count = signal(0);

scope.run(() => {
  effect(() => console.log(`Panel count: ${count.value}`));
  onCleanup(() => console.log('panel closed'));
});

count.value = 1;
scope.dispose();
count.value = 2;
```

### Pitfalls

- Call `scope.run()` before creating work that belongs to the scope.
- Do not call `run()` after scope disposal.
- Dispose request and feature scopes when their owner ends.

### Related

- [Usage Guide: Ownership with Scopes](../usage.md#ownership-with-scopes)
- [Reactive Counter](./reactive-counter.md)
- [Ore](/ore/)
