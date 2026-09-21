---
title: Sigil — API Reference
description: Public API of @vielzeug/sigil — encoder, renderers, scanner, types, and errors.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `encodeQr` | Encode a payload into a `QrMatrix` | Sync | Throws `SigilCapacityError` over capacity |
| `qrCapacity` | Payload limit for a version/level/mode | Sync | Returns *characters* for numeric/alphanumeric, *bytes* for byte mode |
| `toSvg` | Render a matrix as an SVG string | Sync | Escapes `dark`/`light` as raw CSS — pass values, not markup |
| `drawToCanvas` | Paint a matrix onto a canvas | Sync | Browser only; resizes the canvas for DPR |
| `detectQr` | One-shot detection on an image source | Async | Throws `SigilUnsupportedError` without `BarcodeDetector` |
| `createQrScanner` | Camera scan loop | Async (start) | Must `dispose()`; camera tracks persist otherwise |
| `isQrScanSupported` | Sync feature check | Sync | Constructor exists ≠ `qr_code` supported — prefer `qrScanSupport()` |
| `qrScanSupport` | Async feature check incl. formats | Async | Never assume support per browser/version |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/sigil` | Complete public Sigil API |

## Encoding

### `encodeQr(data, options?)`

```ts
function encodeQr(data: string | Uint8Array, options?: QrEncodeOptions): QrMatrix;
```

Encodes `data` into a QR symbol. Picks the most compact mode covering the whole input, the smallest fitting version, and the lowest-penalty mask.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `string \| Uint8Array` | — | Payload; `Uint8Array` implies byte mode |
| `options.errorCorrection` | `'L' \| 'M' \| 'Q' \| 'H'` | `'M'` | Error-correction level |
| `options.version` | `1–40` | auto | Pin the version; throws if payload can't fit |
| `options.minVersion` | `1–40` | `1` | Smallest acceptable version |
| `options.mode` | `QrMode` | auto | Force a segment mode |
| `options.mask` | `0–7` | auto | Force the mask (test vectors only) |

**Returns** a frozen `QrMatrix` with `size`, `version`, `mode`, `errorCorrection`, `mask`, `modules`, and `get(x, y)`.

**Throws** `SigilCapacityError` (payload exceeds capacity), `SigilOptionError` (invalid mode/version/mask combination).

```ts
import { encodeQr } from '@vielzeug/sigil';

