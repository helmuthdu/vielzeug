---
title: 'Sigil Examples — Getting Started'
description: Encode a payload to a themed SVG QR code with @vielzeug/sigil.
---

## Getting Started

### Problem

You need a QR code in the page that follows the current text color and survives dark/light theming — without pulling in a canvas-based QR library or hardcoding colors.

### Solution

`encodeQr` produces the matrix; `toSvg` renders it as an inline SVG whose modules default to `currentColor`, so the code themes with ordinary CSS.

```ts
import { encodeQr, qrCapacity, SigilCapacityError, toSvg } from '@vielzeug/sigil';

const payload = 'https://vielzeug.dev';

// Optional pre-flight check: pick an error-correction level that fits.
const level = payload.length <= qrCapacity(5, 'M', 'byte') ? 'M' : 'L';

try {
  const matrix = encodeQr(payload, { errorCorrection: level });
  document.querySelector('#qr')!.innerHTML = toSvg(matrix, {
    label: 'Vielzeug link', // <title> + role="img" for screen readers
    margin: 4,              // keep the spec-minimum quiet zone
  });
} catch (error) {
  if (error instanceof SigilCapacityError) {
    console.error(`payload too large: ${error.bytes} > ${error.maxBytes} bytes`);
  }
}
```

The container needs no QR-specific CSS — `color` controls the modules:

```css
#qr svg {
  display: block;
  width: 192px;
  height: auto;
  color: var(--text-color-body);
}
```

### Pitfalls

- Injecting `toSvg` output via `innerHTML` is safe for sigil's own output, but never interpolate *untrusted* values into the `label`/color options — they are emitted as raw attribute/CSS text.
- A payload near capacity produces a dense matrix that cheap scanners struggle with — raise the version (`minVersion`) or lower the error-correction level instead of shrinking the rendered size.
- `encodeQr` throws `SigilCapacityError` synchronously; don't wrap it in a promise chain expecting rejection.

### Related

- [Usage Guide](../usage.md)
- [Pair Two Devices with QR](./pair-two-devices.md)
- [ore-qr-code](../../refine/components/qr-code.md) — the wrapped component
