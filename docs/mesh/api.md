---
title: Mesh — API Reference
description: Public API of @vielzeug/mesh.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `createMeshHost` | Host-authoritative session node; pairs one `RTCPeerConnection` per guest | Sync | `createInvitation`/`acceptAnswer` are async; calls after `dispose()` throw `MeshDisposedError` |
| `createMeshGuest` | Guest node that pairs with one host | Sync | Second `acceptInvitation` throws `MeshPairingError` |
| `meshCodec` | base64url encode/decode for pairing payloads | Sync | `decode` throws `MeshPairingError` on malformed text or wrong `v` |
| `meshQrCodec` | deflate-raw + base64url codec for QR-sized payloads | Async | `encode` throws `MeshUnsupportedError` without `CompressionStream` |
| `MeshProtocol` | Declares the `toHost`/`toGuest` message maps | — | Extend it; the maps themselves stay plain records |
| `MeshError` | Base class for all mesh errors | — | `instanceof MeshError` catches every mesh-originated error |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/mesh` | Complete public Mesh API |

## Factory Functions

### createMeshHost()

```ts
function createMeshHost<P extends MeshProtocol>(options?: MeshHostOptions): MeshHost<P>;
```

Returns a host node in status `'idle'`. Creating it never touches WebRTC — the first `createInvitation()` does.

#### Options (`MeshHostOptions`)

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `iceServers` | `readonly RTCIceServer[]` | `[]` | Passed to the peer connection; mesh ships no STUN/TURN. |
| `channel` | `MeshChannelOptions` | `{ ordered: true, label: 'mesh' }` | Data-channel init mapped to `RTCDataChannelInit`. |
| `maxMessageBytes` | `number` | `65_536` | Serialized message cap, both directions. |
| `invitationTtlMs` | `number` | `300_000` | Invitation validity window. |
| `iceGatheringTimeoutMs` | `number` | `5_000` | ICE gathering cap; also bounds the channel-open wait. |
| `serialize` / `deserialize` | functions | `JSON.stringify` / `JSON.parse` | Message envelope serialization. |
| `rtc` | `MeshRtcFactory` | `globalThis.RTCPeerConnection` | Injection point for tests and non-browser runtimes. |
| `clock` | `() => number` | `Date.now` | TTLs and message timestamps. |
| `random` | `RandomSource` | `crypto.getRandomValues` | Ids and secrets. |
| `signal` | `AbortSignal` | — | Disposes the node on abort. |
| `approvePeer` | `(peer: MeshPeerInfo) => boolean \| Promise<boolean>` | approve | Runs after proof verification; `false` rejects with `MeshPairingError`. |

#### Example

```ts
import { createMeshHost, meshCodec } from '@vielzeug/mesh';

const host = createMeshHost<AppProtocol>({ approvePeer: (peer) => peer.name !== undefined });
const invitation = await host.createInvitation();
```

---

### createMeshGuest()

```ts
function createMeshGuest<P extends MeshProtocol>(options?: MeshGuestOptions): MeshGuest<P>;
```

Returns a guest node in status `'idle'`. `MeshGuestOptions` is `MeshOptions` — the shared option table above without `approvePeer`.

#### Example

```ts
import { createMeshGuest, meshCodec } from '@vielzeug/mesh';

