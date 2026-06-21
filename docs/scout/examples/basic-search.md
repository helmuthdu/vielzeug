---
title: Scout — Basic Search
description: Build a trigram index and perform fuzzy search with match highlighting.
---

# Basic Search

Build a trigram index over a user list and search it with match highlighting.

```ts
import { createIndex, highlight } from '@vielzeug/scout';

type User = { email: string; name: string; role: string };

const users: User[] = [
  { email: 'alice@example.com', name: 'Alice Johnson', role: 'admin' },
  { email: 'bob@example.com', name: 'Bob Smith', role: 'editor' },
  { email: 'charlie@example.com', name: 'Charlie Brown', role: 'viewer' },
  { email: 'alicia@example.com', name: 'Alicia Keys', role: 'editor' },
  { email: 'dave@example.com', name: 'Dave Alison', role: 'viewer' },
];

// Build the index — construction is O(corpus × field_length)
const index = createIndex(users, {
  fields: [
    { field: 'name', weight: 2 }, // name matches rank higher
    { field: 'email' },
    { field: 'role' },
  ],
  threshold: 0.2,
  limit: 10,
});

// Search — O(candidates)
const results = index.search('alice');

for (const { item, score, matches } of results) {
  console.log(`${item.name} (${score.toFixed(2)})`);

  for (const { field, ranges } of matches) {
    const value = item[field as keyof User];
    const parts = highlight(value, ranges);

    const displayText = parts.map(p => p.highlighted ? `[${p.text}]` : p.text).join('');

    console.log(`  ${field}: ${displayText}`);
  }
}
// Alice Johnson (0.92)
//   name: [Alice] Johnson
//   email: [alice]@example.com
// Dave Alison (0.61)
//   name: Dave [Ali]son
// Alicia Keys (0.55)
//   name: [Alic]ia Keys
//   email: [alic]ia@example.com
```

## Incremental updates

```ts
// Add a new item
const newUser: User = { email: 'eve@example.com', name: 'Eve Adams', role: 'admin' };
index.add(newUser);

// Remove a deleted item (reference equality)
index.remove(users[1]);

// Re-index a mutated item
users[0].name = 'Alice Wonderland';
index.reindex(users[0]);

console.log(`Index size: ${index.size}`); // 5 (added 1, removed 1, updated 1)
```
