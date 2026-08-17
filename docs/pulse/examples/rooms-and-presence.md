---
title: 'Pulse Examples — Rooms and Presence'
description: 'Reference-counted rooms and reactive presence scopes for @vielzeug/pulse.'
---

## Rooms and Presence

### Problem

You need server-confirmed room membership and reactive member state that survives a reconnect without exposing stale membership.

### Solution

Define room schemas at construction. Create a room scope, connect, then publish state.

```ts
import { createPulse } from '@vielzeug/pulse';
import { effect } from '@vielzeug/ripple';

type Schema = {
  rooms: {
    lobby: { presence: { name: string; status: 'online' | 'away' } };
    announcements: {};
  };
};

const pulse = createPulse<Schema>('wss://api.example.com/ws', { reconnect: true });
const lobby = pulse.room('lobby');

try {
  await pulse.connect();
  await lobby.joined;
  lobby.updatePresence({ name: 'Ada', status: 'online' });
} catch (error) {
  console.error('Pulse connection failed:', error);
}

effect(() => {
  for (const [memberId, member] of lobby.presence.value) {
    console.log(memberId, member);
  }
});

lobby.onLeave((memberId) => console.log('left', memberId));

const announcements = pulse.room('announcements');
await announcements.joined;
console.log('rooms:', [...pulse.rooms.value]);

announcements.dispose();
lobby.dispose();
pulse.dispose();
```

### Pitfalls

- **Room schemas belong to `createPulse()`.** `room()` infers its types from the schema.
- **`rooms` is server-confirmed.** It clears on a disconnected transport and returns after `joined` frames.
- **A room remains active while any scope owns it.** Dispose every scope before expecting a leave frame.

### Related

- [Basic Connection](./basic-connection.md)
- [Reconnect and Heartbeat](./reconnect-and-heartbeat.md)
