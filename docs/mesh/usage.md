---
title: Mesh — Usage Guide
description: How to use @vielzeug/mesh.
---

[[toc]]

## Basic Usage

Declare the protocol once, create a host and a guest, and exchange the pairing payloads out-of-band. `RTCPeerConnection` requires a secure context (`https:` or `localhost`).

```ts
import { createMeshGuest, createMeshHost, meshCodec, type MeshProtocol } from '@vielzeug/mesh';

interface AppProtocol extends MeshProtocol {
  toHost: { note: string };
  toGuest: { ack: { ok: boolean } };
}

const host = createMeshHost<AppProtocol>();
const guest = createMeshGuest<AppProtocol>();

// Host produces an invitation; the guest turns it into an answer.
const invitationText = meshCodec.encode(await host.createInvitation());
const answerText = meshCodec.encode(await guest.acceptInvitation(meshCodec.decode(invitationText)));

// The host resolves once the data channel is open.
await host.acceptAnswer(meshCodec.decode(answerText));

guest.send('note', 'hello');
host.on('note', (m) => host.send(m.peerId, 'ack', { ok: true }));
```

## Pairing Flow

Pairing is a two-leg manual exchange. Each leg is a base64url string produced by `meshCodec.encode` and consumed by `meshCodec.decode`.

```ts
// Host device — one invitation per prospective guest
const invitation = await host.createInvitation();
const text = meshCodec.encode(invitation);
```

Deliver `text` any way you can: a textarea the user copies, or `navigator.share` on mobile:

```ts
if (navigator.share) {
  await navigator.share({ text, title: 'Join my session' });
}
```

The guest decodes it and returns an answer the same way:

```ts
const answer = await guest.acceptInvitation(meshCodec.decode(text), { name: 'Sam' });
const answerText = meshCodec.encode(answer); // back to the host
const peer = await host.acceptAnswer(meshCodec.decode(answerText));
```

Rules that shape the flow:

- An invitation is **single-use** — call `createInvitation()` once per guest.
- It **expires** at `expiresAt` (default `invitationTtlMs: 300_000`). Expired invitations are refused on both sides and cleaned up on the host.
- The answer carries a **proof** derived from the invitation's secret, so a swapped or forged answer is rejected before any connection attempt.
- `approvePeer` runs after proof verification — return `false` to refuse a guest with `MeshPairingError` and a `'peer-rejected'` tap.

```ts
const host = createMeshHost<AppProtocol>({
  approvePeer: (peer) => allowlist.has(peer.id),
});
```

On the guest, the host's `peerId` is the invitation's `sessionId` — the invitation carries no other host identity. On the host, a guest's `peerId` is the id the guest generated for its answer.

### Pairing over QR

`meshQrCodec` is an async codec that compresses pairing payloads (deflate-raw + base64url, `mq1.` prefix) so they fit a QR code comfortably. `decode` accepts both the compressed `mq1.*` form and plain `meshCodec` output — paste fallback and camera scanning work through one code path.

```ts
import { meshQrCodec } from '@vielzeug/mesh';
import { encodeQr, toSvg } from '@vielzeug/sigil';

// Async — CompressionStream-based. Throws MeshUnsupportedError where streams are missing.
const invitationText = await meshQrCodec.encode(await host.createInvitation());
document.querySelector('#qr').innerHTML = toSvg(encodeQr(invitationText));

const answer = await host.acceptAnswer(await meshQrCodec.decode(scannedAnswerText));
```

`encode` throws `MeshUnsupportedError` where `CompressionStream`/`DecompressionStream` are unavailable — keep the plain `meshCodec` paste flow as a fallback. The [sigil pairing recipe](../sigil/examples/pair-two-devices.md) shows the full two-device flow, and `ore-qr-code`/`ore-qr-scanner` (Refine) wrap the rendering and camera sides.

## Sending and Receiving

`send`/`on`/`broadcast` are typed from the protocol. Outbound messages serialize through `serialize` (default `JSON.stringify`) into a versioned envelope with id, type, timestamp, and payload.

```ts
host.send(peerId, 'ack', { ok: true }); // one guest
host.broadcast('ack', { ok: true }, { except: [peerId] }); // all but one
guest.send('note', 'from the guest');
```

Inbound messages arrive as `MeshInbound<T>` — `{ peerId, messageId, sentAt, payload }`. Rules:

- Payloads over `maxMessageBytes` (default 65 536) throw `MeshPayloadError` outbound; oversized inbound frames are dropped and tapped as `'message-rejected'` with reason `'too-large'`.
- Duplicate message ids (e.g. after a retry) are dropped and tapped as `'duplicate'`.
- A type with no registered `on` handler is tapped as `'unknown-type'` — never thrown.
- `send` to an unknown or unconnected peer throws `MeshConnectionError`.

## Peer Lifecycle

Node `status` moves through `idle → pairing → connecting → connected`, then `disconnected`, `failed`, or `disposed`. Watch transitions — and everything else — through `tap`:

```ts
host.tap((event) => {
  if (event.type === 'status-change' && event.peerId === null) console.log('node:', event.status);
  if (event.type === 'peer-left') console.log('left:', event.peerId, event.reason);
});
```

