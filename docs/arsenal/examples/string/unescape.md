---
title: 'Arsenal Examples — unescape'
description: 'unescape example for @vielzeug/arsenal.'
---

## unescape

### Problem

You need to decode HTML entities in a string — the inverse of `escape`.

### Solution

Use `unescape(value)` to convert HTML entities back to their original characters.

```ts
import { unescape } from '@vielzeug/arsenal';

unescape('&lt;b&gt;Hello&lt;/b&gt;'); // '<b>Hello</b>'
unescape('Alice &amp; Bob'); // 'Alice & Bob'
```

### Related

- [escape](./escape.md)
