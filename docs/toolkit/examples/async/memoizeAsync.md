---
title: memoizeAsync
---

## memoizeAsync

Memoizes async function results and deduplicates in-flight calls.

## Example

```ts
import { memoizeAsync } from '@vielzeug/toolkit';

const fetchProfile = memoizeAsync(async (id: number) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});

const [first, second] = await Promise.all([
  fetchProfile(1),
  fetchProfile(1),
]);

// Only one network request is executed for id=1 while in-flight.
console.log(first, second);
```

## Signature

```ts
function memoizeAsync<T extends (...args: any[]) => any>(
  fn: T,
  options?: {
    keyResolver?: (...args: Parameters<T>) => PropertyKey;
    maxSize?: number;
    ttl?: number;
  },
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
```
