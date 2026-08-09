---
title: 'Pulse Examples — Basic Connection'
description: 'Explicit connection lifecycle example for @vielzeug/pulse.'
---

## Basic Connection

### Problem

You need one typed session whose messages are sent only after the transport is ready and whose lifecycle can be cleaned up deterministically.

### Solution

Subscribe before connecting, then await `connect()` before sending.

```ts
import { createPulse } from '@vielzeug/pulse';

type ServerEvents = { 'chat:message': { text: string } };
type ClientEvents = { 'chat:send': { text: string } };

const pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws', {
  onError: (error) => console.error(error),
  reconnect: true,
});

const stop = pulse.on('chat:message', ({ text }) => console.log(text));

try {
  await pulse.connect();
  pulse.send('chat:send', { text: 'Hello!' });
} catch (error) {
  console.error('Pulse connection failed:', error);
}

stop();
pulse.dispose();
```

### Pitfalls

- **Construction does not connect.** Always await `connect()` before sending.
- **Sends do not buffer.** Disconnected sends throw `PulseConnectionError`.
- **`disconnect()` cancels retries.** Call `connect()` again to begin a new session.

### Related

- [Channel Multiplexing](./channels.md)
- [Reconnect and Heartbeat](./reconnect-and-heartbeat.md)
