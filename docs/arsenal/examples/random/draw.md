---
title: 'Arsenal Examples — draw / drawMany'
description: 'draw and drawMany example for @vielzeug/arsenal.'
---

## draw / drawMany

### Problem

You need to pick one random element from an array — for example selecting a random item, quote, or server from a pool.

### Solution

Use `draw(array)` to return a single randomly selected element, or `drawMany(array, n)` to pick `n` unique items.

```ts
import { draw, drawMany } from '@vielzeug/arsenal';

const servers = ['us-east', 'eu-west', 'ap-south'];
draw(servers); // e.g. 'eu-west'

// Pick 2 random unique servers
drawMany(servers, 2); // e.g. ['ap-south', 'us-east']
drawMany(servers, 10); // ['us-east', 'eu-west', 'ap-south'] (clamped to length)
```

### Pitfalls

- `draw` returns `undefined` for empty arrays — handle the empty case explicitly.
- `draw` uses `Math.random()` — not cryptographically secure.
- `drawMany` uses `crypto.getRandomValues` — cryptographically random; safe for sampling.

### Related

- [shuffle](./shuffle.md)
- [sample](../array/sampleSize.md)
