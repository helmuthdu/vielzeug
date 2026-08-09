---
title: 'Pulse Examples — Rooms and Presence'
description: 'Reference-counted rooms and reactive presence scopes for @vielzeug/pulse.'
---

## Rooms and Presence

### Problem

You need server-confirmed room membership and reactive member state that survives a reconnect without exposing stale membership.

### Solution

Define room state at construction. Create a presence scope, connect, then publish state.

```ts
import { createPulse } from '@vielzeug/pulse';
import { effect } from '@vielzeug/ripple';

type Presence = { lobby: { name: string; status: 'online' | 'away' } };

const pulse = createPulse<{}, {}, {}, Presence>('wss://api.example.com/ws', { reconnect: true });
const lobby = pulse.presence('lobby');

try {
  await pulse.connect();
  lobby.update({ name: 'Ada', status: 'online' });
} catch (error) {
  console.error('Pulse connection failed:', error);
}

effect(() => {
  for (const [memberId, member] of lobby.state.value) {
    console.log(memberId, member);
  }
});

lobby.onLeave((memberId) => console.log('left', memberId));

await pulse.join('announcements');
await pulse.leave('announcements');
lobby.dispose();
```

### Pitfalls

- **Presence types belong to `createPulse()`.** `presence()` no longer accepts a generic type argument.
- **`rooms` is server-confirmed.** It clears on a disconnected transport and returns after `joined` frames.
- **A room remains active while any presence scope owns it.** Dispose every scope before expecting a leave frame.

### Related

- [Basic Connection](./basic-connection.md)
- [Reconnect and Heartbeat](./reconnect-and-heartbeat.md)
