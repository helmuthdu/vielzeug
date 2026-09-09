---
title: Pulse Migration
description: Migrate Pulse readables to framework-neutral external stores.
package: pulse
category: websockets
---

<!-- markdownlint-disable MD025 -->

# Migration

## Pulse 3.0

Pulse 3.0 removes the Ripple runtime dependency and exposes state through framework-neutral external stores. Pulse 2.0 previously simplified the room/presence API and consolidated its schema generic.

### Replace `Readable` access

`status`, `rooms`, and room `presence` now expose `ExternalStore<T>`. Replace `.value` and `.peek()` reads with `getSnapshot()`.

```ts
// Before
console.log(pulse.status.value);
console.log([...room.presence.value]);

// After
console.log(pulse.status.getSnapshot());
console.log([...room.presence.getSnapshot()]);
```

Subscribe to changes with `subscribe()` and read the current snapshot inside the listener.

```ts
const unsubscribe = pulse.status.subscribe(() => {
  console.log(pulse.status.getSnapshot());
});
```

### Ripple and Flux integration

Pass Pulse stores directly to structural adapters.

```ts
import { fromStore } from '@vielzeug/flux';
import { fromSubscribable } from '@vielzeug/ripple';

const statusStream = fromStore(pulse.status);
const presence = fromSubscribable(room.presence, { signal: room.disposalSignal });
```

## Pulse 2.0

### 1. Unified schema generic

**Before:** Four generic parameters on `createPulse()`.

```ts
const pulse = createPulse<TServer, TClient, TChannels, TPresence>('ws://...', { ... });
```

**After:** One `PulseSchema` generic.

```ts
const pulse = createPulse<{
  server: { 'chat:message': { text: string } };
  client: { 'chat:send': { text: string } };
  channels: {
    chat: {
      client: { send: { text: string } };
      server: { message: { text: string } };
    };
  };
  rooms: {
    lobby: { presence: { name: string } };
  };
}>('ws://...', { ... });
```

### 2. Rooms and presence unified into `room()`

**Before:** Separate `join()`/`leave()` methods and a `presence` API on channels.

```ts
const channel = pulse.channel('lobby');
await pulse.join('lobby');
const presence = channel.presence;
presence.update({ name: 'Ada' });
presence.onJoin((id, state) => { ... });
pulse.leave('lobby');
```

**After:** A single `room()` method returns a ref-counted room scope. When the room definition includes `presence`, the scope exposes reactive presence state.

```ts
const lobby = pulse.room('lobby');
await lobby.joined;
lobby.updatePresence({ name: 'Ada' });
lobby.onJoin((id, state) => { ... });
lobby.onLeave((id) => { ... });
lobby.dispose();
```

### 3. `pulse.join()` and `pulse.leave()` removed

Use `pulse.room(name)` to join and `scope.dispose()` to leave. Room memberships are reference-counted across independent scopes.

### 4. `channel.presence` removed

Presence is now a property of room scopes, not channel scopes. Use `pulse.room(name).presence` instead.

### 5. `PulsePresenceError` removed

Room join failures now use standard error types:
- `PulseConnectionError` — transport close before confirmation.
- `PulseRoomTimeoutError` — join timeout (new).
- `PulseAbortError` — join aborted via AbortSignal.
- `PulseDisposedError` — instance disposed before confirmation.

### 6. `pulse.rooms` tracks confirmed memberships

**Before:** `pulse.rooms` was a signal of room names with presence.

**After:** `pulse.rooms` is an `ExternalStore<ReadonlySet<string>>` tracking confirmed room memberships with or without presence.

```ts
const unsubscribe = pulse.rooms.subscribe(() => {
  console.log('Joined rooms:', [...pulse.rooms.getSnapshot()]);
});
```

### 7. `PulseRoomTimeoutError` added

Room scopes accept a `timeout` option. If the server does not confirm membership in time, `joined` rejects with `PulseRoomTimeoutError`.

```ts
const lobby = pulse.room('lobby', { timeout: 5_000 });
try {
  await lobby.joined;
} catch (error) {
  if (error instanceof PulseRoomTimeoutError) {
    // handle timeout
  }
}
```

### 8. `RoomScope` type

Room scopes are typed as `RoomScope<R>` where `R` is the room definition. When `R` includes `presence`, the scope is a `PresenceRoomScope<T>`; otherwise it is a `RoomScopeBase`.

```ts
// lobby has presence → PresenceRoomScope<{ name: string }>
const lobby = pulse.room('lobby');
lobby.updatePresence({ name: 'Ada' }); // typed

// announcements has no presence → RoomScopeBase
const announcements = pulse.room('announcements');
// announcements.updatePresence — TypeScript error
```

## Migration checklist

1. Replace `createPulse<TServer, TClient, TChannels, TPresence>` with `createPulse<PulseSchema>`.
2. Replace `pulse.join(name)` / `pulse.leave(name)` with `pulse.room(name)` / `scope.dispose()`.
3. Replace `channel.presence` with `pulse.room(name).presence`.
4. Replace `PulsePresenceError` handling with the appropriate new error type.
5. Update `pulse.rooms` consumers to read from the `ExternalStore<ReadonlySet<string>>`.
6. Add `timeout` and `signal` options to room scopes where appropriate.
