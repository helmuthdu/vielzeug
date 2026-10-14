---
title: 'Courier Examples: Error Handling Patterns'
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
  CourierParseError,
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
    if (error instanceof CourierParseError) return 'The server returned an unreadable response.';
    throw error;
  }
}
```

#### Problem details

Read `problem` when the server answers with an RFC 9457 document, and keep the HTTP status as the routing key.

```ts
import { CourierHttpError, createCourier } from '@vielzeug/courier';

const courier = createCourier({ baseUrl: 'https://api.example.com' });

async function submit(body: unknown): Promise<string> {
  try {
    await courier.post('/invoices', { body });
    return 'Saved';
  } catch (error) {
    if (!CourierHttpError.is(error, 422)) throw error;

    const fieldErrors = error.problem?.['errors'] as Record<string, string> | undefined;

    return fieldErrors
      ? Object.values(fieldErrors).join(', ')
      : error.problem?.detail ?? 'The request was rejected.';
  }
}
```

### Pitfalls

- A `CourierHttpError` has a response; a `CourierNetworkError` does not.
- Do not display cancellation as an application error during navigation.
- `CourierSchemaValidationError` carries the raw pre-validation `data`.
- `problem` is `undefined` unless the response has an object body and `application/problem+json`; branch on HTTP `status` first.
- Courier does not validate extension-member shapes; narrow them before using them as application data.

### Related

- [Errors](../api.md#errors)
- [Disposal](./disposal.md)
