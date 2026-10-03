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

// 2. Pair: deliver the invitation out-of-band (QR, copy/paste, navigator.share).
const invitation = await host.createInvitationText();

// 3. Guest: consume the invitation, produce the answer code to show back.
const { answerText, guest } = await joinTavern({
  invitationText: invitation,
  mount: (snapshot) => {
    const parsed = mySchema.parse(snapshot);
    return parsed ? mountMirror(parsed) : null; // null ignores the snapshot
  },
  name: 'Alex',
  onEnded: (subject) => unmountMirror(subject.id),
  onJoined: (subject) => navigateTo(subject.id),
  onRejected: (message) => showToast(message),
});

// 4. The host accepts the answer; the channel opens.
await host.acceptAnswerText(answerText);

// 5. The guest's commands run through the host's own table.
guest.sendCommand('doc-1', 'rename', ['Quarterly report']);

// 6. Cleanup: hosting ends for every guest; the guest fires onEnded once.
host.dispose();
guest.dispose();
```

### Pitfalls

- The snapshot arrives as parsed JSON: always validate in `mount` before trusting it; returning `null` safely ignores it.
- The subject id in `sendCommand` must match the hosted subject: the host rejects commands targeting anything else with a rejection message.
- A tab that both hosts and guests needs an echo guard in `notices.toWire` (one boolean set during `fromWire`), or wire notices will re-broadcast back to the guests.

### Related

- [Usage Guide](../usage.md): hosting, joining, notice relaying, and best practices.
- [API Reference](../api.md): full signatures for every option and return type.
- [Mesh](/mesh/): the P2P transport underneath.
