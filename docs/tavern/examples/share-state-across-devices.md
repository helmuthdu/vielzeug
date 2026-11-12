---
title: 'Tavern Examples: Share State Across Devices'
description: Mirror host-owned state on guest devices with commands sent back.
---

## Share State Across Devices

### Problem

You have a stateful app: a shared editor, a live dashboard, a record under review, and want several people to see the same state on their own devices: one device owns the state, the others mirror it and send commands back. You need the pairing, the protocol, and the replication without hand-rolling 300 lines of session plumbing over `@vielzeug/mesh`.

### Solution

Host the subject with `hostTavern`, wire the command table and snapshot access, and invite a guest with `joinTavern`: tavern owns the pairing, validation, and broadcasting.

```ts
import { hostTavern, joinTavern } from '@vielzeug/tavern';

// 1. Host: the command table is the same object the host's own UI calls.
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

// 2. Pair: deliver the invitation code out-of-band (QR, copy/paste, navigator.share).
const invitationCode = await host.createInvitationCode();

// 3. Guest: consume the invitation code, produce the answer code to show back.
const { answerCode, guest, ready } = await joinTavern({
  invitationCode,
  mount: (snapshot) => {
    const parsed = mySchema.parse(snapshot);
    return parsed ? mountMirror(parsed) : null; // null ignores the snapshot
  },
  name: 'Alex',
  onEnded: (subject) => unmountMirror(subject.id),
});
guest.tap((event) => {
  if (event.type === 'rejected') showToast(event.message);
});

// 4. The host accepts the answer code; the channel opens.
await host.acceptAnswerCode(answerCode);

// 5. `ready` settles once the first snapshot arrives and mounts: navigate then.
const mirror = await ready;
navigateTo(mirror.id);

// 6. The guest's commands run through the host's own table; the effect
//    comes back with the next snapshot, so no separate ack is needed.
guest.sendCommand('rename', ['Quarterly report']);

// 7. Cleanup: hosting ends for every guest; the guest fires onEnded once.
host.dispose();
guest.dispose();
```

### Pitfalls

- The snapshot arrives as parsed JSON: always validate in `mount` before trusting it; returning `null` safely ignores it.
- A command is fire-and-forget: success means "the host applied it and the next snapshot shows it". Watch for a `rejected` tap event to surface handler errors.
- A tab that both hosts and guests needs an echo guard in `serializeNotice` (one boolean set during `onNotice`), or wire notices will re-broadcast back to the guests.

### Related

- [Usage Guide](../usage.md): hosting, joining, notice relaying, and best practices.
- [API Reference](../api.md): full signatures for every option and return type.
- [Mesh](/mesh/): the P2P transport underneath.
