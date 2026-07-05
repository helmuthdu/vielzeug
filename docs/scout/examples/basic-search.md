---
title: 'Scout Examples — Basic Search'
description: 'Build a trigram index and perform fuzzy search with match highlighting.'
---

## Basic Search

### Problem

You have an in-memory list of records (users, products, ...) and need typo-tolerant, ranked full-text search over 500+ items without a server round-trip. Plain substring matching or `Array.filter` doesn't rank results, tolerate typos, or weight some fields over others.

### Solution

Build a `ScoutIndex` once with `createIndex()`, weighting the fields that matter most, then call `search()` per query. Each result carries a `score` and per-field `matches` for highlighting.

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

#### With incremental updates (optional)

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

#### With non-Latin corpora (optional)

```ts
import { createIndex, segmentWords } from '@vielzeug/scout';

// CJK text has no spaces between words — segmentWords() inserts them so
// findMatchRanges() / highlight() split on word boundaries like they do for Latin text.
const docs = [{ title: '日本語を勉強しています' }, { title: '我喜欢学习中文' }];

const index = createIndex(docs, {
  fields: [{ field: 'title', stringify: (v) => segmentWords(String(v)) }],
});

index.search('日本語'); // matches the first document
```

### Pitfalls

- Rebuilding the index per keystroke defeats its purpose — build it once, then call `search()` per query.
- `threshold` and `limit` interact: a high `threshold` can return fewer than `limit` results even when more items exist below the cutoff.
- Match `ranges` refer to the **original** field value, not a lowercased or tokenized copy — index into `item[field]`, not a normalized string.
- `remove()` and `reindex()` use reference equality (`===`) — pass the same object reference that was originally indexed.

### Related

- [Reactive Combobox](./reactive-combobox.md)
- [Sourcerer Integration](./sourcerer-integration.md)
