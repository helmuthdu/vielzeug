---
title: Conduit Examples — Lifetimes
description: Choose singleton or transient ownership.
---

## Lifetimes

### Problem

Control whether a factory result is shared or created for each resolution.

### Solution

```ts
const Singleton = token<object>('Singleton');
const Transient = token<object>('Transient');

container.factory(Singleton, [], () => ({}));
container.factory(Transient, [], () => ({}), { lifetime: 'transient' });
```

### Pitfalls

A transient remains owned only when its factory declares `dispose`. Non-disposable transient values are released to normal garbage collection after callers release them.

### Related

- [Usage Guide](../usage.md#choose-lifetimes)
