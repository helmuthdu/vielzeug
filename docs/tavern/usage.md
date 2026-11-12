---
title: 'Tavern: Usage Guide'
description: How to use @vielzeug/tavern.
---

[[toc]]

## Basic Usage

Host one subject per session; guests join through the invitation/answer code pair. A session always carries exactly one subject: the guest handle needs no routing keys, and the host's command table is the single validation path for local and remote actions alike.

```ts
import { hostTavern, joinTavern } from '@vielzeug/tavern';

const host = hostTavern({
  commands: { rename: (args) => myStore.rename(docId, args[0] as string) },
  subject: {
    onChanged: (listener) => myStore.onUpdated(docId, listener),
    onRemoved: (listener) => myStore.onRemoved(docId, listener),
    snapshot: () => myStore.read(docId),
  },
});
const invitationCode = await host.createInvitationCode();

const { answerCode, guest, ready } = await joinTavern({
  invitationCode,
  mount: (snapshot) => parseAndMount(snapshot),
  name: 'Alex',
});
await host.acceptAnswerCode(answerCode);
await ready;

guest.sendCommand('rename', ['Quarterly report']);
```

## Host a Subject

The host validates every guest command against its command table: a name the table does not hold rejects without applying, and a handler that throws rejects the guest with its message. The snapshot re-broadcasts on every local change: coalesced on a microtask, so bursts of changes ship one snapshot, not many. `onEnded` fires exactly once when hosting ends, whether the subject was removed or the host was disposed: reset your session UI there instead of intercepting your own `onRemoved` seam.

```ts
import { hostTavern } from '@vielzeug/tavern';

const host = hostTavern({
  commands: {
    rename: (args) => myStore.rename(docId, args[0] as string),
    append: (args) => myStore.append(docId, args[0] as string),
  },
  onEnded: () => updateSessionUi(), // hosting ended: subject removed or disposed
  subject: {
    onChanged: (listener) => myStore.onUpdated(docId, listener),
    onRemoved: (listener) => myStore.onRemoved(docId, listener),
    snapshot: () => myStore.read(docId),
  },
});

// Presence and transport warnings arrive through tap(); the peer list is a getter.
host.tap((event) => {
  if (event.type === 'peer-joined') toast(`${event.peer.name ?? 'A guest'} joined`);
  if (event.type === 'peer-left') toast(`${event.peer.name ?? 'A guest'} left`);
  if (event.type === 'warning') log.warn(event.message, event.error);
  updatePeerList(host.peers); // always current inside a presence event
});

const invitationCode = await host.createInvitationCode();
// Show the invitation code (QR or copy/paste); the guest returns an answer code.
await host.acceptAnswerCode(answerCode);

// Kick a peer; the guest observes a disconnect and fires onEnded.
host.kick(peerId);

host.dispose(); // stop hosting: every guest disconnects
```

Omit `commands` for a read-only session: guests mirror the subject, and every command rejects with `The host has no command named "..."`.

## Join as a Guest

Joining consumes the invitation code and produces the answer code to show back. The session goes live once the host accepts the answer and the first snapshot mounts: that transition settles the `ready` promise, so there is no race between the handshake and your code attaching handlers.

```ts
import { joinTavern } from '@vielzeug/tavern';

const { answerCode, guest, ready } = await joinTavern({
  invitationCode,
  mount: (snapshot) => sanitizeAndMount(snapshot),
  name: 'Alex',
  onEnded: (subject) => unmountMirror(subject.id),
});
guest.tap((event) => {
  if (event.type === 'rejected') showToast(event.message); // event.commandId names the command it answers
  if (event.type === 'warning') log.warn(event.message, event.error);
});

try {
  await ready; // resolves with the mounted mirror once the first snapshot arrives
} catch (error) {
  showError(error.message); // the channel failed, the host closed it, or the guest left early
}

guest.sendCommand('rename', ['New name']);
guest.dispose(); // leave; onEnded fires with the mounted subject exactly once
```

The snapshot arrives as parsed JSON: `mount` receives `unknown` and should validate before trusting it. It is called for every snapshot the host broadcasts. Returning `null` ignores one; the first non-null return becomes the mounted subject: it settles `ready` and is passed to `onEnded` when the session ends. A `ready` you never await is safe: its rejection is pre-handled and never surfaces as an unhandled rejection.

