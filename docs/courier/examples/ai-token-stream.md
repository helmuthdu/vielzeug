---
title: 'Courier Examples — AI Token Stream'
description: 'AI Token Stream example for @vielzeug/courier.'
---

## AI Token Stream

### Problem

You need to consume a long-lived HTTP response such as an AI completion stream, either as raw text chunks or as newline-delimited JSON messages.

### Solution

Use `stream.readable()` with `parse: 'ndjson'` to iterate over typed NDJSON chunks, or with the default `parse: 'text'` for raw text output.

```ts
import { createStream } from '@vielzeug/courier';

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
- When sharing auth headers with REST requests, use `createCourier` instead so a single interceptor covers both.

### Related

- [Usage Guide](../usage.md#http-streaming)
- [API Reference](../api.md#createstream)
- [Real-time Events](./sse-events.md)
