---
title: 'Arsenal Examples — debounce'
description: 'debounce example for @vielzeug/arsenal.'
---

## debounce

### Problem

A function is being called too frequently — for example on every keypress — and you want to delay execution until the input settles.

### Solution

Use `debounce(fn, delay?)` to create a trailing-edge debounced version. The returned function exposes `.cancel()`, `.flush()`, and `.pending()`.

```ts
import { debounce } from '@vielzeug/arsenal';

const onSearch = debounce((query: string) => {
  fetch(`/api/search?q=${query}`);
}, 300);

input.addEventListener('input', (e) => onSearch(e.currentTarget.value));

// Cancel a pending call
onSearch.cancel();

// Force immediate execution
onSearch.flush();

// Check if a call is pending
onSearch.pending(); // boolean
```

### Pitfalls

- Create the debounced function once and reuse it — creating a new instance on every render defeats the purpose.
- `.flush()` does nothing if there is no pending call.

### Related

- [throttle](./throttle.md)
- [memo](./memo.md)
