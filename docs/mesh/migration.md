---
title: Mesh Migration
---

# Mesh Migration

## Message envelope v2: dedupe, per-message ids, and `MeshInbound.messageId` removed

Delivery is best-effort over the reliable, ordered data channel: the API never exposed a way to resend a message with the same id or to acknowledge one, so the per-message id and the per-peer duplicate guard could never fire in normal use. The wire envelope moved from `v: 1` to `v: 2` (no `id` field), `v: 1` frames are now rejected as `malformed`, and the `'duplicate'` rejection reason is gone:

```ts
// Before: v1 envelope, deduped, message metadata carried a transport id
interface MeshInbound<T> {
  readonly peerId: string;
  readonly messageId: string;
  readonly sentAt: number;
  readonly payload: T;
}
// message-rejected reason: 'too-large' | 'duplicate' | 'malformed' | 'unknown-type'

// After: v2 envelope, no dedupe, no transport id
interface MeshInbound<T> {
  readonly peerId: string;
  readonly sentAt: number; // informational: the sender's clock is untrusted
  readonly payload: T;
}
// message-rejected reason: 'too-large' | 'malformed' | 'unknown-type'
```

Both ends of a session must run the same Mesh version (already true for QR pairing, where a train ships one version to both devices). If your app correlated messages by `messageId`, carry your own correlation id inside the payload:

```ts
host.send(peerId, 'note', { body: text, ref: myMessageId });
```

`send`/`broadcast`/`on` signatures are unchanged.

No other breaking migrations yet. When a train breaks this package's API, document the move here: one section per break, with the old call and its replacement.
