---
title: 'Tavern: API Reference'
description: Public API of @vielzeug/tavern.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `hostTavern()` | Host a subject: pairing, command validation, snapshot broadcast | Sync factory | Disposing ends hosting for every guest |
| `joinTavern()` | Join a session: consume invitation, produce answer | Async | The session lives only after the host accepts and the first snapshot mounts |
| `TavernHost` | Host handle: invitation, answer acceptance, kick, notice relay, presence tap | N/A | `dispose()` is idempotent; control-plane methods throw `TavernDisposedError` after |
| `TavernGuest` | Guest handle: command forwarding, rejection tap, disposal | N/A | `dispose()` fires `onEnded` exactly once |
| `TavernHostEvent` | Host observability union for `tap()`: presence and warnings | N/A | Lifecycle transitions are callbacks, not events |
| `TavernGuestEvent` | Guest observability union for `tap()`: rejections and warnings | N/A | `onJoined`/`onFailed` fire before the handle exists, so they stay callbacks |
| `TavernCommands` | The host's command table | N/A | Unknown names and foreign subject ids reject without applying |
| `TavernSubjects` | Snapshot reading, change and removal subscriptions | N/A | `snapshot` returning `null` skips the broadcast |
| `TavernNotices` | Wire serialization of local notices | N/A | `toWire` returning `null` skips that notice |
| `TavernError` | Base error for every Tavern failure | N/A | N/A |
| `TavernPairingError` | The consumer pasted the wrong kind of pairing code | N/A | N/A |
| `TavernDisposedError` | A stopped host or ended guest was used again | N/A | N/A |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/tavern` | Complete public Tavern API |

## `hostTavern(options)`

Creates a mesh host for one subject. Guest commands are validated against the wire shape (Tavern's own protocol), checked against `commands.has` and the `subjectId`, then applied through `commands.apply`: throwing rejects the guest with the error's message. Local changes (via `subjects.onChanged`) re-broadcast `subjects.snapshot()`: coalesced on a microtask; `subjects.onRemoved` ends hosting. Presence and transport warnings are reported through `tap()` as `TavernHostEvent`s, and the live peer list is the `peers` getter; hosting ending: from removal or `dispose()`: fires `onEnded` exactly once. `relayNotice` serializes through `notices.toWire` and broadcasts to every guest.

**Returns:** `TavernHost`: the host handle.

| Option | Type | Description |
| --- | --- | --- |
| `commands` | `TavernCommands` | The host's command table: the same object the host's own UI calls |
| `notices?` | `TavernNotices` | Notice relay; omit to disable notice broadcasting |
| `onEnded?` | `() => void` | Hosting ended: the subject was removed or `dispose()` ran. Fires exactly once |
| `rtc?` | `MeshRtcFactory` | WebRTC factory: the injection point for tests and non-browser runtimes |
| `subjectId` | `string` | The id of the hosted subject: guest commands targeting anything else reject |
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

### `TavernHost` members

| Member | Returns | Description |
| --- | --- | --- |
| `acceptAnswerText(text)` | `Promise<MeshPeer>` | Consumes a guest's answer code; resolves with the peer once the channel opens. Throws `TavernPairingError` for any unusable code: wrong kind, malformed, expired: with the underlying error as `cause`. Throws `TavernDisposedError` after `dispose()` |
| `createInvitationText()` | `Promise<string>` | Produces a single-use invitation code, QR-compact when the environment allows. Throws `TavernDisposedError` after `dispose()` |
| `disposalSignal` | `AbortSignal` | Aborted when hosting ends |
| `dispose()` | `void` | Stops hosting: closes every channel and detaches all subscriptions. Idempotent; fires `onEnded` exactly once |
| `disposed` | `boolean` | Whether hosting has ended |
| `kick(peerId)` | `void` | Disconnects a peer; the guest observes a disconnect. Throws `TavernDisposedError` after `dispose()` |
| `peers` | `readonly MeshPeer[]` | The guests currently connected; current inside a `peer-joined`/`peer-left` tap event |
| `relayNotice(notice)` | `void` | Relays one local notice to every guest; the serializer decides what crosses. A notice relayed after `dispose()` is dropped: ephemeral UI state with no audience left |
| `tap(handler, options?)` | `() => void` | Observes `TavernHostEvent`s; returns an unsubscribe function |
| `[Symbol.dispose]()` | `void` | Delegates to `dispose()`. Enables `using` declarations |

---

## `joinTavern(options)`

Consumes an invitation and returns `{ answerText, guest }`. The guest mounts snapshots through `mount(snapshot)`: the first successful mount fires `onJoined`; wire notices are relayed through `notices.fromWire`; host rejections and transport warnings arrive through `tap()` as `TavernGuestEvent`s. Channel failures before the first mount fire `onFailed` (once); afterwards, a disconnect or `guest.dispose()` fires `onEnded` with the mounted subject exactly once. `guest.sendCommand` forwards a command to the host with the subject id the consumer routes by. An unusable invitation: wrong kind, malformed, expired: rejects with `TavernPairingError` and leaves no node or subscriptions behind.

**Returns:** `Promise<{ answerText: string; guest: TavernGuest }>`: the answer code to show back and the guest handle.

| Option | Type | Description |
| --- | --- | --- |
| `invitationText` | `string` | The invitation code the host produced |
| `mount` | `(snapshot: unknown) => Mounted \| null` | Mounts a received snapshot; the mounted value, or `null` to ignore |
| `name` | `string` | The guest's display name on the channel |
| `notices?` | `TavernNotices` | Notice relay; wire notices re-emit locally through `fromWire` |
| `onEnded?` | `(subject: Mounted) => void` | The channel ended after joining; the mounted value is passed for unmounting |
| `onFailed?` | `(reason: string) => void` | The host never accepted the answer in time |
| `onJoined?` | `(subject: Mounted) => void` | The mounted value once the first snapshot arrives |
| `rtc?` | `MeshRtcFactory` | WebRTC factory: the injection point for tests and non-browser runtimes |

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
guest.tap((event) => {
  if (event.type === 'rejected') console.warn(event.commandId, event.message);
});

guest.sendCommand('doc-1', 'rename', ['New name']);
guest.dispose();
```

