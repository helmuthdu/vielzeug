---
title: Tavern — API Reference
description: Public API of @vielzeug/tavern.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `hostTavern()` | Host a subject: pairing, command validation, snapshot broadcast | Sync factory | Disposing ends hosting for every guest |
| `joinTavern()` | Join a session: consume invitation, produce answer | Async | The session lives only after the host accepts and the first snapshot mounts |
| `TavernHost` | Host handle: invitation, answer acceptance, kick, notice relay | — | `dispose()` is idempotent |
| `TavernGuest` | Guest handle: command forwarding, disposal | — | `dispose()` fires `onEnded` exactly once |
| `TavernCommands` | The host's command table | — | Unknown names and foreign subject ids reject without applying |
| `TavernSubjects` | Snapshot reading, change and removal subscriptions | — | `snapshot` returning `null` skips the broadcast |
| `TavernNotices` | Wire serialization of local notices | — | `toWire` returning `null` skips that notice |
| `TavernError` | Base error for every Tavern failure | — | — |
| `TavernPairingError` | The consumer pasted the wrong kind of pairing code | — | — |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/tavern` | Complete public Tavern API |

## `hostTavern(options)`

Creates a mesh host for one subject. Guest commands are validated against the wire shape (Tavern's own protocol), checked against `commands.has` and the `subjectId`, then applied through `commands.apply` — throwing rejects the guest with the error's message. Local changes (via `subjects.onChanged`) re-broadcast `subjects.snapshot()` — coalesced on a microtask; `subjects.onRemoved` ends hosting. Peers are reported through `onPeersChanged`, `onPeerJoined`, and `onPeerLeft`. `relayNotice` serializes through `notices.toWire` and broadcasts to every guest.

**Returns:** `TavernHost` — the host handle.

| Option | Type | Description |
| --- | --- | --- |
| `commands` | `TavernCommands` | The host's command table — the same object the host's own UI calls |
| `notices?` | `TavernNotices` | Notice relay; omit to disable notice broadcasting |
| `onPeersChanged?` | `(peers: MeshPeer[]) => void` | The full peer list, whenever it changes |
| `onPeerJoined?` | `(peer: MeshPeer) => void` | A peer joined |
| `onPeerLeft?` | `(peer: MeshPeer) => void` | A peer left |
| `onWarning?` | `(message: string) => void` | A transport-level warning |
| `rtc?` | `MeshRtcFactory` | WebRTC factory — the injection point for tests and non-browser runtimes |
| `subjectId` | `string` | The id of the hosted subject — guest commands targeting anything else reject |
| `subjects` | `TavernSubjects` | Snapshot reading, change and removal subscriptions |

**Example**

```ts
import { hostTavern } from '@vielzeug/tavern';

const host = hostTavern({
  commands: {
    apply: (name, args) => myStore.apply(name, args),
    has: (name) => name in myStore,
  },
  subjectId: 'doc-1',
  subjects: {
    onChanged: (listener) => myStore.onUpdated('doc-1', listener),
    onRemoved: (listener) => myStore.onRemoved('doc-1', listener),
    snapshot: () => myStore.read('doc-1'),
  },
});
```

### `TavernHost` methods

| Method | Returns | Description |
| --- | --- | --- |
| `acceptAnswerText(text)` | `Promise<MeshPeer>` | Consumes a guest's answer code; resolves with the peer once the channel opens |
| `createInvitationText()` | `Promise<string>` | Produces a single-use invitation code, QR-compact when the environment allows |
| `dispose()` | `void` | Stops hosting: closes every channel and detaches all subscriptions. Idempotent |
| `kick(peerId)` | `void` | Disconnects a peer; the guest observes a disconnect |
| `relayNotice(notice)` | `void` | Relays one local notice to every guest; the serializer decides what crosses |

---

## `joinTavern(options)`

Consumes an invitation and returns `{ answerText, guest }`. The guest mounts snapshots through `mount(snapshot)` — the first successful mount fires `onJoined`; wire notices are relayed through `notices.fromWire`; rejections through `onRejected`. Channel failures before the first mount fire `onFailed`; afterwards, a disconnect or `guest.dispose()` fires `onEnded` with the mounted subject exactly once. `guest.sendCommand` forwards a command to the host with the subject id the consumer routes by.

**Returns:** `Promise<{ answerText: string; guest: TavernGuest }>` — the answer code to show back and the guest handle.

| Option | Type | Description |
| --- | --- | --- |
| `invitationText` | `string` | The invitation code the host produced |
| `mount` | `(snapshot: unknown) => Mounted \| null` | Mounts a received snapshot; the mounted value, or `null` to ignore |
| `name` | `string` | The guest's display name on the channel |
| `notices?` | `TavernNotices` | Notice relay; wire notices re-emit locally through `fromWire` |
| `onEnded?` | `(subject: Mounted) => void` | The channel ended after joining; the mounted value is passed for unmounting |
| `onFailed?` | `(reason: string) => void` | The host never accepted the answer in time |
| `onJoined?` | `(subject: Mounted) => void` | The mounted value once the first snapshot arrives |
| `onRejected?` | `(message: string) => void` | The host rejected a forwarded command |
| `onWarning?` | `(message: string) => void` | A transport-level warning |
| `rtc?` | `MeshRtcFactory` | WebRTC factory — the injection point for tests and non-browser runtimes |

**Example**

```ts
import { joinTavern } from '@vielzeug/tavern';

