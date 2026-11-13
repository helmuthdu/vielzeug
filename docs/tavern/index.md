---
title: Tavern
description: 'Table sessions over mesh: host-owned state replication with guest command forwarding'
package: tavern
category: utilities
keywords: [session, host, guest, replication, mesh, commands, snapshots, collaboration, peer-to-peer]
exports:
  [
    hostTavern,
    joinTavern,
    TavernCommand,
    TavernCommands,
    TavernSubject,
    TavernHost,
    TavernHostOptions,
    TavernHostEvent,
    TavernGuest,
    TavernGuestOptions,
    TavernGuestEvent,
    TavernJoinResult,
    TavernError,
    TavernPairingError,
    TavernDisposedError,
  ]
related: [mesh, ledger, herald]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="tavern" />

## Why Tavern?

Peer-to-peer apps share one arrangement problem: the canonical state of something: a document, a dashboard, a record: lives on exactly one device, while every other participant should see it and be able to change it from their own. Tavern turns that arrangement into a session: **one host owns the canonical state, guests mirror it, and every guest command is forwarded through the host's own command table**, so remote actions follow exactly the same code path as local ones.

```ts
// Before: hand-rolled session orchestration: pairing, protocol validation,
// command routing, snapshot broadcasting, notice relaying, presence tracking.
const host = createMeshHost({
  /* ... */
});
host.on('command', ({ peerId, payload }) => {
  const command = mySchema.safeParse(payload);
  if (!command.success) {
    host.send(peerId, 'rejected', {
      /* ... */
    });
    return;
  }
  try {
    applySubjectCommand(command.data.name, subject, command.data.args);
  } catch (error) {
    host.send(peerId, 'rejected', {
      /* ... */
    });
  }
});
bus.on('subject:updated', () => {
  host.broadcast('snapshot', snapshotFor(subject));
});
// ... 40+ more lines of plumbing

// After: tavern owns the protocol, the validation, the broadcasting.
const host = hostTavern({
  commands: { rename: (args) => store.rename(docId, args[0] as string) },
  subject: {
    onChanged: (listener) => store.onUpdated(docId, listener),
    onRemoved: (listener) => store.onRemoved(docId, listener),
    snapshot: () => store.read(docId),
  },
});
```

| Feature                               | Tavern                                                                    | Raw mesh                                                                | Socket.io rooms                                                         |
| ------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Bundle size                           | <PackageInfo package="tavern" type="size" />                              | <PackageInfo package="mesh" type="size" />                              | N/A                                                                     |
| Zero dependencies                     | <ore-icon name="check" size="16"></ore-icon>                              | <ore-icon name="check" size="16"></ore-icon>                            | <ore-icon name="x" size="16"></ore-icon>                                |
| Host-authoritative commands           | <ore-icon name="check" size="16"></ore-icon>: same table as local UI      | <ore-icon name="triangle-alert" size="16"></ore-icon>: wire it yourself | <ore-icon name="triangle-alert" size="16"></ore-icon>: wire it yourself |
| Snapshot replication                  | <ore-icon name="check" size="16"></ore-icon>: microtask-coalesced         | <ore-icon name="x" size="16"></ore-icon>                                | <ore-icon name="x" size="16"></ore-icon>                                |
| Out-of-band pairing (QR / copy-paste) | <ore-icon name="check" size="16"></ore-icon>                              | <ore-icon name="check" size="16"></ore-icon>                            | <ore-icon name="x" size="16"></ore-icon>: needs a server                |
| Notice relaying                       | <ore-icon name="check" size="16"></ore-icon>: consumer-defined wire shape | <ore-icon name="x" size="16"></ore-icon>                                | <ore-icon name="triangle-alert" size="16"></ore-icon>: server-mediated  |

<div class="decision-callout">

**Use Tavern when** one device should own the canonical state of something: a shared document, a live dashboard, a record under review, and every other device should mirror it and send commands back through the host's own command table, which stays the single validation path.

**Consider raw `@vielzeug/mesh` when** you need P2P messaging without the host-authoritative replication model: chat, whiteboards, or custom topologies. Mesh carries bounded typed messages (capped by `maxMessageBytes`, 65 536 by default) with no chunking or acknowledgements: file transfer needs app-level chunking and acknowledgements built on top.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/tavern
```

```sh [npm]
npm install @vielzeug/tavern
```

```sh [yarn]
yarn add @vielzeug/tavern
```

:::

## Quick Start

```ts
import { hostTavern, joinTavern } from '@vielzeug/tavern';

// Host: wire the command table and snapshot access for the shared subject.
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

// Produce a single-use invitation code; deliver it out-of-band (QR, copy/paste).
const invitationCode = await host.createInvitationCode();

// Guest: consume the invitation code, produce an answer code for the host.
const { answerCode, guest, ready } = await joinTavern({
  invitationCode,
  mount: (snapshot) => parseAndMount(snapshot),
  name: 'Alex',
});
await host.acceptAnswerCode(answerCode);

// `ready` settles once the first snapshot arrives and mounts: the mirror is live.
await ready;

// The guest's commands run through the host's own table; their effect
// arrives with the next snapshot, so a successful command needs no ack.
guest.sendCommand('rename', ['Quarterly report']);

// Cleanup: hosting ends for every guest; onEnded fires exactly once on both sides.
host.dispose();
guest.dispose();
```

## Features

<div class="features-grid">

- **`hostTavern`**: host one subject: pairing, protocol validation, command application, coalesced snapshot broadcasts
- **`joinTavern`**: join as a guest: consume the invitation code, produce the answer code, mirror the host's snapshots
- **`TavernCommands`**: the host's command table as a plain record of handlers: the same functions the host's own UI calls, so remote actions cannot bypass validation
- **`ready` promise**: the join lifecycle is awaitable: `ready` resolves with the mounted mirror or rejects with why the session never came up
- **Coalesced snapshots**: bursts of local changes ship one snapshot per microtask, not one per change
- **`onEnded` fires exactly once**: on both handles: channel drops, subject removal, and explicit disposal share a single idempotent cleanup path
- **Typed errors**: `TavernPairingError` covers every unusable pasted code with the mesh failure chained as `cause`

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Mesh](/mesh/): the P2P transport underneath: WebRTC pairing, data channels, QR-optimized codecs.
- [Ledger](/ledger/): undo/redo history for the commands the host applies.
- [Herald](/herald/): typed event bus for the local notice stream tavern relays.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
