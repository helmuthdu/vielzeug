---
title: Scout — Sourcerer Integration
description: Use toSearchFn to plug a ScoutIndex into sourcerer's LocalSource as a searchFn drop-in.
---

# Sourcerer Integration

`toSearchFn()` adapts a `ScoutIndex` to the `searchFn` signature expected by `@vielzeug/sourcerer`'s `createLocalSource`.

```ts
import { createIndex, toSearchFn } from '@vielzeug/scout';
import { createLocalSource } from '@vielzeug/sourcerer';

type User = { email: string; id: number; name: string; role: string };

const users: User[] = [
  { email: 'alice@example.com', id: 1, name: 'Alice Johnson', role: 'admin' },
  { email: 'bob@example.com', id: 2, name: 'Bob Smith', role: 'editor' },
  { email: 'charlie@example.com', id: 3, name: 'Charlie Brown', role: 'viewer' },
  { email: 'dave@example.com', id: 4, name: 'Dave Alison', role: 'viewer' },
];

// Build the index once — at module load time, not inside render
const index = createIndex(users, {
  fields: [
    { field: 'name', weight: 2 },
    { field: 'email' },
    { field: 'role' },
  ],
  threshold: 0.25,
});

// Plug into sourcerer — the source delegates all search queries to Scout
const source = createLocalSource(users, {
  pageSize: 10,
  searchFn: toSearchFn(index),
});

// Subscribe to reactive data changes
const sub = source.subscribe(({ data, meta }) => {
  console.log(`${meta.totalItems} result(s):`);
  data.forEach(u => console.log(`  ${u.name} (${u.email})`));
});

// Scout handles the query — sourcerer handles paging and filtering
source.patch({ search: 'alice' });
// → 2 result(s):
//   Alice Johnson (alice@example.com)
//   Dave Alison (dave@example.com)

source.patch({ search: '' });
// → 4 result(s): (all users)

// Keep the index in sync with mutations
const newUser: User = { email: 'eve@example.com', id: 5, name: 'Eve Adams', role: 'admin' };
users.push(newUser);
index.add(newUser);

// Update the source with the new corpus
const updatedSource = createLocalSource(users, { searchFn: toSearchFn(index) });

// Cleanup
sub.dispose();
source.dispose();
updatedSource.dispose();
```
