---
title: 'Pulse Examples — Channel Multiplexing'
description: 'Schema-bound channel scopes for @vielzeug/pulse.'
---

## Channel Multiplexing

### Problem

Several features share a WebSocket but need independently disposable listeners without allowing each feature to define a conflicting protocol for the same channel.

### Solution

Declare channel maps once at session construction. Each call creates an independent scope and Pulse reference-counts the server subscription.

```ts
import { createPulse } from '@vielzeug/pulse';

type Channels = {
  chat: {
    client: { send: { text: string } };
    server: { message: { text: string } };
  };
};

const pulse = createPulse<{}, {}, Channels>('wss://api.example.com/ws');
const composer = pulse.channel('chat');
const transcript = pulse.channel('chat');

await pulse.connect();

composer.send('send', { text: 'Hello!' });
transcript.on('message', ({ text }) => console.log(text));

composer.dispose(); // transcript still owns the subscription
transcript.dispose(); // Pulse now sends unsubscribe
pulse.dispose();
```

### Pitfalls

- **Channel types belong to `createPulse()`.** `channel()` no longer accepts per-call event map generics.
- **Each call returns a new scope.** Do not compare channel objects for identity.
- **A scope can send only while connected.** Reconnect restores active subscriptions before messages can be sent.

### Related

- [Basic Connection](./basic-connection.md)
- [Rooms and Presence](./rooms-and-presence.md)
