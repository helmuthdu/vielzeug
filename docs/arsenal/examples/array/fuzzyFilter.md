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
  { email: 'alice@example.com', name: 'Alice Smith' },
  { email: 'alan@example.com', name: 'Alan Jones' },
];

const filtered = fuzzyFilter(users, 'alice', { select: (user) => [user.name, user.email] });
const ranked = fuzzyScore(users, 'ali', { select: (user) => user.name });
```

### Pitfalls

- Object collections require `select`.
- Selector result defines all searchable data.
- String arrays need no selector.
