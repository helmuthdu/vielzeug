---
title: 'Arsenal Examples — truncate'
description: 'truncate example for @vielzeug/arsenal.'
---

## truncate

### Problem

You need to shorten a string to fit a display limit, appending an ellipsis without cutting a word mid-way.

### Solution

Use `truncate(str, limit?, options?)` to trim and optionally respect word boundaries.

```ts
import { truncate } from '@vielzeug/arsenal';

truncate('The quick brown fox', 15);
// 'The quick brow…'

truncate('The quick brown fox', 15, { completeWords: true });
// 'The quick…'

truncate('The quick brown fox', 15, { ellipsis: '...' });
// 'The quick bro...'
```

### Pitfalls

- Default `limit` is 100 characters.
- With `completeWords: true`, the string may be shorter than `limit` since the last partial word is dropped.

### Related

- [pad](./pad.md)
- [words](./words.md)
