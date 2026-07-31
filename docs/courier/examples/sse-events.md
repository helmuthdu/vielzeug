---
title: 'Courier Examples — Real-time Events'
description: 'Consume and cancel server-sent events with Courier.'
---

## Real-time Events

### Problem

You need to consume notifications from an SSE endpoint and stop the connection when the view no longer
needs updates.

### Solution

Iterate `events()` and use `break` when the current consumer is finished; Courier aborts the connection
immediately.

```ts
import { createCourier } from '@vielzeug/courier';

type Notification = { roomId: string; text: string; userId: string };

const courier = createCourier({ baseUrl: 'https://api.example.com' });

for await (const event of courier.events<Notification>('/events', {
  query: { roomId: 'general' },
})) {
  if (event.event !== 'message') continue;
  console.log(`[${event.data.roomId}] ${event.data.userId}: ${event.data.text}`);
  break; // Closes the active SSE request immediately.
}
```

### Pitfalls

- Courier does not reconnect automatically. Recreate the iterator only when reconnecting is safe.
- A stream started after `courier.dispose()` rejects with `CourierDisposedError`.
- Handle `CourierAbortError` separately when cancellation is normal application control flow.

### Related

- [HTTP Streaming](./ai-token-stream.md)
- [Disposal](./disposal.md)
- [Usage Guide](../usage.md#server-sent-events)
