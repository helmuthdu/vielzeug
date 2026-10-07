---
title: 'Tavern: Usage Guide'
description: How to use @vielzeug/tavern.
---

[[toc]]

## Basic Usage

Host one subject per session; guests join through the invitation/answer pair. Both sides share one command table, so remote actions run the same code as local ones.

```ts
import { hostTavern, joinTavern } from '@vielzeug/tavern';

const host = hostTavern({
  commands: { apply: (name, args) => myStore.apply(name, args), has: (name) => name in myStore },
  subjectId: 'doc-1',
  subjects: {
    onChanged: (listener) => myStore.onUpdated('doc-1', listener),
    onRemoved: (listener) => myStore.onRemoved('doc-1', listener),
    snapshot: () => myStore.read('doc-1'),
  },
});
const invitation = await host.createInvitationText();

const { answerText, guest } = await joinTavern({
  invitationText: invitation,
  mount: (snapshot) => parseAndMount(snapshot),
  name: 'Alex',
});
await host.acceptAnswerText(answerText);

guest.sendCommand('doc-1', 'rename', ['Quarterly report']);
```

## Host a Subject

The host validates every guest command through the command table and broadcasts the snapshot on every local change: coalesced on a microtask, so bursts of changes ship one snapshot, not many. `onEnded` fires exactly once when hosting ends, whether the subject was removed or the host was disposed: reset your session UI there instead of intercepting your own `onRemoved` seam.

```ts
import { hostTavern } from '@vielzeug/tavern';

const host = hostTavern({
  commands: {
    apply: (name, args) => myStore.apply(name, args),
    has: (name) => name in myStore,
  },
  onEnded: () => updateSessionUi(), // hosting ended: subject removed or disposed
  subjectId: 'doc-1',
  subjects: {
    onChanged: (listener) => myStore.onUpdated('doc-1', listener),
    onRemoved: (listener) => myStore.onRemoved('doc-1', listener),
    snapshot: () => myStore.read('doc-1'),
  },
});

// Presence and transport warnings arrive through tap(); the peer list is a getter.
host.tap((event) => {
  if (event.type === 'peer-joined') toast(`${event.peer.name ?? 'A guest'} joined`);
  if (event.type === 'peer-left') toast(`${event.peer.name ?? 'A guest'} left`);
  if (event.type === 'warning') log.warn(event.message, event.error);
  updatePeerList(host.peers); // always current inside a presence event
});

const invitation = await host.createInvitationText();
// Show the invitation (QR or copy/paste); the guest returns an answer code.
await host.acceptAnswerText(answerCode);

// Kick a peer; the guest observes a disconnect and fires onEnded.
host.kick(peerId);

host.dispose(); // stop hosting: every guest disconnects
```

## Join as a Guest

Joining consumes the invitation and produces the answer code to show back. The session goes live once the host accepts the answer and the first snapshot arrives.

```ts
import { joinTavern } from '@vielzeug/tavern';

const { answerText, guest } = await joinTavern({
  invitationText: invitation,
  mount: (snapshot) => sanitizeAndMount(snapshot),
  name: 'Alex',
  onEnded: (subject) => unmountMirror(subject.id),
  onFailed: (reason) => showError(reason),
  onJoined: (subject) => mountMirror(subject),
});
guest.tap((event) => {
  if (event.type === 'rejected') showToast(event.message); // event.commandId names the command it answers
  if (event.type === 'warning') log.warn(event.message, event.error);
});

guest.sendCommand('doc-1', 'rename', ['New name']);
guest.dispose(); // leave; onEnded fires with the mounted subject exactly once
```

The snapshot arrives as parsed JSON: `mount` receives `unknown` and should validate before trusting it. Returning `null` ignores the snapshot; returning the mounted value fires `onJoined` (first time only) and passes it to `onEnded` when the session ends.

## Relay Notices

Give both sides a notice seam: catalog keys rather than prose, so each client translates locally, and the host relays its own notices to every guest.

```ts
import type { TavernNotices } from '@vielzeug/tavern';

const notices: TavernNotices = {
  fromWire: (wire) => bus.emit('notify', wire),
  toWire: (notice) => (isLocalNotice(notice) ? toWireShape(notice) : null),
};

// Host side: forward every local notice through the session.
host.relayNotice(localNotice);
```

**Echo guard**: a tab that both hosts and guests must prevent re-broadcasting a wire-originated notice back to its own guests. One boolean set during `fromWire` and checked in `toWire` is sufficient: the consumer owns this because only they know their local event system.

## Observe with tap()

Both handles expose `tap()` for observability: presence and warnings on the host, rejections and warnings on the guest. Handler errors are swallowed, and the subscription detaches when its signal aborts or the session ends. Lifecycle transitions stay callbacks (`onEnded`, `onJoined`, `onFailed`) because they fire while `joinTavern` is still resolving, before you can hold the handle.

```ts
import type { TavernGuestEvent, TavernHostEvent } from '@vielzeug/tavern';

host.tap((event: TavernHostEvent) => {
  if (event.type === 'warning') log.warn(event.message, event.error); // the original error, not just text
});
guest.tap((event: TavernGuestEvent) => {
  if (event.type === 'rejected') log.info(`command ${event.commandId} rejected: ${event.message}`);
});
```

## Handle Pairing Mistakes

Every user-input pairing failure surfaces as `TavernPairingError` from both `acceptAnswerText` and `joinTavern`: a garbage code, the wrong code kind, an expired invitation, or an answer the host refuses. Catch it to show a helpful message instead of a raw error; the underlying mesh failure is chained as `cause` when you need it.

```ts
import { hostTavern, TavernPairingError } from '@vielzeug/tavern';

try {
  await host.acceptAnswerText(pastedCode);
} catch (error) {
  if (error instanceof TavernPairingError) {
    showToast(error.message); // "That code is an invitation, not a guest answer."
  } else {
    throw error;
  }
}
```

## Working with Other Vielzeug Libraries

Tavern builds on `@vielzeug/mesh` for the WebRTC transport, pairing codes, and QR-optimized codecs. You do not interact with mesh directly: tavern owns the protocol, but the `rtc` option accepts a `MeshRtcFactory` for testing or non-browser runtimes, and the peers carried by tap events and the {@link TavernHost.peers} getter are mesh types.

```ts
import type { MeshRtcFactory } from '@vielzeug/mesh';
import { hostTavern } from '@vielzeug/tavern';

const host = hostTavern({
  // ... commands, subjects
  rtc: myTestRtcFactory, // inject an in-memory WebRTC fake
  subjectId: 'doc-1',
});
```

Pair `@vielzeug/ledger` on the host to give the commands tavern applies an undo history: commands applied through the table land in the ledger like local ones.

## Best Practices

- Keep the command table the same object the host's own UI calls, so guest actions cannot bypass local validation.
- Return `null` from `snapshot` while the subject is missing: the broadcast simply skips.
- Reset host-side session UI in `onEnded`: it fires exactly once for subject removal and explicit disposal alike, so you never need to double-wire your own `onRemoved` seam.
- Treat notices as catalog keys, not prose: each client translates locally.
- Guard against notice echo if a tab can both host and guest: one boolean in `toWire` is sufficient.
- Dispose guests and hosts when their screen unmounts; channels also clean up on disconnect through `onEnded`, which fires exactly once on both sides.
- Catch `TavernPairingError` separately from other errors: it means the pasted code could not be used, not that something is broken.