## Relay Notices

Notices are ephemeral out-of-band UI signals: a toast fired elsewhere, a comment added. Catalog keys rather than prose cross the wire, so each client translates locally. The host serializes its own notices with `serializeNotice` and relays them with `relayNotice`; guests receive them through `onNotice`.

```ts
// Host side: forward local notices through the session.
const host = hostTavern({
  /* ... */
  serializeNotice: (notice) => (isLocalNotice(notice) ? toWireShape(notice) : null),
});
host.relayNotice(localNotice); // null from serializeNotice skips this one

// Guest side: re-emit received notices in the local UI.
const { guest } = await joinTavern({
  /* ... */
  onNotice: (wire) => bus.emit('notify', wire),
});
```

**Echo guard**: a tab that both hosts and guests must prevent re-broadcasting a wire-originated notice back to its own guests: `onNotice` emits locally, the host's local subscription picks it up, and without a guard it would loop. One boolean set during `onNotice` and checked in `serializeNotice` is sufficient: the consumer owns this because only they know their local event system.

## Observe with tap()

Both handles expose `tap()` for observability: presence and warnings on the host, rejections and warnings on the guest. Handler errors are swallowed, and the subscription detaches when its signal aborts or the session ends. Lifecycle stays out of the observability stream: `ready` covers the opening transition on the guest, and `onEnded` covers the closing transition on both handles.

```ts
import type { TavernGuestEvent, TavernHostEvent } from '@vielzeug/tavern';

host.tap((event: TavernHostEvent) => {
  if (event.type === 'warning') log.warn(event.message, event.error); // the original error, not just text
  if (event.type === 'dispose') log.info('hosting ended');
});
guest.tap((event: TavernGuestEvent) => {
  if (event.type === 'rejected') log.info(`command ${event.commandId} rejected: ${event.message}`);
});
```

## Handle Pairing Mistakes

Every user-input pairing failure surfaces as `TavernPairingError` from both `acceptAnswerCode` and `joinTavern`: a garbage code, the wrong code kind, an expired invitation, or an answer the host refuses. Catch it to show a helpful message instead of a raw error; the underlying mesh failure is chained as `cause` when you need it.

```ts
import { hostTavern, TavernPairingError } from '@vielzeug/tavern';

try {
  await host.acceptAnswerCode(pastedCode);
} catch (error) {
  if (error instanceof TavernPairingError) {
    showToast(error.message); // "That code is an invitation, not a guest answer."
  } else {
    throw error;
  }
}
```

## Working with Other Vielzeug Libraries

Tavern builds on `@vielzeug/mesh` for the WebRTC transport, pairing codes, and QR-optimized codecs. You do not interact with mesh directly: tavern owns the protocol, but the `rtc` option accepts a `MeshRtcFactory` for testing or non-browser runtimes. The peers carried by tap events and the {@link TavernHost.peers} getter are mesh types, re-exported by tavern so one import types everything.

```ts
import type { MeshRtcFactory } from '@vielzeug/mesh';
import { hostTavern } from '@vielzeug/tavern';

const host = hostTavern({
  // ... commands, subject
  rtc: myTestRtcFactory, // inject an in-memory WebRTC fake
});
```

Pair `@vielzeug/ledger` on the host to give the commands tavern applies an undo history: commands applied through the table land in the ledger like local ones.

## Best Practices

- Keep the command table the same functions the host's own UI calls, so guest actions cannot bypass local validation.
- Return `null` from `snapshot` while the subject is missing: the broadcast simply skips.
- Reset host-side session UI in `onEnded`: it fires exactly once for subject removal and explicit disposal alike, so you never need to double-wire your own `onRemoved` seam.
- Await `ready` before trusting the mirror: it names the exact reason a session never came up, and its rejection is safe to ignore when you do not care.
- Treat notices as catalog keys, not prose: each client translates locally.
- Guard against notice echo if a tab can both host and guest: one boolean in `serializeNotice` is sufficient.
- Dispose guests and hosts when their screen unmounts; channels also clean up on disconnect through `onEnded`, which fires exactly once on both sides.
- Catch `TavernPairingError` separately from other errors: it means the pasted code could not be used, not that something is broken.
