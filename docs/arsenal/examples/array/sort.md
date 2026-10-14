---
title: 'Arsenal Examples: sort'
description: 'sort example for @vielzeug/arsenal.'
---

## sort

### Problem

You need to sort an array by one or multiple fields without mutating the original, and with clear asc/desc control per field.

### Solution

Use an ordered criteria array when column paths or priority come from a data grid. Each criterion accepts a property key or a dotted/bracketed path, and omitted directions default to ascending.

```ts
import { sort } from '@vielzeug/arsenal';

const users = [
  { address: { city: 'Berlin' }, age: 27, name: 'Linus' },
  { address: { city: 'Aachen' }, age: 30, name: 'Grace' },
  { address: { city: 'Berlin' }, age: 41, name: 'Ada' },
];

const ordered = sort(users, [
  { key: 'address.city' },
  { key: 'age', direction: 'desc' },
]);
ordered.map((user) => `${user.name} (${user.address.city})`);
// [
//   'Grace (Aachen)',
//   'Ada (Berlin)',
//   'Linus (Berlin)',
// ]
```

#### Single-field and keyed-field sorts

```ts
import { sort } from '@vielzeug/arsenal';

sort(users, (user) => user.name); // one extracted value
sort(users, { name: 'asc', age: 'desc' }); // keyed fields in property order
```

### Pitfalls

- Returns a new array; the original is never mutated.
- Criteria are evaluated in order; the first non-equal value decides the order, and ties keep input order.
- Criteria paths use safe path lookup; prototype-access segments do not expose inherited properties.
- A column mixing unsupported value types (for example, a number and a string) throws `TypeError`.
- String comparison uses `localeCompare`: results may differ from `<`/`>` comparisons.

### Related

- [search](./fuzzyFilter.md)
- [groupBy](./groupBy.md)
