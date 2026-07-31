---
title: 'Courier Examples — AI Token Stream'
description: 'Consume text and NDJSON response streams through Courier.'
---

## AI Token Stream

### Problem

A chat endpoint emits newline-delimited chunks and the view must stop reading once it receives completion.

### Solution

Use `read()` with `parse: 'ndjson'`; leaving the loop aborts the active response immediately.

```ts
import { createCourier } from '@vielzeug/courier';

type ChatChunk = { done: boolean; delta: string };

const courier = createCourier({ baseUrl: 'https://api.example.com' });
let message = '';

for await (const chunk of courier.read<ChatChunk>('/chat', {
  body: { prompt: 'Explain query handles briefly.' },
  method: 'POST',
  parse: 'ndjson',
})) {
  message += chunk.delta;
  if (chunk.done) break;
}
console.log(message);
```

### Pitfalls

- `parse: 'ndjson'` requires one JSON value per newline; omit it for text chunks.
- Configure `timeout` explicitly for a bounded long-running response.
- Recreate a stream only when reconnecting or retrying is safe for the endpoint.

### Related

- [HTTP Streaming](../usage.md#http-streaming)
- [Real-time Events](./sse-events.md)
