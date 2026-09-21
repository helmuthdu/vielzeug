---
title: 'Sigil Examples — Pair Two Devices with QR'
description: Exchange WebRTC pairing payloads between a desktop host and a phone guest via QR codes using meshQrCodec and sigil.
---

## Pair Two Devices with QR

### Problem

A desktop app (host) and a phone (guest) need to establish a Mesh P2P session with no backend and no typing: the host displays its invitation as a QR code, the phone scans it, and the phone shows its answer as a QR code the host's webcam scans back.

### Solution

`meshQrCodec` (async) compresses pairing JSON with deflate-raw + base64url and prefixes it `mq1.` — comfortably inside QR byte capacity. Sigil renders the code on each side; `ore-qr-scanner` (or `createQrScanner`) reads the counterparty's screen.

```ts
import { createMeshGuest, createMeshHost, meshQrCodec } from '@vielzeug/mesh';
import { createQrScanner, encodeQr, toSvg } from '@vielzeug/sigil';

// ── Host (desktop): show the invitation, scan the answer ──────────────
const host = createMeshHost();
const invitation = await host.createInvitation();

// meshQrCodec.encode is async — await before rendering.
const invitationText = await meshQrCodec.encode(invitation); // "mq1.eNpN…"
document.querySelector('#qr-out')!.innerHTML = toSvg(encodeQr(invitationText), {
  label: 'Pairing invitation',
});

const webcam = document.querySelector('video')!;
const scanner = createQrScanner({ video: webcam });
scanner.onResult(async ({ value }) => {
  // decode accepts mq1.* and plain meshCodec text — paste works too.
  const answer = await meshQrCodec.decode(value);
  const peer = await host.acceptAnswer(answer);
  console.log('paired with', peer.id);
});
await scanner.start();

// ── Guest (phone): scan the invitation, show the answer ───────────────
const guest = createMeshGuest();
const phoneCam = document.querySelector('video')!;
const guestScanner = createQrScanner({ video: phoneCam });
guestScanner.onResult(async ({ value }) => {
  // value is the host's "mq1.*" invitation text
  const answer = await guest.acceptInvitation(await meshQrCodec.decode(value));
  const answerText = await meshQrCodec.encode(answer);
  document.querySelector('#qr-answer')!.innerHTML = toSvg(encodeQr(answerText), {
    label: 'Pairing answer',
  });
});
await guestScanner.start();
```

#### With the Refine components

```html
<!-- host page -->
<ore-qr-code id="invite" variant="card"></ore-qr-code>
<ore-qr-scanner id="cam"></ore-qr-scanner>

<script type="module">
  const invite = document.getElementById('invite');
  const cam = document.getElementById('cam');
  invite.setAttribute('value', await meshQrCodec.encode(await host.createInvitation()));
  cam.addEventListener('scan', async (e) => {
    const answer = await meshQrCodec.decode(e.detail.value); // scan event carries the raw string
    await host.acceptAnswer(answer);
  });
  cam.setAttribute('active', '');
</script>
```

### Pitfalls

- `meshQrCodec.encode`/`decode` are **async** (streams-based compression) — awaiting them inside render code is a common source of `[object Promise]` payloads.
- `CompressionStream`/`DecompressionStream` exist in modern browsers and Node 18+, but not everywhere — `encode` throws `MeshUnsupportedError` where they are missing. Keep the plain `meshCodec` paste flow as fallback; `decode` already accepts both formats.
- Camera scanning requires a secure context (`https` or `localhost`) and permission — always wire the `error` event so a denial surfaces instead of a dead UI.
- The answer QR changes per attempt (fresh session id) — re-render on every new `createInvitation`/`acceptInvitation` call, don't cache the image.
- Scanned strings are untrusted: `meshQrCodec.decode` validates shape and throws `MeshPairingError` on corrupt input — catch it before calling `acceptAnswer`.

### Related

- [Mesh pairing flow](../../mesh/usage.md#pairing-flow)
- [ore-qr-code](../../refine/components/qr-code.md) and [ore-qr-scanner](../../refine/components/qr-scanner.md)
- [Usage Guide](../usage.md)
