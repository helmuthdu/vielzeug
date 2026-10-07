---
title: Tavern Migration
---

# Tavern Migration

## Observability callbacks moved to `tap()`

The host's `onPeerJoined`, `onPeerLeft`, `onPeersChanged`, and `onWarning` options and the guest's `onRejected` and `onWarning` options are gone. They are observability, and observability goes through `tap()` with the typed `TavernHostEvent` / `TavernGuestEvent` unions. Lifecycle callbacks (`onEnded`, `onJoined`, `onFailed`) stay: they fire while `joinTavern` is still resolving, before a tapper could exist.

```ts
// Before
const host = hostTavern({
  onPeerJoined: (peer) => toast(`${peer.name} joined`),
  onPeerLeft: (peer) => toast(`${peer.name} left`),
  onPeersChanged: (peers) => updatePeerList(peers),
  onWarning: (message) => log.warn(message),
  /* ... */
});

// After
const host = hostTavern({
  /* ... */
});
host.tap((event) => {
  if (event.type === 'peer-joined') toast(`${event.peer.name} joined`);
  if (event.type === 'peer-left') toast(`${event.peer.name} left`);
  if (event.type === 'warning') log.warn(event.message, event.error); // the error itself, not just text
  updatePeerList(host.peers); // the live peer list is a getter
});
```

```ts
// Before
const { guest } = await joinTavern({ onRejected: (message) => toast(message), /* ... */ });

// After
const { guest } = await joinTavern({ /* ... */ });
guest.tap((event) => {
  if (event.type === 'rejected') toast(event.message); // event.commandId names the command it answers
});
```

## Post-dispose use throws `TavernDisposedError`

`kick`, `createInvitationText`, and `acceptAnswerText` on a disposed host, and `sendCommand` on an ended guest, now throw `TavernDisposedError` (a `TavernError` subtype) instead of silently no-oping or surfacing a bare `TavernError`/mesh error. `relayNotice` stays silent: a notice relayed to a closed session is ephemeral state with no audience left.

```ts
import { TavernDisposedError } from '@vielzeug/tavern';

try {
  guest.sendCommand('doc-1', 'rename', ['x']);
} catch (error) {
  if (error instanceof TavernDisposedError) {
    // wiring outlived the session
  }
}
```
