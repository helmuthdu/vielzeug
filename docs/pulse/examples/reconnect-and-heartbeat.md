---
title: 'Pulse Examples — Reconnect and Heartbeat'
description: 'Reconnect restoration and heartbeat configuration for @vielzeug/pulse.'
---

## Reconnect and Heartbeat

### Problem

A realtime session must recover from network loss without opening duplicate sockets or replaying application messages before its channel and room state exists.

### Solution

Enable reconnect and heartbeat, create scopes before connecting, and react to the `status` readable.

```ts
import { createPulse } from '@vielzeug/pulse';
import { effect } from '@vielzeug/ripple';

type Schema = {
  channels: {
    chat: {
      client: { send: { text: string } };
      server: { message: { text: string } };
    };
  };
  rooms: {
    lobby: { presence: { name: string } };
  };
};

const pulse = createPulse<Schema>('wss://api.example.com/ws', {
  heartbeat: { interval: 20_000, timeout: 8_000 },
  onError: console.error,
  reconnect: { delay: (attempt) => Math.min(500 * 2 ** attempt, 30_000), maxAttempts: 8 },
});
const chat = pulse.channel('chat');
const lobby = pulse.room('lobby');

effect(() => {
  console.log('Pulse status:', pulse.status.value);
});

try {
  await pulse.connect();
  chat.on('message', ({ text }) => console.log(text));
  await lobby.joined;
  lobby.updatePresence({ name: 'Ada' });
} catch (error) {
  console.error('Pulse connection failed:', error);
}
```

### Pitfalls

- **`disconnect()` cancels retry immediately.** It never leaves a scheduled reconnect behind.
- **Restoration is ordered.** Pulse resubscribes channels, rejoins rooms, then restores the last successfully published local presence state.
- **`status` is transport state.** Wait for the server's own restored-room data before acting on room membership.

### Related

- [Basic Connection](./basic-connection.md)
- [Channel Multiplexing](./channels.md)