const { answerText, guest } = await joinTavern({
  invitationText: invitation,
  mount: (snapshot) => sanitizeAndMount(snapshot),
  name: 'Alex',
  onEnded: (subject) => unmountMirror(subject.id),
  onJoined: (subject) => mountMirror(subject),
});

guest.sendCommand('doc-1', 'rename', ['New name']);
guest.dispose();
```

### `TavernGuest` methods

| Method | Returns | Description |
| --- | --- | --- |
| `dispose()` | `void` | Leaves the session and drops the channel. Fires `onEnded` exactly once |
| `sendCommand(subjectId, name, args)` | `void` | Forwards a command to the host. Throws `TavernError` if the session has ended |

---

## Types

```ts
/** What the host can do on behalf of a guest. */
interface TavernCommands {
  /** Whether a command name is known; unknown names reject without applying. */
  has(name: string): boolean;
  /** Applies the command; throwing rejects the guest with the error's message. */
  apply(name: string, args: readonly unknown[]): unknown;
}

/**
 * How the host reads and watches the subject it is sharing. All three close over
 * whatever subject state the consumer owns — the host routes by `subjectId`,
 * not by a subject object.
 */
interface TavernSubjects {
  /** Reads the snapshot to broadcast; null while the subject is missing. */
  snapshot(): unknown;
  /** Subscribes to local changes of the hosted subject — the re-broadcast trigger. */
  onChanged(listener: () => void): () => void;
  /** Subscribes to the hosted subject's removal — hosting ends when it fires. */
  onRemoved(listener: () => void): () => void;
}

/**
 * Notice relay between host and guests. Notices cross the wire as opaque
 * values — each client translates locally.
 */
interface TavernNotices {
  /** Serializes a local notice for the wire; null skips this one. */
  toWire(notice: unknown): unknown | null;
  /** Re-emits a received wire notice locally. */
  fromWire(wire: unknown): void;
}

/** Options for `hostTavern`. */
interface TavernHostOptions {
  commands: TavernCommands;
  notices?: TavernNotices;
  onPeersChanged?(peers: MeshPeer[]): void;
  onPeerJoined?(peer: MeshPeer): void;
  onPeerLeft?(peer: MeshPeer): void;
  onWarning?(message: string): void;
  rtc?: MeshRtcFactory;
  subjectId: string;
  subjects: TavernSubjects;
}

/** Options for `joinTavern`. */
interface TavernGuestOptions<Mounted> {
  invitationText: string;
  /** Mounts a received snapshot; the mounted value, or null to ignore. */
  mount(snapshot: unknown): Mounted | null;
  name: string;
  notices?: TavernNotices;
  onEnded?(subject: Mounted): void;
  onFailed?(reason: string): void;
  onJoined?(subject: Mounted): void;
  onRejected?(message: string): void;
  onWarning?(message: string): void;
  rtc?: MeshRtcFactory;
}

/** Host handle returned by `hostTavern`. */
interface TavernHost {
  acceptAnswerText(text: string): Promise<MeshPeer>;
  createInvitationText(): Promise<string>;
  dispose(): void;
  kick(peerId: string): void;
  relayNotice(notice: unknown): void;
}

/** Guest handle returned by `joinTavern`. */
interface TavernGuest {
  dispose(): void;
  sendCommand(subjectId: string, name: string, args: readonly unknown[]): void;
}
```

## Errors

| Error | Triggered by | Notable properties |
| --- | --- | --- |
| `TavernError` | Base class for every Tavern failure — catch this to handle all Tavern errors in one branch | — |
| `TavernPairingError` | The consumer pasted an invitation where an answer was expected (or vice versa), or the pairing payload was unrecognized | — |

`TavernPairingError` extends `TavernError`. Both are thrown by `hostTavern.acceptAnswerText` and `joinTavern` on pairing mistakes; `TavernGuest.sendCommand` throws `TavernError` when the session has already ended.
