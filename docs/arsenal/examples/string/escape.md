---
title: 'Arsenal Examples — escape'
description: 'escape example for @vielzeug/arsenal.'
---

## escape

### Problem

You need to safely insert user-provided text into HTML — converting `&`, `<`, `>`, `"`, and `'` to their HTML entities.

### Solution

Use `escape(value)` to HTML-encode a string.

```ts
import { escape } from '@vielzeug/arsenal';

escape('<script>alert("xss")</script>');
// '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'

escape('Alice & Bob'); // 'Alice &amp; Bob'
```

### Pitfalls

- Only escapes the five HTML-special characters — does not encode all Unicode characters.

### Related

- [unescape](./unescape.md)
