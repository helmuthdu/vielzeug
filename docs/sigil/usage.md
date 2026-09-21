---
title: Sigil — Usage Guide
description: Encoding modes, capacity checks, SVG/canvas rendering, camera scanning, and testing for @vielzeug/sigil.
---

[[toc]]

## Basic Usage

`encodeQr` produces a `QrMatrix` — a frozen square of dark/light modules. Render it with `toSvg` (string, works anywhere) or `drawToCanvas` (browser).

```ts
import { encodeQr, qrCapacity, toSvg } from '@vielzeug/sigil';

const matrix = encodeQr('https://vielzeug.dev');
// Pick the smallest version automatically, or pin one:
const pinned = encodeQr('https://vielzeug.dev', { version: 5, errorCorrection: 'Q' });

const svg = toSvg(matrix); // inline <svg> string — inject or serialize
```

The encoder chooses the most compact mode for the whole input and the smallest version that fits. `mask` is chosen by the lowest ISO penalty score — override it only for test vectors.

## Encoding Modes and Capacity

Three segment modes cover every payload:

| Mode | Alphabet | Max payload (v40-L) |
| --- | --- | --- |
| `numeric` | `0–9` | 7,089 digits |
| `alphanumeric` | `0–9 A-Z space $%*+-./:` | 4,296 chars |
| `byte` | UTF-8 (no ECI header) | 2,953 bytes |

Mode selection is automatic — `encodeQr('01234567')` uses `numeric`, `'HELLO WORLD'` uses `alphanumeric`, anything else uses `byte`. Force a mode with `mode`, but a forced mode that cannot represent the input throws `SigilOptionError`.

Check capacity before encoding with `qrCapacity(version, errorCorrection, mode)` — it returns the maximum *bytes* (for `byte` mode) or *characters* the symbol holds:

```ts
import { qrCapacity, SigilCapacityError } from '@vielzeug/sigil';

qrCapacity(10, 'M', 'byte'); // → 213 (data codewords available at v10-M)

try {
  encodeQr(hugePayload, { version: 1 });
} catch (error) {
  if (error instanceof SigilCapacityError) {
    console.log(`${error.bytes} > ${error.maxBytes} at v${error.version}`);
  }
}
```

Use `minVersion` to keep a stable symbol size while a payload changes — useful when a layout must not reflow between renders.

## Error Correction

| Level | Recovery | Trade-off |
| --- | --- | --- |
| `L` | ~7% | Smallest matrix |
| `M` | ~15% | Default — good balance |
| `Q` | ~25% | Print, wear |
| `H` | ~30% | Logos/overlays, dense codes |

Higher levels shrink capacity at the same version. For an overlaid logo, prefer `H` *and* keep the logo inside the quiet zone's margin of safety.

## Rendering

### SVG — `toSvg`

```ts
const svg = toSvg(matrix, {
  dark: 'currentColor',   // default — inherits text color
  light: 'transparent',   // default
  margin: 4,              // quiet zone in modules (spec minimum is 4)
  scale: 1,               // user units per module — prefer scaling via CSS
  optimizePath: true,     // merge adjacent modules into one path (default)
  label: 'Pairing code',  // <title> + role="img"
});
```

`optimizePath` merges each row's dark runs into a single `<path>` — orders of magnitude smaller markup. Set `dark`/`light` to CSS variables to theme the code (`dark: 'var(--qr-dark)'`).

### Canvas — `drawToCanvas` (browser only)

```ts
const sizePx = drawToCanvas(matrix, canvas, { scale: 8, margin: 4 });
// canvas is resized for devicePixelRatio; returns the CSS-pixel edge length
```

Use canvas for print, download (`canvas.toBlob`), or compositing. SVG is the better default for display.

## Scanning (browser only)

Scanning wraps the native `BarcodeDetector`. It is **not** universally available — feature-detect, never assume:

| Engine | `BarcodeDetector` | Notes |
| --- | --- | --- |
| Chrome / Edge / Android WebView | Yes | `qr_code` format supported |
| Firefox | No (behind flag in some builds) | `isQrScanSupported()` → `false` |
| Safari | Varies by version | Check at runtime; do not rely on version sniffing |