### `TavernGuest` members

| Member | Returns | Description |
| --- | --- | --- |
| `disposalSignal` | `AbortSignal` | Aborted when the session ends |
| `dispose()` | `void` | Leaves the session and drops the channel. Fires `onEnded` exactly once |
| `disposed` | `boolean` | Whether the session has ended: the channel dropped or `dispose()` ran |
| `sendCommand(subjectId, name, args)` | `void` | Forwards a command to the host. Throws `TavernDisposedError` if the session has ended |
| `tap(handler, options?)` | `() => void` | Observes `TavernGuestEvent`s; returns an unsubscribe function |
| `[Symbol.dispose]()` | `void` | Delegates to `dispose()`. Enables `using` declarations |

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
 * whatever subject state the consumer owns: the host routes by `subjectId`,
 * not by a subject object.
 */
interface TavernSubjects {
  /** Reads the snapshot to broadcast; null while the subject is missing. */
  snapshot(): unknown;
  /** Subscribes to local changes of the hosted subject: the re-broadcast trigger. */
  onChanged(listener: () => void): () => void;
  /** Subscribes to the hosted subject's removal: hosting ends when it fires. */
  onRemoved(listener: () => void): () => void;
}

/**
 * Notice relay between host and guests. Notices cross the wire as opaque
 * values: each client translates locally.
 */
interface TavernNotices {
  /** Serializes a local notice for the wire; null skips this one. */
  toWire(notice: unknown): unknown | null;
  /** Re-emits a received wire notice locally. */
  fromWire(wire: unknown): void;
}

/** Notable host moments reported through `TavernHost.tap`. */
type TavernHostEvent =
  | { readonly peer: MeshPeer; readonly type: 'peer-joined' }
  | { readonly peer: MeshPeer; readonly reason?: string; readonly type: 'peer-left' }
  | { readonly error: unknown; readonly message: string; readonly type: 'warning' };

/** Notable guest moments reported through `TavernGuest.tap`. */
type TavernGuestEvent =
  | { readonly commandId: string; readonly message: string; readonly type: 'rejected' }
  | { readonly error: unknown; readonly message: string; readonly type: 'warning' };

/** Options for `hostTavern`. */
interface TavernHostOptions {
  commands: TavernCommands;
  notices?: TavernNotices;
  /** Hosting ended: the subject was removed or `dispose()` ran. Fires exactly once. */
  onEnded?(): void;
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
  rtc?: MeshRtcFactory;
}

/** Host handle returned by `hostTavern`. */
interface TavernHost {
  acceptAnswerText(text: string): Promise<MeshPeer>;
  createInvitationText(): Promise<string>;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  kick(peerId: string): void;
  readonly peers: readonly MeshPeer[];
  relayNotice(notice: unknown): void;
  tap(handler: (event: TavernHostEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  [Symbol.dispose](): void;
}

/** Guest handle returned by `joinTavern`. */
interface TavernGuest {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  sendCommand(subjectId: string, name: string, args: readonly unknown[]): void;
  tap(handler: (event: TavernGuestEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  [Symbol.dispose](): void;
}
```

## Errors

| Error | Triggered by | Notable properties |
| --- | --- | --- |
| `TavernError` | Base class for every Tavern failure: catch this to handle all Tavern errors in one branch | N/A |
| `TavernPairingError` | A pairing code the consumer pasted could not be used: wrong kind, malformed, expired, or refused by the host. The mesh-level failure is chained as `cause` | `cause` |
| `TavernDisposedError` | A stopped host (`kick`, `createInvitationText`, `acceptAnswerText`) or an ended guest (`sendCommand`) was used again | N/A |

`TavernPairingError` and `TavernDisposedError` extend `TavernError`. Every user-input pairing mistake: a garbage code, the wrong code kind, an expired invitation, a refused answer: surfaces as `TavernPairingError` from `acceptAnswerText` and `joinTavern`; transport-level failures (timeouts, connection errors) propagate unchanged. Post-dispose use fails loudly with `TavernDisposedError`, mirroring mesh inside the Tavern error hierarchy.
