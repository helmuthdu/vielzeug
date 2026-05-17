---
title: Wireit Example - Lifetimes
description: Singleton, transient, and scoped lifetimes.
---

# Lifetimes

```ts
const Counter = createToken<{ id: number }>('Counter');
let nextId = 0;

container.factory(Counter, () => ({ id: ++nextId }));

const singletonA = await container.resolve(Counter);
const singletonB = await container.resolve(Counter);
```

`singleton` caches the first result, `transient` returns a new value every time, and `scoped` caches once per child container.

```ts
container.factory(Counter, () => ({ id: ++nextId }), { lifetime: 'transient' });
container.factory(Counter, () => ({ id: ++nextId }), { lifetime: 'scoped' });
```
