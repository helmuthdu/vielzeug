---
title: 'Arsenal Examples — throttle'
description: 'throttle example for @vielzeug/arsenal.'
---

## throttle

### Problem

A function fires too rapidly on high-frequency events like scroll or mousemove and you need to cap execution rate to at most once per interval.

### Solution

Use `throttle(fn, delay?, options?)` for leading/trailing throttle. Pass `{ leading: false }` to disable the first immediate call.

```ts
import { throttle } from '@vielzeug/arsenal';

const onScroll = throttle(() => {
  updateScrollPosition();
}, 100);

window.addEventListener('scroll', onScroll);
```

#### Trailing-only throttle

```ts
import { throttle } from '@vielzeug/arsenal';

const save = throttle(saveToServer, 1_000, { leading: false });
editor.on('change', save); // saves at most once per second, after the last change
```

### Pitfalls

- Like `debounce`, create the throttled function once and reuse it — a new instance resets the timer.

### Related

- [debounce](./debounce.md)
