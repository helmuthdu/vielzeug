---
title: 'Courier Examples — Error Handling Patterns'
description: 'Handle HTTP, network, timeout, and cancellation failures precisely.'
---

## Error Handling Patterns

### Problem

A failed request needs user-facing treatment without treating cancellation as a server failure.

### Solution

Narrow Courier's typed error classes before escalating unknown failures.

```ts
import {
  CourierAbortError,
  CourierHttpError,
  CourierNetworkError,
  CourierTimeoutError,
  createCourier,
} from '@vielzeug/courier';

const courier = createCourier({ baseUrl: 'https://api.example.com' });

async function loadUser(): Promise<string> {
  try {
    return (await courier.get<{ name: string }>('/users/1', { timeout: 2_000 })).name;
  } catch (error) {
    if (error instanceof CourierAbortError) return 'Cancelled';
    if (error instanceof CourierTimeoutError) return 'Timed out; retry.';
    if (CourierHttpError.is(error, 404)) return 'User not found.';
    if (error instanceof CourierNetworkError) return 'Check your connection.';
    throw error;
  }
}
```

### Pitfalls

- A `CourierHttpError` has a response; a `CourierNetworkError` does not.
- Do not display cancellation as an application error during navigation.
- A stream can throw the same request error classes as an HTTP call.

### Related

- [Errors](../api.md#errors)
- [Disposal](./disposal.md)