The host gets structured peer events through `onPeer` and the live inventory through `peers`:

```ts
host.onPeer(({ type, peer }) => console.log(type, peer.id, peer.status));
host.kick(peerId, 'bye'); // guest observes 'disconnected'
```

`peerId` on a `status-change` event distinguishes node-level (`null`) from per-peer transitions. Per-peer events also flow through `tap` so a single subscription observes the whole session.

Dispose nodes deterministically — `dispose()` is idempotent, aborts `disposalSignal`, emits a final `'dispose'` event, and detaches all tappers. Passing an `AbortSignal` option disposes on abort; `using` works too.

## Timeouts and Limits

| Option | Default | Meaning |
| --- | --- | --- |
| `invitationTtlMs` | `300_000` | How long an unanswered invitation stays valid. |
| `iceGatheringTimeoutMs` | `5_000` | Caps ICE gathering — on timeout pairing proceeds with the candidates gathered so far. Also bounds the channel-open wait in `acceptAnswer` and the guest's never-opened-channel guard. |
| `maxMessageBytes` | `65_536` | Serialized message cap, enforced in both directions. |

`acceptAnswer` rejects with `MeshTimeoutError` when the channel never opens; the guest independently marks itself `'failed'` and taps an `'error'` event. Inject `clock` to drive TTLs deterministically in tests.

## Security Model

Mesh reduces the manual-pairing attack surface but does not remove it:

- Every invitation carries a random 256-bit **secret**; the answer must present a proof derived from it (HMAC-SHA-256 via `SubtleCrypto`, falling back to a non-cryptographic hash with a `'security-downgrade'` tap).
- Invitations are **single-use and time-boxed**, so a leaked invite is only useful briefly.
- `approvePeer` is the host's admission hook — use it for a name check, a shared passphrase confirmed out-of-band, or an allowlist.
- `maxMessageBytes` caps every inbound frame; malformed frames are dropped, never dispatched.
- **Roles are app-level.** A guest can send any declared `toHost` type with any payload — validate guest state on the host as if it came from a form. Never trust `peer.name` as an identity; it is self-declared.

## Testing

Every WebRTC object comes from the injectable `rtc` factory — tests pair nodes fully in memory, with no browser. Model a fake on the package's own `src/__tests__/_fixtures.ts`: two peer connections wired through token SDP, with knobs for latency, drops, ICE failure, and stalled open.

```ts
const host = createMeshHost<AppProtocol>({ rtc: fake.rtc, clock: () => now });
const guest = createMeshGuest<AppProtocol>({ rtc: fake.rtc });
```

The [REPL examples](/repl) include a runnable in-memory pairing you can copy as a starting point.

## Framework Integration

A node is a plain object — own it in a composable/store and dispose on teardown.

::: code-group

```ts [React]
import { useEffect, useRef } from 'react';
import { createMeshHost, type MeshProtocol } from '@vielzeug/mesh';

export function useMeshHost<P extends MeshProtocol>() {
  const ref = useRef<ReturnType<typeof createMeshHost<P>>>(null);
  if (!ref.current) ref.current = createMeshHost<P>();
  useEffect(() => () => ref.current?.dispose(), []);
  return ref.current;
}
```

```ts [Vue]
import { onUnmounted } from 'vue';
import { createMeshHost, type MeshProtocol } from '@vielzeug/mesh';

export function useMeshHost<P extends MeshProtocol>() {
  const host = createMeshHost<P>();
  onUnmounted(() => host.dispose());
  return host;
}
```

```ts [Svelte]
import { onDestroy } from 'svelte';
import { createMeshHost, type MeshProtocol } from '@vielzeug/mesh';

export function createHost<P extends MeshProtocol>() {
  const host = createMeshHost<P>();
  onDestroy(() => host.dispose());
  return host;
}
```

:::

## Working with Other Vielzeug Libraries

Mesh builds on `@vielzeug/arsenal` for random ids, secrets, and the fallback proof hash — no extra wiring needed. Pair it with `herald` when you want mesh messages to feed an in-process event bus:

```ts
import { createBus } from '@vielzeug/herald';

const bus = createBus<{ 'guest-note': string }>();
host.on('note', (m) => bus.emit('guest-note', m.payload));
```

## Best Practices

- Pair over `meshCodec` strings, never raw SDP — the transport restores the CRLF line endings that copy/paste mangles.
- Create **one invitation per guest**; never reuse or forward an invitation.
- Keep `invitationTtlMs` short for physical-proximity pairing and always gate unknown guests through `approvePeer`.
- Subscribe `on` handlers **before** `acceptAnswer` resolves so early messages are not tapped as `'unknown-type'`.
- Validate every guest payload on the host — treat `toHost` messages as untrusted input.
- `dispose()` both nodes on teardown; pass `signal` to bind disposal to a controller you already own.
- Inject `rtc` and `clock` in tests instead of mocking globals.
- Plan re-pairing, not reconnection: after a reload, create a fresh invitation and let the app re-associate the stable `peerId`.
