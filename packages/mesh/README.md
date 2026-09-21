# @vielzeug/mesh

> Backendless peer-to-peer session transport over WebRTC data channels with manual pairing and host-authoritative star topology

## Installation

```sh
pnpm add @vielzeug/mesh
npm install @vielzeug/mesh
yarn add @vielzeug/mesh
```

## Quick Start

```ts
import { createMeshGuest, createMeshHost, meshCodec, type MeshProtocol } from '@vielzeug/mesh';

interface AppProtocol extends MeshProtocol {
  toHost: { note: string };
  toGuest: { ack: { ok: boolean } };
}

const host = createMeshHost<AppProtocol>();
const guest = createMeshGuest<AppProtocol>();

host.on('note', (m) => host.send(m.peerId, 'ack', { ok: true }));

// Two-leg manual pairing: invitation to the guest, answer back to the host.
const invitationText = meshCodec.encode(await host.createInvitation());
const answerText = meshCodec.encode(await guest.acceptInvitation(meshCodec.decode(invitationText)));

await host.acceptAnswer(meshCodec.decode(answerText)); // resolves when the channel opens
guest.send('note', 'hello over WebRTC');

host.dispose();
guest.dispose();
```

Pairing payloads travel out-of-band — copy/paste, `navigator.share`, or any channel you control. `RTCPeerConnection` requires a secure context (`https:` or `localhost`).

## Documentation

- [Overview](https://vielzeug.dev/mesh/)
- [Usage Guide](https://vielzeug.dev/mesh/usage)
- [API Reference](https://vielzeug.dev/mesh/api)
- [Examples](https://vielzeug.dev/mesh/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