const guest = createMeshGuest<AppProtocol>();
const answer = await guest.acceptInvitation(meshCodec.decode(invitationText), { name: 'Sam' });
```

## Host Surface

`MeshHost<P>` extends `MeshNode`.

| Member | Signature | Purpose |
| --- | --- | --- |
| `createInvitation` | `(meta?: { name?: string }) => Promise<MeshInvitation>` | Single-use invitation for one guest; repeatable — one per guest. |
| `acceptAnswer` | `(answer: MeshAnswer) => Promise<MeshPeer>` | Verifies proof + approval, then resolves once the channel opens. Rejects `MeshPairingError` (unknown/expired/duplicate session, proof mismatch, refusal) or `MeshTimeoutError`. |
| `peers` | `ReadonlyMap<string, MeshPeer>` | Live peer inventory keyed by peer id. |
| `send` | `<K extends keyof P['toGuest'] & string>(peerId: string, type: K, payload: P['toGuest'][K]) => void` | Typed unicast; throws `MeshConnectionError` for unknown/unconnected peers, `MeshPayloadError` over the cap. |
| `broadcast` | `<K extends keyof P['toGuest'] & string>(type: K, payload: P['toGuest'][K], options?: { except?: readonly string[] }) => void` | Sends to every connected peer not in `except`. |
| `on` | `<K extends keyof P['toHost'] & string>(type: K, handler: (message: MeshInbound<P['toHost'][K]>) => void) => Unsubscribe` | Typed inbound subscription from any guest. |
| `onPeer` | `(handler: (event: MeshPeerEvent) => void) => Unsubscribe` | `'joined'` / `'left'` / `'status-change'` per peer. |
| `kick` | `(peerId: string, reason?: string) => void` | Disconnects a peer; the guest observes `'disconnected'`. |

## Guest Surface

`MeshGuest<P>` extends `MeshNode`.

| Member | Signature | Purpose |
| --- | --- | --- |
| `acceptInvitation` | `(invitation: MeshInvitation, meta?: { name?: string }) => Promise<MeshAnswer>` | Consumes an invitation; the returned answer goes back to the host out-of-band. Throws `MeshPairingError` on expired/malformed input or when already paired. |
| `host` | `MeshPeer \| null` | The host peer once pairing started; its `id` is the invitation's `sessionId`. |
| `send` | `<K extends keyof P['toHost'] & string>(type: K, payload: P['toHost'][K]) => void` | Typed send to the host; throws `MeshConnectionError` when unpaired. |
| `on` | `<K extends keyof P['toGuest'] & string>(type: K, handler: (message: MeshInbound<P['toGuest'][K]>) => void) => Unsubscribe` | Typed inbound subscription from the host. |

## Shared Surface

`MeshNode` members common to host and guest.

| Member | Signature | Purpose |
| --- | --- | --- |
| `id` | `string` | This node's id. |
| `status` | `MeshStatus` | Current lifecycle state. |
| `disposed` | `boolean` | Whether the node is permanently disposed. |
| `disposalSignal` | `AbortSignal` | Aborted by `dispose()`. |
| `dispose` | `() => void` | Idempotent teardown: closes every connection, aborts `disposalSignal`, emits `'dispose'`, detaches tappers. |
| `[Symbol.dispose]` | `() => void` | Enables `using` declarations. |
| `tap` | `(handler: (event: MeshEvent) => void, options?: { signal?: AbortSignal }) => Unsubscribe` | Observability stream; handler errors are swallowed. |

## Codec

```ts
const meshCodec: {
  encode(payload: MeshInvitation | MeshAnswer): string;
  decode(text: string): MeshInvitation | MeshAnswer;
};
```

Compact JSON → base64url for pairing payloads, kept pure so other encodings can slot in later. `decode` validates shape and `v`, throwing `MeshPairingError` on malformed text, wrong version, or unrecognized payload.

```ts
const text = meshCodec.encode(await host.createInvitation());
const answer = await guest.acceptInvitation(meshCodec.decode(text));
await host.acceptAnswer(meshCodec.decode(meshCodec.encode(answer)));
```

### `meshQrCodec`

```ts
const meshQrCodec: {
  encode(payload: MeshInvitation | MeshAnswer): Promise<string>;
  decode(text: string): Promise<MeshInvitation | MeshAnswer>;
};
```

QR-oriented variant: deflate-raw compresses the JSON payload, then base64url-encodes it with an `mq1.` prefix. `decode` accepts both `mq1.*` and plain `meshCodec` output, so camera scans and paste fallbacks share one path.

```ts
const invitationText = await meshQrCodec.encode(await host.createInvitation()); // "mq1.…"
const answer = await host.acceptAnswer(await meshQrCodec.decode(scannedText));
```

`encode` throws `MeshUnsupportedError` where `CompressionStream` is missing; `decode` throws `MeshPairingError` on corrupt base64/deflate/JSON and `MeshUnsupportedError` where `DecompressionStream` is missing.

## Types

### Protocol

```ts
interface MeshProtocol {
  readonly toHost: MeshMessageMap;  // messages a guest may send
  readonly toGuest: MeshMessageMap; // messages the host may send
}

type MeshMessageMap = Record<string, unknown>;
```

### Pairing payloads

```ts
interface MeshInvitation {
  readonly v: 1;
  readonly sessionId: string;  // 128-bit, base64url
  readonly secret: string;     // 256-bit, base64url
  readonly expiresAt: number;  // epoch ms
  readonly sdp: string;        // host offer, candidates inlined
}

interface MeshAnswer {
  readonly v: 1;
  readonly sessionId: string;
  readonly proof: string;      // HMAC-SHA-256 of the answer SDP keyed by secret
  readonly peer: { readonly id: string; readonly name?: string };
  readonly sdp: string;
}
```

### Peers, status, messages

```ts
type MeshStatus = 'idle' | 'pairing' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'disposed';

interface MeshPeerInfo {
  readonly id: string;
  readonly name?: string;
}

interface MeshPeer extends MeshPeerInfo {
  readonly status: MeshStatus;
  readonly role: 'host' | 'guest';
}

type MeshPeerEvent =
  | { readonly type: 'joined'; readonly peer: MeshPeer }
  | { readonly type: 'left'; readonly peer: MeshPeer; readonly reason?: string }
  | { readonly type: 'status-change'; readonly peer: MeshPeer };

interface MeshInbound<T> {
  readonly peerId: string;
  readonly messageId: string;
  readonly sentAt: number;
  readonly payload: T;
}

