# @vielzeug/sigil

> QR code generation and scanning — pure matrix encoder, SVG and canvas renderers, native BarcodeDetector scanning

## Installation

```sh
pnpm add @vielzeug/sigil
npm install @vielzeug/sigil
yarn add @vielzeug/sigil
```

## Quick Start

```ts
import { createQrScanner, encodeQr, toSvg } from '@vielzeug/sigil';

// Encode to an inline SVG string — works in Node and the browser.
const matrix = encodeQr('https://vielzeug.dev');
document.querySelector('#qr').innerHTML = toSvg(matrix, { label: 'Vielzeug link' });

// Scan with the camera (browser only — feature-detect first).
const scanner = createQrScanner({ video: document.querySelector('video') });
scanner.onResult(({ value }) => console.log('scanned:', value));
await scanner.start();
scanner.dispose();
```

`toSvg` output uses `currentColor` modules by default — the code themes with ordinary CSS. Scanning requires `BarcodeDetector` and a secure context; call `qrScanSupport()` before showing a scan affordance.

## Documentation

- [Overview](https://vielzeug.dev/sigil/)
- [Usage Guide](https://vielzeug.dev/sigil/usage)
- [API Reference](https://vielzeug.dev/sigil/api)
- [Examples](https://vielzeug.dev/sigil/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
