---
title: Pulse Migration
description: Breaking changes and migration guide.
package: pulse
category: websockets
---

<!-- markdownlint-disable MD025 -->

## Overview

Pulse 2.0 simplifies the room/presence API, consolidates the schema generic, and removes the separate `join`/`leave`/`presence` methods. The result is fewer concepts, fewer moving parts, and a single typed entry point.

## Breaking changes

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

### 6. `pulse.rooms` is now a reactive `Readable<ReadonlySet<string>>`

**Before:** `pulse.rooms` was a signal of room names with presence.

**After:** `pulse.rooms` is a `Readable<ReadonlySet<string>>` tracking confirmed room memberships (with or without presence).

```ts
import { effect } from '@vielzeug/ripple';

effect(() => {
  console.log('Joined rooms:', [...pulse.rooms.value]);
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
5. Update `pulse.rooms` consumers to read from the `Readable<ReadonlySet<string>>`.
6. Add `timeout` and `signal` options to room scopes where appropriate.

## Flux adapter changes

The `@vielzeug/flux` adapter `fromPresence` is renamed to `fromRoomPresence` and now accepts a `PresenceRoomScope` instead of a presence channel.

```ts
// Before
import { fromPresence } from '@vielzeug/flux/pulse';
fromPresence(channel.presence).subscribe(...);

// After
import { fromRoomPresence } from '@vielzeug/flux/pulse';
fromRoomPresence(room).subscribe(...);
```