type Unsubscribe = () => void;
```

### Events

```ts
type MeshEvent =
  | { readonly type: 'status-change'; readonly peerId: string | null; readonly status: MeshStatus }
  | { readonly type: 'invitation-created' | 'invitation-expired'; readonly sessionId: string }
  | { readonly type: 'peer-approved' | 'peer-rejected' | 'peer-joined' | 'peer-left'; readonly peerId: string; readonly reason?: string }
  | { readonly type: 'message-sent' | 'message-received'; readonly peerId: string; readonly messageType: string; readonly bytes: number }
  | { readonly type: 'message-rejected'; readonly peerId: string; readonly reason: 'too-large' | 'duplicate' | 'malformed' | 'unknown-type' }
  | { readonly type: 'ice-state'; readonly peerId: string; readonly state: string }
  | { readonly type: 'security-downgrade'; readonly reason: string }
  | { readonly type: 'error'; readonly error: MeshError }
  | { readonly type: 'dispose' };
```

`peerId: null` on `'status-change'` marks a node-level transition; a string marks a per-peer one.

### Options

```ts
interface MeshChannelOptions {
  readonly ordered?: boolean;
  readonly maxRetransmits?: number;
  readonly label?: string;
}

interface MeshOptions {
  readonly iceServers?: readonly RTCIceServer[];
  readonly channel?: MeshChannelOptions;
  readonly maxMessageBytes?: number;
  readonly invitationTtlMs?: number;
  readonly iceGatheringTimeoutMs?: number;
  readonly serialize?: (value: unknown) => string;
  readonly deserialize?: (text: string) => unknown;
  readonly rtc?: MeshRtcFactory;
  readonly clock?: () => number;
  readonly random?: RandomSource;
  readonly signal?: AbortSignal;
}

interface MeshHostOptions extends MeshOptions {
  readonly approvePeer?: (peer: MeshPeerInfo) => boolean | Promise<boolean>;
}

type MeshGuestOptions = MeshOptions;
```

### WebRTC injection

Minimal structural subsets — the surface mesh actually calls, no more. Implement them over `wrtc` or a test double to run outside a browser.

```ts
interface MeshRtcFactory {
  createPeerConnection(config: RTCConfiguration): RTCPeerConnectionLike;
}

interface RTCPeerConnectionLike {
  readonly connectionState: string;
  readonly iceConnectionState: string;
  readonly iceGatheringState: string;
  readonly localDescription: RTCSessionDescriptionLike | null;
  createDataChannel(label: string, init?: { ordered?: boolean; maxRetransmits?: number }): RTCDataChannelLike;
  createOffer(): Promise<RTCSessionDescriptionLike>;
  createAnswer(): Promise<RTCSessionDescriptionLike>;
  setLocalDescription(description: RTCSessionDescriptionLike): Promise<void>;
  setRemoteDescription(description: RTCSessionDescriptionLike): Promise<void>;
  close(): void;
  addEventListener(type: 'datachannel', listener: (event: { readonly channel: RTCDataChannelLike }) => void): void;
  addEventListener(type: 'icegatheringstatechange' | 'iceconnectionstatechange' | 'connectionstatechange', listener: () => void): void;
  addEventListener(type: string, listener: (event: MeshRtcEvent) => void): void;
  removeEventListener(type: string, listener: (event: MeshRtcEvent) => void): void;
}

interface RTCDataChannelLike {
  readonly readyState: string;
  send(data: string): void;
  close(): void;
  addEventListener(type: 'open' | 'close' | 'error', listener: () => void): void;
  addEventListener(type: 'message', listener: (event: { readonly data: string }) => void): void;
  addEventListener(type: string, listener: (event: MeshRtcEvent) => void): void;
  removeEventListener(type: string, listener: (event: MeshRtcEvent) => void): void;
}

interface RTCSessionDescriptionLike {
  readonly type?: 'offer' | 'answer' | 'pranswer' | 'rollback';
  readonly sdp?: string;
}

interface MeshRtcEvent {
  readonly data?: unknown;
  readonly channel?: RTCDataChannelLike;
}
```

## Errors

| Class | Thrown when | Notable properties |
| --- | --- | --- |
| `MeshError` | Base class — never thrown directly | `instanceof MeshError` catches all mesh errors |
| `MeshPairingError` | Malformed/expired/unknown invitation or answer, proof mismatch, duplicate answer, `approvePeer` refusal, codec `decode` failure | — |
| `MeshConnectionError` | ICE/DTLS failure, channel closed, send to unknown/unconnected peer, offer/answer creation failure | `peerId: string \| null` |
| `MeshPayloadError` | Outbound message over `maxMessageBytes` or unserializable | — |
| `MeshTimeoutError` | Channel-open wait exceeded | — |
| `MeshDisposedError` | Any method called after `dispose()` | — |
| `MeshUnsupportedError` | No `RTCPeerConnection` in the environment and no `rtc` injected — raised at first use, never at import | — |
