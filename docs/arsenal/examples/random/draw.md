---
title: 'Arsenal Examples — draw'
description: 'draw example for @vielzeug/arsenal.'
---

## draw

### Problem

You need to pick one random element from an array — for example selecting a random item, quote, or server from a pool.

### Solution

Use `draw(array)` to return a randomly selected element.

```ts
import { draw } from '@vielzeug/arsenal';

const servers = ['us-east', 'eu-west', 'ap-south'];
draw(servers); // e.g. 'eu-west'
```

### Pitfalls

- Returns `undefined` for empty arrays — handle the empty case explicitly.
- Uses `Math.random()` — not cryptographically secure.

### Related

- [shuffle](./shuffle.md)
- [sample](../array/sampleSize.md)