const matrix = encodeQr('HELLO WORLD', { errorCorrection: 'Q' });
matrix.size; // 21 (v1)
matrix.get(0, 0); // finder pattern → true
```

---

### `qrCapacity(version, errorCorrection, mode)`

```ts
function qrCapacity(version: number, errorCorrection: QrErrorCorrection, mode: QrMode): number;
```

Returns the payload limit: characters for `numeric`/`alphanumeric`, bytes for `byte`.

```ts
qrCapacity(1, 'M', 'byte'); // → 14
qrCapacity(40, 'L', 'numeric'); // → 7089
```

## Rendering

### `toSvg(matrix, options?)`

```ts
function toSvg(matrix: QrMatrix, options?: QrSvgOptions): string;
```

Returns a complete `<svg>` string. Runs in any environment — no DOM required.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `options.dark` | `string` | `'currentColor'` | Dark module color |
| `options.light` | `string` | `'transparent'` | Background color |
| `options.margin` | `number` | `4` | Quiet-zone modules |
| `options.scale` | `number` | `1` | User units per module |
| `options.optimizePath` | `boolean` | `true` | Merge dark runs into one `<path>` |
| `options.label` | `string` | — | `<title>` + `aria-label`; enables `role="img"` |

```ts
const svg = toSvg(matrix, { label: 'Pairing code', dark: 'var(--qr-dark)' });
```

---

### `drawToCanvas(matrix, canvas, options?)` — browser only

```ts
function drawToCanvas(matrix: QrMatrix, canvas: HTMLCanvasElement, options?: QrCanvasOptions): number;
```

Paints the matrix and returns the CSS-pixel edge length. Sizes the backing store for `devicePixelRatio` so output stays crisp on retina displays.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `options.scale` | `number` | `1` | CSS px per module |
| `options.margin` | `number` | `4` | Quiet-zone modules |
| `options.dark` / `options.light` | `string` | `'#000'` / `'#fff'` | Fill colors |

## Scanning (browser only)

### `createQrScanner(options)`

```ts
function createQrScanner(options: QrScannerOptions): QrScanner;
```

Creates a camera scan loop around the native `BarcodeDetector`.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `options.video` | `HTMLVideoElement` | — | Element the stream attaches to (needs `autoplay playsinline muted`) |
| `options.constraints` | `MediaTrackConstraints` | `{ facingMode: 'environment' }` | `getUserMedia` video constraints |
| `options.intervalMs` | `number` | `200` | Minimum ms between detect passes |
| `options.once` | `boolean` | `true` | Stop after the first result |
| `options.signal` | `AbortSignal` | — | Abort → `stop()` |
| `options.detector` | `QrDetector` | native | Injected detector for tests |
| `options.mediaDevices` | `Pick<MediaDevices, 'getUserMedia'>` | `navigator.mediaDevices` | Injected media for tests |

**Returns** a `QrScanner`:

| Member | Signature | Description |
| --- | --- | --- |
| `start()` | `() => Promise<void>` | Request camera, attach stream, run the detect loop. Rejects with `SigilUnsupportedError` / `SigilPermissionError` |
| `stop()` | `() => void` | Stop the loop and tracks; instance stays usable |
| `onResult(handler)` | `(handler) => () => void` | Decode results; returns unsubscribe |
| `tap(handler, options?)` | `(handler, { signal? }) => () => void` | Observe `SigilEvent`s; handler errors are swallowed |
| `status` | `QrScannerStatus` | `'idle' \| 'starting' \| 'scanning' \| 'stopped' \| 'disposed'` |
| `dispose()` / `[Symbol.dispose]` | `() => void` | Terminal teardown; `disposalSignal` aborts |
| `disposed` | `boolean` | Whether `dispose()` ran |

```ts
const scanner = createQrScanner({ video });
const off = scanner.onResult(({ value }) => console.log(value));
await scanner.start();
```

---

### `detectQr(source, options?)`

```ts
function detectQr(
  source: ImageBitmapSource,
  options?: { signal?: AbortSignal; detector?: QrDetector },
): Promise<QrScanResult | null>;
```

Single-pass detection on an image source. Returns the first result's `{ value, cornerPoints }`, or `null` when nothing decodes. Throws `SigilUnsupportedError` when no detector is available.

---

### `isQrScanSupported()` / `qrScanSupport()`

```ts
function isQrScanSupported(): boolean;
function qrScanSupport(): Promise<boolean>;
```

`isQrScanSupported` checks the `BarcodeDetector` constructor synchronously. `qrScanSupport` additionally asks `getSupportedFormats()` for `'qr_code'` — use it before showing scan affordances.

## Types

```ts
type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';
type QrMode = 'numeric' | 'alphanumeric' | 'byte';
type QrScannerStatus = 'idle' | 'starting' | 'scanning' | 'stopped' | 'disposed';

interface QrMatrix {
  readonly errorCorrection: QrErrorCorrection;
  readonly mask: number;
  readonly mode: QrMode;
  readonly modules: ReadonlyArray<ReadonlyArray<boolean>>; // frozen, row-major
  readonly size: number;    // 17 + 4 * version
  readonly version: number; // 1–40
  get(x: number, y: number): boolean; // false outside bounds
}

interface QrScanResult {
  readonly cornerPoints?: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  readonly value: string;
}

interface QrDetector {
  detect(source: ImageBitmapSource): Promise<
    ReadonlyArray<{ rawValue: string; cornerPoints?: ReadonlyArray<{ x: number; y: number }> }>
  >;
}

type SigilEvent =
  | { readonly type: 'status-change'; readonly status: QrScannerStatus }
  | { readonly type: 'detect'; readonly value: string; readonly elapsedMs: number }
  | { readonly type: 'frame-skipped'; readonly reason: 'not-ready' | 'busy' }
  | { readonly type: 'error'; readonly error: SigilError }
  | { readonly type: 'dispose' };
```

`QrEncodeOptions`, `QrSvgOptions`, `QrCanvasOptions`, `QrScannerOptions`, and `QrScanner` are documented under their factories above.

## Errors

| Class | Trigger | Notable members |
| --- | --- | --- |
| `SigilError` | Base class for all sigil errors | — |
| `SigilCapacityError` | Payload exceeds the version/mode limit | `bytes`, `maxBytes`, `version` |
| `SigilOptionError` | Invalid option combination (forced mode can't represent input, bad mask/version) | — |
| `SigilUnsupportedError` | `BarcodeDetector`/`getUserMedia` missing | — |
| `SigilPermissionError` | Camera `NotAllowedError` | — |
| `SigilDisposedError` | `start()` on a disposed scanner | — |

All carry `cause` when wrapping a platform error.
