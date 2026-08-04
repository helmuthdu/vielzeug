---
title: 'Arsenal Examples — fuzzyFilter / fuzzyScore'
description: 'Explicit-field fuzzy search examples for @vielzeug/arsenal.'
---

## fuzzyFilter / fuzzyScore

### Problem

You need fuzzy search over known object fields without recursively scanning arbitrary data.

### Solution

```ts
import { fuzzyFilter, fuzzyScore } from '@vielzeug/arsenal/array';

const users = [
  { id: 1, name: 'Alice Smith', role: 'admin' },
  { id: 2, name: 'Alan Jones', role: 'user' },
  { id: 3, name: 'Bob Brown', role: 'user' },
];

const filtered = fuzzyFilter(users, 'alice', { select: (user) => [user.name, user.role] });
const ranked = fuzzyScore(users, 'ali', { select: (user) => user.name, threshold: 0.3 });
```

### Pitfalls

- Object collections require `select`.
- String arrays can omit `select`.
- An empty query returns all items; scored results receive score `1`.
