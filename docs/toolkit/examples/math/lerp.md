---
title: lerp
---

## lerp

Linearly interpolates between two values.

## Example

```ts
import { lerp } from '@vielzeug/toolkit';

lerp(10, 20, 0); // 10
lerp(10, 20, 0.5); // 15
lerp(10, 20, 1); // 20
```

## Signature

```ts
function lerp(a: number, b: number, t: number): number;
```
