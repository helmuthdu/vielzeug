---
title: 'Courier Examples — Real-time Events'
description: 'Real-time Events example for @vielzeug/courier.'
---

## Real-time Events

### Problem

You need a lightweight way to consume server-sent events for notifications, presence, or dashboards.

### Solution

Use `stream.sse()` with typed event generics and `reconnect: true` to handle connection drops with full-jitter exponential backoff.

```ts
import { createStream } from '@vielzeug/courier';

type Events = {
  message: { roomId: string; text: string; userId: string };
  ping: null;
};

const stream = createStream({
  baseUrl: 'https://api.example.com',
  headers: { authorization: `Bearer ${token}` },
});

const source = stream.sse<Events>('/events', {
  query: { roomId: 'general' },
  reconnect: { times: 5 },
  onError: (error) => {
    console.error('SSE closed permanently:', error.message);
  },
});

const stopMessage = source.on('message', (event) => {
  console.log(`[${event.roomId}] ${event.userId}: ${event.text}`);
});

const stopPing = source.on('ping', () => {
  console.log('heartbeat');
});

// later
stopMessage();
stopPing();
source.close();
stream.dispose();
```

### Pitfalls

- `reconnect: true` uses exponential backoff with a default budget of 5 reconnects after the first failure.
- SSE connections default to `Infinity` timeout per connection. Set `timeout` explicitly only when you really want streams to expire.
- When sharing auth headers with REST requests, use `createCourier` instead so a single interceptor covers both.

### Related

- [Usage Guide](../usage.md#server-sent-events)
- [API Reference](../api.md#createstream)
- [AI Token Stream](./ai-token-stream.md)
