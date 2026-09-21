---
title: Sigil — QR code generation and scanning
description: "QR code generation and scanning — pure matrix encoder, SVG and canvas renderers, native BarcodeDetector scanning"
package: sigil
category: utilities
keywords: [qr, qrcode, barcode, encoder, scanner, svg, canvas, barcodedetector, pairing]
exports: [encodeQr, toSvg, createQrScanner, qrCapacity, detectQr]
related: [mesh, refine]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="sigil" />

## Why Sigil?

QR workflows usually pull in a general-purpose barcode library that renders to canvas and guesses at colors, or a from-scratch decoder you do not need. Sigil is a pure, zero-dependency encoder (numeric, alphanumeric, and byte modes; versions 1–40; all four error-correction levels; automatic mask selection) with renderers that stay out of the way — an SVG string that themes with CSS, and a canvas painter for print/bitmap flows. Scanning is a thin lifecycle wrapper over the platform's native `BarcodeDetector`, so there is no decoder weight and no polyfill to ship.

```ts
// Before — a QR library per concern, canvas-only output, hardcoded colors
import QRCode from 'qrcode';
const dataUrl = await QRCode.toDataURL(text, { width: 256, color: { dark: '#000' } });
img.src = dataUrl; // raster, fixed colors, no theme support

// After — encode once, render anywhere
import { encodeQr, toSvg } from '@vielzeug/sigil';
const matrix = encodeQr(text); // smallest version that fits, auto mask
element.innerHTML = toSvg(matrix); // currentColor modules — themes with CSS
```

| Feature | Sigil | `qrcode` (node-style) | `jsqr` |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="sigil" type="size" /> | ~100 kB+ | decoder only |
| Runtime dependencies | <ore-icon name="check" size="16"></ore-icon> none | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> none |
| Output | Matrix, SVG string, canvas | Canvas/DataURL/UTF-8 | — |
| Themeable output | `currentColor` by default | Hardcoded color strings | — |
| Scanning | Native `BarcodeDetector` wrapper | <ore-icon name="x" size="16"></ore-icon> | Pure-JS decoder |
| SSR-safe import | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

<div class="decision-callout">

**Use Sigil when** you need QR output that themes with your UI (SVG/`currentColor`), a minimal encoder with no runtime dependencies, or a scanner that uses the platform decoder instead of shipping one.

**Consider `jsqr`-style decoding when** you must scan in browsers without `BarcodeDetector` — sigil reports `SigilUnsupportedError` rather than bundling a fallback decoder.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/sigil
```

```sh [npm]
npm install @vielzeug/sigil
```

```sh [yarn]
yarn add @vielzeug/sigil
```

:::

## Quick Start

Encode to an SVG string — works in Node and the browser:

```ts
import { encodeQr, qrCapacity, toSvg } from '@vielzeug/sigil';

const payload = 'https://vielzeug.dev';
const matrix = encodeQr(payload, { errorCorrection: 'M' });
document.querySelector('#qr').innerHTML = toSvg(matrix, { label: 'Vielzeug link' });
```

Scan with the camera (browser only — see support notes in the usage guide):

```ts
import { createQrScanner } from '@vielzeug/sigil';

const video = document.querySelector('video');
const scanner = createQrScanner({ video });
scanner.onResult((result) => {
  console.log('scanned:', result.value); // once: true stops after first decode
});
await scanner.start(); // throws SigilUnsupportedError / SigilPermissionError
```

## Features

<div class="features-grid">

- `encodeQr` — pure matrix encoder: numeric/alphanumeric/byte modes, versions 1–40, EC levels L/M/Q/H, automatic or forced mask
- `qrCapacity` — byte capacity per version/mode/level, for pre-flight validation
- `toSvg` — compact path-merged SVG string; `currentColor` modules, `<title>` + `role="img"` built in
- `drawToCanvas` — bitmap rendering with DPR-aware scaling for print and download flows
- `detectQr` — one-shot detection on any `ImageBitmapSource`
- `createQrScanner` — camera scan loop with `once` mode, status events, `tap()` observability, and strict disposal
- `isQrScanSupported`/`qrScanSupport` — sync and async feature detection that never assumes

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md) — encoding modes, capacity, rendering, scanning, and testing
- [API Reference](./api.md) — every export, option, type, and error
- [Examples](./examples.md) — copy-paste recipes, including pairing two devices with `meshQrCodec`

</div>

## See Also

<div class="see-also">

- [Mesh](../mesh/) — backendless P2P sessions; `meshQrCodec` produces compact QR-friendly pairing payloads
- [Refine](../refine/) — `ore-qr-code` and `ore-qr-scanner` wrap sigil in ready-made, themeable components

</div>

<!-- markdownlint-enable -->
