---
title: 'Courier Examples — SSE Events'
description: 'Consume standard server-sent events alongside Courier.'
---

## SSE Events

### Problem

An application needs a long-lived server event stream without losing cancellation ownership.

### Solution

Use native `EventSource` for standard cookie-authenticated SSE. It owns frame parsing, reconnects, and `Last-Event-ID`; Courier remains responsible for ordinary HTTP requests.

```ts
const events = new EventSource('/events', { withCredentials: true });

events.addEventListener('message', (event) => {
  const notification = JSON.parse(event.data) as { text: string };
  console.log(notification.text);
});

events.addEventListener('error', () => {
  console.log('Event stream disconnected');
});

function leaveView(): void {
  events.close();
}
```

When an endpoint requires custom headers or request bodies, request a raw response with `timeout: Infinity` and use a dedicated SSE parser that supports incremental UTF-8 decoding, multiline data fields, comments, event IDs, and reconnect policy.

### Pitfalls

- Do not parse SSE independently per network chunk; frames and UTF-8 code points may span chunks.
- Native `EventSource` cannot attach arbitrary request headers.
- Always close `EventSource` when its owner ends.
- Always consume or cancel a raw Courier response body so Courier can release request ownership.

### Related

- [Cancellation and Disposal](../usage.md#cancellation-and-disposal)
- [Response Parsing](../usage.md#response-parsing)
