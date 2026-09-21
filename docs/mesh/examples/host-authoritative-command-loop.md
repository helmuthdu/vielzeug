---
title: 'Mesh Examples — Host-Authoritative Command Loop'
description: Guests send commands; the host owns the state and broadcasts numbered snapshots.
---

## Host-Authoritative Command Loop

### Problem

Guests propose changes; the host is the single authority that validates each command and broadcasts the resulting state. You need a `toHost` command channel, a `toGuest` snapshot channel with revision numbers, and a rejection path — using `createMeshHost`, `createMeshGuest`, and typed `send`/`on`/`broadcast`.

### Solution

```ts
import { createMeshGuest, createMeshHost, meshCodec, type MeshProtocol } from '@vielzeug/mesh';

// State shape stays `unknown` to the transport — semantics live in the app.
interface Command {
  readonly op: 'set' | 'delete';
  readonly key: string;
  readonly value?: unknown;
}

interface LoopProtocol extends MeshProtocol {
  toHost: { command: Command };
  toGuest: {
    snapshot: { readonly rev: number; readonly state: Record<string, unknown> };
    rejected: { readonly rev: number; readonly reason: string };
  };
}

// ── Host: owns the state and the revision counter ────────────────────────────
const host = createMeshHost<LoopProtocol>();
const state: Record<string, unknown> = {};
let rev = 0;

const apply = (command: Command): string | null => {
  if (command.op === 'delete' && !(command.key in state)) return `unknown key "${command.key}"`;
  if (command.op === 'set') state[command.key] = command.value;
  else delete state[command.key];
  return null;
};

host.on('command', (message) => {
  const reason = apply(message.payload);
  if (reason) {
    host.send(message.peerId, 'rejected', { reason, rev });
    return;
  }
  rev += 1;
  host.broadcast('snapshot', { rev, state });
});

// ── Guest: sends commands, tracks the latest revision ────────────────────────
const guest = createMeshGuest<LoopProtocol>();
let latest = -1;

guest.on('snapshot', (m) => {
  if (m.payload.rev > latest) latest = m.payload.rev;
});
guest.on('rejected', (m) => console.warn(`rev ${m.payload.rev} rejected: ${m.payload.reason}`));

// ── Pairing ──────────────────────────────────────────────────────────────────
const invitationText = meshCodec.encode(await host.createInvitation());
const answerText = meshCodec.encode(await guest.acceptInvitation(meshCodec.decode(invitationText)));
await host.acceptAnswer(meshCodec.decode(answerText));

guest.send('command', { key: 'volume', op: 'set', value: 8 });
```

#### With multiple guests

`broadcast` reaches every connected guest, so one accepted command synchronizes the whole room. Late joiners need a catch-up path — add a `toHost: { hello: {} }` type and answer it with a unicast `snapshot` instead of a broadcast.

### Pitfalls

- `broadcast` skips peers whose channel is not yet `'connected'` — a guest that joined mid-command misses that revision; send a unicast catch-up on `'peer-joined'`.
- Revisions are host-local numbers — after a host reload they restart; re-pair and resync rather than assuming continuity.
- The host must validate every `command` — the payload type is declared, not enforced; a guest can send anything.
- `state` is shared by reference in `snapshot` payloads — spread it (`{ ...state }`) if guests could mutate what they receive.

### Related

- [Getting Started](./getting-started.md)
- [Usage Guide — Sending and Receiving](../usage.md#sending-and-receiving)
- [Pulse](/pulse/) — rooms and presence when a server is available
