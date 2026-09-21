---
title: 'Mesh Examples — Getting Started'
description: Pair a host and a guest over manual signaling and exchange typed messages.
---

## Getting Started

### Problem

Two devices on the same network must exchange typed messages with no server. You need the smallest possible pairing loop: invitation out, answer back, channel open — using `createMeshHost`, `createMeshGuest`, and `meshCodec`.

### Solution

```ts
import { createMeshGuest, createMeshHost, meshCodec, type MeshProtocol } from '@vielzeug/mesh';

// One declaration drives every send/on signature on both sides.
interface AppProtocol extends MeshProtocol {
  toHost: { note: string };
  toGuest: { ack: { ok: boolean } };
}

const host = createMeshHost<AppProtocol>();
const guest = createMeshGuest<AppProtocol>();

// Subscribe before accepting so early messages are not 'unknown-type'.
host.on('note', (m) => host.send(m.peerId, 'ack', { ok: true }));
guest.on('ack', (m) => console.log('ack:', m.payload.ok));

// Leg 1 — host → guest, out-of-band (copy/paste or navigator.share)
const invitationText = meshCodec.encode(await host.createInvitation());

// Leg 2 — guest → host, out-of-band
const answerText = meshCodec.encode(await guest.acceptInvitation(meshCodec.decode(invitationText)));

// Resolves once the data channel is open.
try {
  await host.acceptAnswer(meshCodec.decode(answerText));
  guest.send('note', 'hello');
} finally {
  host.dispose();
  guest.dispose();
}
```

### Pitfalls

- `RTCPeerConnection` needs a secure context — serve over `https:` or `localhost`, or `createInvitation` fails at the native layer.
- An invitation is single-use and expires (`invitationTtlMs`, default 5 minutes); `acceptAnswer` then throws `MeshPairingError`.
- `acceptAnswer` waits for the channel to open — deliver the answer promptly or the guest's open guard marks it `'failed'`.
- On the guest, inbound `peerId` is the invitation's `sessionId`; it is not the host node's `id`.

### Related

- [Usage Guide — Pairing Flow](../usage.md#pairing-flow)
- [Host-Authoritative Command Loop](./host-authoritative-command-loop.md)
