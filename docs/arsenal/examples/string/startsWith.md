---
title: 'Arsenal Examples — startsWith'
description: 'startsWith example for @vielzeug/arsenal.'
---

## startsWith

### Problem

You need to check whether a string starts with a given prefix in a pipeline-friendly way.

### Solution

Use `startsWith(value, prefix)` to return a boolean.

```ts
import { startsWith } from '@vielzeug/arsenal';

startsWith('https://example.com', 'https://'); // true
startsWith('http://example.com', 'https://'); // false
```

### Related

- [endsWith](./endsWith.md)
