# Change Log - @vielzeug/mesh

This log was last generated on Wed, 07 Oct 2026 07:25:55 GMT and should not be manually modified.

## 26.10.1
Wed, 07 Oct 2026 07:25:55 GMT

### Patches

- Standardize package text punctuation
## 26.10.0
Fri, 02 Oct 2026 18:01:51 GMT

### Minor changes

- feat: remove custom serialize/deserialize options; JSON wire format only
- Drop legacy mq1 QR pairing decode; mq2 and plain meshCodec payloads remain
- Greenfield hardening: WebCrypto required for pairing proofs (no forgeable fallback), invitation hostName reaches the guest, duplicate peer ids rejected, guest re-pairs on the same node, onPeer folded into tap with live MeshPeer payloads, codec interfaces and dead messenger surface removed
- split node 'status-change' from per-peer 'peer-status-change' events with a dedicated MeshPeerStatus union, removed the unused MeshNode.id, meshQrCodec.encode now falls back to plain codec output instead of throwing MeshUnsupportedError, host no longer emits misattributed ice-state events for pending invitations, empty answer peer ids rejected, concurrent same-peer-id answers race-guarded, and the in-memory WebRTC fake is now published as the @vielzeug/mesh/testing subpath

### Patches

- Consume base64url codecs from @vielzeug/arsenal instead of a private copy
- Remove peerIdOf indirection from MessengerOptions, consolidate isRecord guard, fix meshCodec JSDoc placement
## 3.1.0
Mon, 21 Sep 2026 15:19:01 GMT

### Minor changes

- Add @vielzeug/mesh: backendless WebRTC peer-to-peer session transport

