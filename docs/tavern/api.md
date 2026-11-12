---
title: 'Tavern: API Reference'
description: Public API of @vielzeug/tavern.
---

[[toc]]

## API Overview

| Symbol                | Purpose                                                                      | Execution    | Common gotcha                                                                      |
| --------------------- | ---------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| `hostTavern()`        | Host a subject: pairing, command validation, snapshot broadcast              | Sync factory | Disposing ends hosting for every guest                                             |
| `joinTavern()`        | Join a session: consume invitation code, produce answer code                 | Async        | The session lives only after the host accepts and the first snapshot mounts        |
| `TavernHost`          | Host handle: invitation, answer acceptance, kick, notice relay, presence tap | N/A          | `dispose()` is idempotent; control-plane methods throw `TavernDisposedError` after |
| `TavernGuest`         | Guest handle: command forwarding, rejection tap, disposal                    | N/A          | `dispose()` fires `onEnded` exactly once                                           |
| `TavernJoinResult`    | Join outcome: answer code, guest handle, and the `ready` promise             | N/A          | A `ready` nobody awaits never surfaces as an unhandled rejection                   |
| `TavernHostEvent`     | Host observability union for `tap()`: presence, warnings, dispose            | N/A          | Lifecycle transitions are `onEnded`, not events                                    |
| `TavernGuestEvent`    | Guest observability union for `tap()`: rejections, warnings, dispose         | N/A          | The opening transition is `ready`, not an event                                    |
| `TavernCommands`      | The host's command table: a record of handlers keyed by command name         | N/A          | A name the record does not hold rejects without applying                           |
| `TavernSubject`       | Snapshot reading, change and removal subscriptions                           | N/A          | `snapshot` returning `null` skips the broadcast                                    |
| `TavernError`         | Base error for every Tavern failure                                          | N/A          | N/A                                                                                |
| `TavernPairingError`  | The consumer pasted the wrong kind of pairing code                           | N/A          | N/A                                                                                |
| `TavernDisposedError` | A stopped host or ended guest was used again                                 | N/A          | N/A                                                                                |

## Package Entry Point

| Import             | Purpose                    |
| ------------------ | -------------------------- |
| `@vielzeug/tavern` | Complete public Tavern API |

The `MeshPeer` type carried by host events and the `peers` getter is re-exported here, so a single import types everything.

## `hostTavern(options)`

