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
const { guest } = await joinTavern({ onRejected: (message) => toast(message) /* ... */ });

// After
const { guest } = await joinTavern({
  /* ... */
});
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

## One session, one subject

A tavern session always carries exactly one subject, so the `subjectId` routing key was removed everywhere: the `subjectId` option is gone, the wire command no longer names a subject, and `sendCommand(name, args)` takes two arguments instead of three. Commands targeting "another" subject were never expressible: the host rejected them, and that rejection path is gone with the key.

```ts
// Before
guest.sendCommand('doc-1', 'rename', ['Quarterly report']);

// After
guest.sendCommand('rename', ['Quarterly report']);
```

A later release reintroduced an optional third argument for a different purpose. Declaring `subject.id` on the hosted subject makes the session _named_: every command must pass that id as `sendCommand(name, args, target)`, and a missing or mismatched target rejects before the table runs. On a named session the argument is mandatory, not optional: calling `sendCommand(name, args)` against a host that declares an id rejects every command. See "Name the Subject to Guard Command Targets" in `usage.md`.

## The command table is a plain record

`TavernCommands` was a `{ has, apply }` seam you hand-wired over your own dispatch: now it is the dispatch itself, a `Record<string, (args) => void>`. A missing name rejects the guest the same way `has` returning false used to; a throwing handler rejects with its message. Omit `commands` entirely for a read-only session.

```ts
// Before
const host = hostTavern({
  commands: { apply: (name, args) => myStore.apply(name, args), has: (name) => name in myStore },
  subjectId: 'doc-1',
  subjects: {
    onChanged: (l) => myStore.onUpdated('doc-1', l),
    onRemoved: (l) => myStore.onRemoved('doc-1', l),
    snapshot: () => myStore.read('doc-1'),
  },
  /* ... */
});

// After
const host = hostTavern({
  commands: { rename: (args) => myStore.rename(docId, args[0] as string) },
  subject: {
    onChanged: (l) => myStore.onUpdated(docId, l),
    onRemoved: (l) => myStore.onRemoved(docId, l),
    snapshot: () => myStore.read(docId),
  },
  /* ... */
});
```

The subject seam is singular (`subjects` is now `subject`), and the notice seam was split by the role that actually uses each half: the host gets `serializeNotice`, the guest gets `onNotice`, and `TavernNotices` is gone.

## Join lifecycle: `ready` replaces `onJoined` and `onFailed`

Both callbacks existed because they fired while `joinTavern` was still resolving, before a tapper could exist. A promise is the race-free shape of exactly that: `ready` resolves with the mounted subject when the first snapshot mounts and rejects with a `TavernError` (channel failed or closed) or `TavernDisposedError` (the guest left early) otherwise. Its rejection is pre-handled, so ignoring `ready` is safe.

```ts
// Before
const { answerText, guest } = await joinTavern({
  onJoined: (subject) => mountMirror(subject),
  onFailed: (reason) => showError(reason),
  /* ... */
});

// After
const { answerCode, guest, ready } = await joinTavern({
  /* ... */
});
try {
  mountMirror(await ready);
} catch (error) {
  showError((error as Error).message);
}
```

`onEnded` stays: it is a lifecycle transition long after the handle exists, on both handles.

## Pairing vocabulary: codes, not texts

`createInvitationText` is `createInvitationCode`, `acceptAnswerText` is `acceptAnswerCode`, the guest option `invitationText` is `invitationCode`, and the join result's `answerText` is `answerCode`: the API now speaks the same word the docs and pairing errors do. Both event unions also gained a final `{ type: 'dispose' }` event, matching the rest of the monorepo.
