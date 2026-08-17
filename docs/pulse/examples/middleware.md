---
title: 'Pulse Examples — Outgoing Transform'
description: 'Transforming or filtering application messages for @vielzeug/pulse.'
---

## Outgoing Transform

### Problem

You need one deterministic policy for application messages without continuation middleware that can call `next()` repeatedly or leave a send outcome implicit.

### Solution

Use `transform` to return the serialized message shape or `null` to filter it.

```ts
import { createPulse } from '@vielzeug/pulse';

type Schema = {
  client: {
    'chat:send': { text: string };
    'debug:trace': { detail: string };
  };
};

const pulse = createPulse<Schema>('wss://api.example.com/ws', {
  transform: (message) => {
    if (message.event.startsWith('debug:')) return null;

    return {
      ...message,
      payload: { sentAt: Date.now(), value: message.payload },
    };
  },
});

await pulse.connect();
pulse.send('chat:send', { text: 'Hello!' });
pulse.send('debug:trace', { detail: 'filtered' });
pulse.dispose();
```

### Pitfalls

- **`transform` is synchronous.** Complete asynchronous policy decisions before calling `send()`.
- **Return `null` to filter.** Every other result is serialized and sent.
- **Internal frames bypass the transform.** Reconnect, heartbeat, room, and presence protocol frames remain reliable.

### Related

- [Basic Connection](./basic-connection.md)
- [Reconnect and Heartbeat](./reconnect-and-heartbeat.md)
