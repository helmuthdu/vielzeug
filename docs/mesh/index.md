---
title: Mesh — Backendless peer-to-peer sessions
description: "Backendless peer-to-peer session transport over WebRTC data channels with manual pairing and host-authoritative star topology"
package: mesh
category: webrtc
keywords: [webrtc, p2p, peer-to-peer, datachannel, lan, pairing, backendless, signaling-free]
exports: [createMeshHost, createMeshGuest, meshCodec, MeshProtocol]
related: [pulse, arsenal, herald]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="mesh" />

## Why Mesh?

Browsers cannot discover peers on a LAN, so sharing live state between nearby devices has always meant running a server. Mesh pairs devices out-of-band — copy/paste, `navigator.share`, or QR via `meshQrCodec` — and then moves typed messages directly over a WebRTC data channel with no backend involved.

```ts
// Before
const pc = new RTCPeerConnection();
const dc = pc.createDataChannel('sync');
await pc.setLocalDescription(await pc.createOffer());
// …wait for ICE, hand the SDP to the other device, wire expiry, timeouts,
// message framing, and dedupe yourself — per guest

// After
const host = createMeshHost<AppProtocol>();
const invitation = await host.createInvitation();
shareText(meshCodec.encode(invitation)); // copy/paste or navigator.share
const peer = await host.acceptAnswer(meshCodec.decode(answerText));
host.send(peer.id, 'snapshot', { rev: 1 });
```

| Feature | Mesh | `pulse` (WebSocket) | Raw `RTCPeerConnection` |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="mesh" type="size" /> | <PackageInfo package="pulse" type="size" /> | 0 B |
| Runtime dependencies | `@vielzeug/arsenal` | <ore-icon name="check" size="16"></ore-icon> none | <ore-icon name="check" size="16"></ore-icon> none |
| Works without a server | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Typed message protocol | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Multi-peer sessions | Star, host-authoritative | Server rooms | Manual per-peer wiring |
| Pairing safety | Proof + TTL + approval hook | Server auth | <ore-icon name="x" size="16"></ore-icon> |

<div class="decision-callout">

**Use Mesh when** a small group of devices on one network must exchange live state and you cannot — or do not want to — run a server.

**Consider `pulse` when** you have a backend anyway, need internet-wide reach, or want server-managed rooms and presence.

</div>

## Limitations

Mesh is deliberately small. It does **not** provide:

- Automatic LAN discovery — every pairing is an explicit out-of-band exchange.
- Guest-to-guest relay — guests only ever talk to the host.
- Reconnection across page reloads — a reload destroys the `RTCPeerConnection`; the consumer re-pairs and re-associates the stable `peerId`.
- CRDTs or conflict resolution — payload semantics are yours.
- TURN — there is no guarantee peers connect off-LAN.
- Persistence, or any UI.

Two operational caveats matter in practice: the host page must stay open for the session to live, and client-isolated Wi-Fi, VPNs, or strict firewalls can block even same-LAN pairing.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/mesh
```

```sh [npm]
npm install @vielzeug/mesh
```

```sh [yarn]
yarn add @vielzeug/mesh
```

:::

## Quick Start

Pair one host and one guest, then exchange typed messages. Pairing requires a secure context (`https:` or `localhost`) for `RTCPeerConnection`.

```ts
import { createMeshGuest, createMeshHost, meshCodec, type MeshProtocol } from '@vielzeug/mesh';

// The consumer declares both directions of the conversation.
interface AppProtocol extends MeshProtocol {
  toHost: { note: string };
  toGuest: { ack: { ok: boolean } };
}

// Host side
const host = createMeshHost<AppProtocol>();
host.on('note', (message) => host.send(message.peerId, 'ack', { ok: true }));

const invitation = await host.createInvitation();
const invitationText = meshCodec.encode(invitation); // hand to the guest

// Guest side (other device)
const guest = createMeshGuest<AppProtocol>();
const answer = await guest.acceptInvitation(meshCodec.decode(invitationText));
const answerText = meshCodec.encode(answer); // hand back to the host

// Host accepts the answer; resolves once the channel is open
try {
  await host.acceptAnswer(meshCodec.decode(answerText));
  guest.send('note', 'hello over WebRTC');
} finally {
  host.dispose();
  guest.dispose();
}
```

## Features

<div class="features-grid">

- **`createMeshHost`** — host-authoritative star sessions; one `RTCPeerConnection` per guest.
- **`createMeshGuest`** — single-host guest node with its own lifecycle.
- **`meshCodec`** — compact base64url encoding for pairing payloads; pure and replaceable.
- **Typed protocol** — declare `toHost`/`toGuest` maps once; `send`, `on`, and `broadcast` stay type-checked.
- **Manual pairing** — invitation/answer exchange over copy/paste or `navigator.share`; proof of possession, TTL, and an `approvePeer` hook.
- **`tap` observability** — status transitions, ICE state, byte counts, and rejections without affecting behavior.
- **`peers`, `onPeer`, `kick`** — host-side peer inventory and lifecycle.
- **Injectable `rtc`** — every WebRTC object comes from a factory, so tests run fully in memory.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Pulse](/pulse/) — typed WebSocket sessions when a server is available.
- [Arsenal](/arsenal/) — the utilities Mesh builds on for ids, randomness, and hashing.
- [Herald](/herald/) — in-process event bus for wiring mesh messages into your app.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