Creates a mesh host for one subject. Guest commands are validated against the wire shape (Tavern's own protocol) and checked against `commands`: a name the table does not hold rejects without applying, and a handler that throws rejects the guest with the error's message. Local changes (via `subject.onChanged`) re-broadcast `subject.snapshot()`: coalesced on a microtask; `subject.onRemoved` ends hosting. Presence and transport warnings are reported through `tap()` as `TavernHostEvent`s, and the live peer list is the `peers` getter; hosting ending: from removal or `dispose()`: fires `onEnded` exactly once. `relayNotice` serializes through `serializeNotice` and broadcasts to every guest.

**Returns:** `TavernHost`: the host handle.

| Option             | Type                          | Description                                                                   |
| ------------------ | ----------------------------- | ----------------------------------------------------------------------------- |
| `commands?`        | `TavernCommands`              | The command table guest actions run through; omit for a read-only session     |
| `onEnded?`         | `() => void`                  | Hosting ended: the subject was removed or `dispose()` ran. Fires exactly once |
| `rtc?`             | `MeshRtcFactory`              | WebRTC factory: the injection point for tests and non-browser runtimes        |
| `serializeNotice?` | `(notice) => unknown \| null` | Serializes a local notice for `relayNotice`; null skips that notice           |
| `subject`          | `TavernSubject`               | Snapshot reading, change and removal subscriptions for the hosted subject     |

**Example**

```ts
import { hostTavern } from '@vielzeug/tavern';

const host = hostTavern({
  commands: {
    rename: (args) => myStore.rename(docId, args[0] as string),
    append: (args) => myStore.append(docId, args[0] as string),
  },
  subject: {
    onChanged: (listener) => myStore.onUpdated(docId, listener),
    onRemoved: (listener) => myStore.onRemoved(docId, listener),
    snapshot: () => myStore.read(docId),
  },
});
```

### `TavernHost` members

| Member                   | Type                             | Behavior                                                                                 |
| ------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------- |
| `acceptAnswerCode()`     | `(code) => Promise<MeshPeer>`    | Consumes a guest's answer code; resolves with the peer once the channel is open          |
| `createInvitationCode()` | `() => Promise<string>`          | Produces a single-use invitation code, QR-compact when the environment allows            |
| `disposalSignal`         | `AbortSignal`                    | Aborted when hosting ends                                                                |
| `dispose()`              | `() => void`                     | Stops hosting: closes every channel and detaches all subscriptions; idempotent           |
| `disposed`               | `boolean`                        | Whether hosting has ended                                                                |
| `kick()`                 | `(peerId) => void`               | Disconnects one guest; the guest observes it and fires `onEnded`                         |
| `peers`                  | `readonly MeshPeer[]`            | The guests currently connected                                                           |
| `relayNotice()`          | `(notice) => void`               | Broadcasts `serializeNotice(notice)` to every guest. Dropped after hosting ended         |
| `tap()`                  | `(handler, opts?) => () => void` | Subscribes to `TavernHostEvent`s; handler errors are swallowed; detaches on abort or end |
| `[Symbol.dispose]()`     | `() => void`                     | Delegates to `dispose()`; enables `using` declarations                                   |

## `joinTavern(options)`

Joins a session as a guest: decodes the invitation code, opens the mesh guest, and returns the answer code to show back. Snapshots mount through `mount` as they arrive; the first non-null mount settles `ready`. The session ends exactly once: from the channel dropping (`TavernError`), an early exit before mounting (`TavernDisposedError`), or disposal.

**Returns:** `Promise<TavernJoinResult<Mounted>>`: the answer code, the guest handle, and the `ready` promise. Rejects with `TavernPairingError` when the invitation code cannot be used.

| Option           | Type                            | Description                                                                             |
| ---------------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| `invitationCode` | `string`                        | The invitation code the host produced                                                   |
| `mount`          | `(snapshot) => Mounted \| null` | Turns a received snapshot into the mounted mirror; null ignores it. Called per snapshot |
| `name`           | `string`                        | The guest's display name on the channel                                                 |
| `onEnded?`       | `(subject: Mounted) => void`    | The channel ended after joining; receives the mounted subject for unmounting            |
| `onNotice?`      | `(wire: unknown) => void`       | Receives a notice the host relayed: re-emit it in the local UI                          |
| `rtc?`           | `MeshRtcFactory`                | WebRTC factory: the injection point for tests and non-browser runtimes                  |

**Example**

```ts
import { joinTavern } from '@vielzeug/tavern';

const { answerCode, guest, ready } = await joinTavern({
  invitationCode,
  mount: (snapshot) => mySchema.parse(snapshot),
  name: 'Alex',
  onEnded: (subject) => unmountMirror(subject),
});
await host.acceptAnswerCode(answerCode);
await ready; // the mirror is live
```

### `TavernJoinResult<Mounted>` members

| Member       | Type               | Behavior                                                                                         |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------------ |
| `answerCode` | `string`           | The answer code to show back to the host, QR-compact when the environment allows                 |
| `guest`      | `TavernGuest`      | The guest handle                                                                                 |
| `ready`      | `Promise<Mounted>` | Resolves with the mounted subject on the first mount; rejects with why the session never came up |

### `TavernGuest` members

| Member               | Type                             | Behavior                                                                                     |
| -------------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| `disposalSignal`     | `AbortSignal`                    | Aborted when the session ends                                                                |
| `dispose()`          | `() => void`                     | Leaves the session; `onEnded` fires exactly once                                             |
| `disposed`           | `boolean`                        | Whether the session has ended                                                                |
| `sendCommand()`      | `(name, args?) => void`          | Forwards a command to the host's table; throws `TavernDisposedError` after the session ended |
| `tap()`              | `(handler, opts?) => () => void` | Subscribes to `TavernGuestEvent`s; handler errors are swallowed; detaches on abort or end    |
| `[Symbol.dispose]()` | `() => void`                     | Delegates to `dispose()`; enables `using` declarations                                       |

## Types

### `TavernCommands`

```ts
type TavernCommand = (args: readonly unknown[]) => void;
type TavernCommands = Record<string, TavernCommand>;
```

The host's command table, keyed by name: the same functions the host's own UI calls, so guest actions follow exactly the same validation path as local ones. A missing key rejects the guest with `The host has no command named "..."`; a throwing handler rejects with its message. Omit the table entirely for a read-only session.

### `TavernSubject`

```ts
interface TavernSubject {
  onChanged(listener: () => void): () => void;
  onRemoved(listener: () => void): () => void;
  snapshot(): unknown;
}
```

How the host reads and watches the single subject it shares. `onChanged` is the re-broadcast trigger; `onRemoved` ends hosting; `snapshot()` returns the JSON-serializable state to broadcast, or `null` while the subject is missing (the broadcast skips). A throwing `snapshot` is reported as a `warning` tap event instead of crashing the host.

### `TavernHostEvent`

| Variant                                | Fires when                                                 |
| -------------------------------------- | ---------------------------------------------------------- |
| `{ type: 'peer-joined'; peer }`        | A guest's channel opened                                   |
| `{ type: 'peer-left'; peer; reason? }` | A guest's channel closed                                   |
| `{ type: 'warning'; message; error }`  | A transport error or a throwing snapshot read was survived |
| `{ type: 'dispose' }`                  | Hosting ended and the tap stream is about to clear         |

### `TavernGuestEvent`

| Variant                                    | Fires when                                             |
| ------------------------------------------ | ------------------------------------------------------ |
| `{ type: 'rejected'; commandId; message }` | The host rejected a forwarded command                  |
| `{ type: 'warning'; message; error }`      | A transport error was survived                         |
| `{ type: 'dispose' }`                      | The session ended and the tap stream is about to clear |

## Errors

### `TavernError`

Base class for every Tavern failure; `instanceof TavernError` narrows the whole hierarchy. Channel failures before the first snapshot reject `ready` with this class.

### `TavernPairingError`

The code the consumer pasted could not be used: garbage, the wrong kind, an expired invitation, or an answer the host refuses. The underlying `@vielzeug/mesh` failure is chained as `cause`.

### `TavernDisposedError`

A stopped host or ended guest was used again: control-plane calls throw it so leaked handles surface, and it rejects `ready` when the guest leaves before the first snapshot.
