---
title: 'Arsenal Examples — not'
description: 'Invert a boolean predicate function.'
---

## not

### Problem

You have a predicate and need its inverse — for example filtering out items that match a condition, or composing negated guards.

### Solution

Use `not(predicate)` to return a new function that inverts the boolean result.

```ts
import { not } from '@vielzeug/arsenal';

const isActive = (user: { active: boolean }) => user.active;
const isInactive = not(isActive);

const inactiveUsers = users.filter(isInactive);

// Negate inline with Array methods
const validItems = formItems.filter(not((item) => item.errors.length > 0));
```

### Pitfalls

- `not` only inverts truthiness — it does not produce a TypeScript type narrowing predicate. Add an explicit `(x): x is T` overload if you need narrowed types on the result.
- Prefer `noneOf(pred)` over `not(pred)` when you need to combine multiple predicates at once.

### Related

- [allOf](./allOf.md)
- [noneOf](./allOf.md)
