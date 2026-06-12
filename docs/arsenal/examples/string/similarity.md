---
title: 'Arsenal Examples — similarity'
description: 'similarity example for @vielzeug/arsenal.'
---

## similarity

### Problem

You need a 0–1 score for how similar two strings are — for example ranking search results or detecting near-duplicates.

### Solution

Use `similarity(str1, str2)` to get the Levenshtein-based similarity score. `1.0` is an exact match; `0.0` means completely different.

```ts
import { similarity } from '@vielzeug/arsenal';

similarity('hello', 'hello'); // 1
similarity('hello', 'helo'); // 0.8
similarity('hello', 'world'); // 0.2
```

#### Use as a search threshold

```ts
import { similarity } from '@vielzeug/arsenal';

const candidates = ['TypeScript', 'JavaScript', 'Python'];
candidates.filter((c) => similarity(c.toLowerCase(), 'typescript') >= 0.5);
// ['TypeScript']
```

### Pitfalls

- Throws `RangeError` if either input exceeds 10 000 characters.
- Case-sensitive — lowercase both strings before comparing if case-insensitive matching is needed.

### Related

- [search](../array/search.md)
