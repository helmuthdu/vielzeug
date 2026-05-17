---
title: normalize
---

## normalize

Maps a value from a range into a normalized 0..1 interval.

## Example

```ts
import { normalize } from '@vielzeug/toolkit';

normalize(75, 50, 100); // 0.5
normalize(120, 0, 100); // 1 (clamped)
normalize(-10, 0, 100); // 0 (clamped)
```

## Signature

```ts
function normalize(value: number, min: number, max: number): number;
```
