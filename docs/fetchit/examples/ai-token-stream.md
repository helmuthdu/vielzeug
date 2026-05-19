---
title: 'Fetchit Examples — AI Token Stream'
description: 'Consume an HTTP text or NDJSON stream with fetchit.'
---

## AI Token Stream

### Problem

You need to consume a long-lived HTTP response such as an AI completion stream, either as raw text chunks or as newline-delimited JSON messages.

### Solution

```ts
import { createStream } from '@vielzeug/fetchit';

type ChatChunk = {
  done: boolean;
  delta: string;
};

const stream = createStream({ baseUrl: 'https://api.example.com' });

for await (const chunk of stream.readable<ChatChunk>('/chat', {
  body: { prompt: 'Explain streams briefly.' },
  method: 'POST',
  parse: 'ndjson',
})) {
  process.stdout.write(chunk.delta);

  if (chunk.done) {
    process.stdout.write('\n');
  }
}

stream.dispose();
```

### Pitfalls

- `parse: 'text'` yields decoded string chunks exactly as they arrive; `parse: 'ndjson'` waits for newline-delimited JSON records.
- Readable streams default to `Infinity` timeout per connection, even when REST requests use the standard 30s timeout.
- Always break or abort intentionally if your server can keep the stream open indefinitely.
- When sharing auth headers with REST requests, use `createFetchit` instead so a single interceptor covers both.

### Related

- [Usage Guide](../usage.md#http-streaming)
- [API Reference](../api.md#createstream)
- [Real-time Events](./sse-events.md)