```ts
import { createQrScanner, isQrScanSupported, qrScanSupport } from '@vielzeug/sigil';

isQrScanSupported();   // sync — BarcodeDetector constructor exists
await qrScanSupport(); // async — also verifies 'qr_code' is a supported format

const scanner = createQrScanner({
  video,                                   // <video autoplay playsinline muted>
  constraints: { facingMode: 'environment' },
  intervalMs: 200,                         // min ms between detect passes
  once: true,                              // stop after first result
});

scanner.onResult((result) => showPairing(result.value));
scanner.tap((event) => console.debug(event.type)); // status-change, detect, frame-skipped…

await scanner.start(); // requests camera, attaches stream, starts the loop
scanner.stop();        // pauses; start() resumes
scanner.dispose();     // terminal — releases everything
```

`start()` rejects with `SigilUnsupportedError` (no detector/getUserMedia) or `SigilPermissionError` (`NotAllowedError`). Detection failures mid-scan surface through `tap` `error` events and stop the scanner.

### One-shot detection

`detectQr(source)` runs a single pass over any `ImageBitmapSource` — `ImageData`, `Blob`, `VideoFrame`, an `<img>`, or a `<canvas>`:

```ts
import { detectQr } from '@vielzeug/sigil';

const result = await detectQr(imageBitmap); // → { value, cornerPoints } | null
```

## Testing

Both seams are injectable — never touch globals in tests:

```ts
import { createQrScanner } from '@vielzeug/sigil';

const fakeScanner = createQrScanner({
  video: document.createElement('video'),
  detector: { detect: async () => [{ rawValue: 'payload' }] },   // fake BarcodeDetector
  mediaDevices: { getUserMedia: async () => fakeStream },        // fake camera
});
```

For the web components, `ore-qr-scanner` exposes a `scannerFactory` JS property so tests inject a fake `QrScanner` without stubbing `BarcodeDetector` or `getUserMedia`.

## Framework Integration

Encoding is synchronous and SSR-safe — render `toSvg` output as part of server markup:

::: code-group

```tsx [React]
function Qr({ value }: { value: string }) {
  const svg = useMemo(() => toSvg(encodeQr(value)), [value]);
  return <span dangerouslySetInnerHTML={{ __html: svg }} />;
}
```

```vue [Vue]
<script setup>
import { computed } from 'vue';
import { encodeQr, toSvg } from '@vielzeug/sigil';
const props = defineProps({ value: String });
const svg = computed(() => toSvg(encodeQr(props.value ?? '')));
</script>
<template><span v-html="svg" /></template>
```

```html [Svelte]
<script>
  import { encodeQr, toSvg } from '@vielzeug/sigil';
  export let value;
  $: svg = toSvg(encodeQr(value));
</script>
<span>{@html svg}</span>
```

:::

Scanning needs lifecycle — start in `onMounted`/`onMount`, always `dispose()` in cleanup.

## Working with Other Vielzeug Libraries

- **Mesh** — `meshQrCodec` compresses WebRTC pairing payloads (offer/answer JSON) to QR-friendly strings. The [Pair Two Devices with QR](./examples/pair-two-devices.md) recipe shows the full flow.
- **Refine** — prefer `ore-qr-code` / `ore-qr-scanner` over hand-rolled wrappers: they compose sigil with themeable markup, a11y labels, and state handling.

## Best Practices

- Pre-validate payloads with `qrCapacity` before surfacing an encode control.
- Keep the quiet zone — `margin` below 4 risks unreadable codes; never overlay content on it.
- Prefer `toSvg` + `currentColor` for display; reserve `drawToCanvas` for print/download.
- Feature-detect scanning with `qrScanSupport()` before showing a scan affordance.
- Always `dispose()` scanners — camera tracks outlive route changes otherwise.
- Use `once: false` only when the UX genuinely expects repeated decodes.
- Treat scanned strings as untrusted input — validate before navigation or pairing.
- Pin `minVersion` in animated/live payloads so the symbol doesn't resize mid-flow.
