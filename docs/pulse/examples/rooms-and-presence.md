---
title: 'Pulse Examples — Rooms and Presence'
description: 'Room membership and reactive presence tracking example for @vielzeug/pulse.'
---

## Rooms and Presence

### Problem

You need to track which users are online in a room — their identities and real-time state — and react when they join or leave, all without polling.

### Solution

Use `pulse.presence(room)` to get a reactive `PresenceChannel`. Its `state` signal is a `Map<memberId, T>` that updates automatically on every server push. Call `update()` to broadcast your own state.

```ts
import { createPulse } from '@vielzeug/pulse';
import { computed, effect } from '@vielzeug/ripple';

type MemberState = {
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'busy';
};

const pulse = createPulse('wss://api.example.com/ws', { reconnect: true });

// presence() implicitly joins the room
const lobby = pulse.presence<MemberState>('lobby');

// Reactive member list — re-runs whenever anyone joins, leaves, or updates
effect(() => {
  const members = [...lobby.state.value.values()];
  renderAvatarRow(members);
});

// Derived computeds from the signal
const onlineCount = computed(() => lobby.state.value.size);
const memberNames = computed(() => [...lobby.state.value.values()].map((m) => m.name).sort());

effect(() => {
  document.querySelector('#count')!.textContent = String(onlineCount.value);
});

// Membership events
lobby.onJoin((memberId, state) => {
  showToast(`${state.name} joined`);
  analytics.track('presence:join', { memberId });
});

lobby.onLeave((memberId) => {
  showToast(`${memberId} left`);
});

// Broadcast your own state
lobby.update({ name: 'Alice', avatar: '/avatars/alice.png', status: 'online' });

// Change status later
document.querySelector('#away-btn')!.addEventListener('click', () => {
  lobby.update({ name: 'Alice', avatar: '/avatars/alice.png', status: 'away' });
});

// Dispose when leaving the page
window.addEventListener('beforeunload', () => pulse.dispose());
```

#### Explicit room join / leave (without presence)

When you only need room membership without tracking member state, use `join()` and `leave()` directly.

```ts
// join() resolves when the server confirms
await pulse.join('game-room-42');
console.log(pulse.rooms.value.has('game-room-42')); // true

// react to membership with the reactive rooms signal
import { effect } from '@vielzeug/ripple';
effect(() => {
  document.querySelector('#rooms')!.textContent = [...pulse.rooms.value].join(', ');
});

await pulse.leave('game-room-42');
```

#### Multiple rooms at once

```ts
const [, , lobby] = await Promise.all([
  pulse.join('announcements'),
  pulse.join('team:engineering'),
  pulse.presence<MemberState>('lobby').update({ name: 'Bob', avatar: '', status: 'online' }),
]);
```

### Pitfalls

- **`presence()` implicitly joins the room.** You do not need to call `pulse.join()` separately for a room you are tracking with presence.
- **`update()` sends the full state, not a patch.** Always include all fields on every update.
- **Disposing the presence channel does not leave the server-side room.** The server receives a `leave` frame only if you call `pulse.leave(room)` directly.
- **`pulse.rooms` reflects server-confirmed membership.** The set is not updated until the server replies with a `joined` or `left` frame.

### Related

- [Channel Multiplexing](./channels.md)
- [Basic Connection](./basic-connection.md)
