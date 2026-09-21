# QR Scanner

A camera QR scanner powered by `@vielzeug/sigil`'s `createQrScanner` (native `BarcodeDetector`). Renders a square video preview with a viewfinder, a live status line, and built-in Start/Stop controls. Set `active` to control the camera externally, or let the user drive it with the internal buttons.

`active` defaults to `false`, so the preview below renders its idle state — no camera permission is requested until scanning starts.

<ComponentPreview center vertical>

```html
<ore-qr-scanner></ore-qr-scanner>
```

</ComponentPreview>

## States

The component renders one view per state:

| State         | Shown when                                            | Renders                                   |
| ------------- | ----------------------------------------------------- | ----------------------------------------- |
| `idle`        | Default; camera off                                   | Placeholder panel + "Start camera" button |
| `starting`    | `getUserMedia` in flight                              | Video preview                             |
| `scanning`    | Camera live, detection running                        | Video + viewfinder                        |
| `result`      | A code was decoded (`once`, the default)              | Result panel + "Scan again" button        |
| `denied`      | Camera permission rejected                            | Message + "Retry" button                  |
| `unsupported` | `BarcodeDetector`/`getUserMedia` missing              | `unsupported` slot (app paste fallback)   |
| `error`       | Any other detection failure                           | Message + "Retry" button                  |

## Unsupported Fallback

Browsers without `BarcodeDetector` (check: Chrome/Android yes; Safari varies by version — feature-detect, never assume) render the `unsupported` slot so apps can substitute a manual fallback, e.g. a paste input for the payload.

```html
<ore-qr-scanner>
  <ore-input slot="unsupported" label="Paste the code instead"></ore-input>
</ore-qr-scanner>
```

## Controlled Scanning

Drive the camera from application state with `active`, and react to decodes via `scan`:

```html
<ore-qr-scanner id="scanner" once></ore-qr-scanner>

<script type="module">
  const scanner = document.getElementById('scanner');
  scanner.addEventListener('scan', (e) => {
    pair(e.detail.value);      // e.g. a meshQrCodec payload
  });
  scanner.addEventListener('error', (e) => console.warn(e.detail.error.message));
  scanner.setAttribute('active', '');
</script>
```

With `once` (the default) the camera stops after the first decode and the component shows the result state. Set `once="false"` to keep scanning and receive a `scan` event per decode.

## Options

`facing-mode="user"` prefers the front camera (default `'environment'`); `interval` sets the minimum ms between detection passes (default `200`). `size` accepts `'sm' | 'md' | 'lg'` or a pixel value.

## Custom Styling

```html
<ore-qr-scanner
  style="--qr-scanner-size: 320px; --qr-scanner-viewfinder-color: var(--color-success)">
</ore-qr-scanner>
```

## API Reference

### Attributes

| Attribute     | Type                                                               | Default            | Description                                |
| ------------- | ------------------------------------------------------------------ | ------------------ | ------------------------------------------ |
| `active`      | `boolean`                                                          | `false`            | Start/stop the camera externally           |
| `facing-mode` | `'environment' \| 'user'`                                          | `'environment'`    | Preferred camera                           |
| `interval`    | `number`                                                           | `200`              | Min ms between detection passes            |
| `once`        | `boolean`                                                          | `true`             | Stop after the first successful scan       |
| `size`        | `'sm' \| 'md' \| 'lg' \| number`                                   | `'md'`             | Preview edge length                        |
| `label`       | `string`                                                           | `'QR code scanner'`| Region accessible name                     |
| `rounded`     | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'` | `'md'`             | Preview border radius                      |

### JS-only Properties

| Property         | Type                                    | Description                                      |
| ---------------- | --------------------------------------- | ------------------------------------------------ |
| `scannerFactory` | `(options: QrScannerOptions) => QrScanner` | Testing hook; defaults to `createQrScanner`    |

### Events

| Event    | Detail                              | Description                                       |
| -------- | ----------------------------------- | ------------------------------------------------- |
| `scan`   | `{ value: string }`                 | Emitted on every successful decode                |
| `error`  | `{ error: SigilError }`             | Emitted on permission, support, or detection failure |
| `status` | `{ status: OreQrScannerStatus }`    | Emitted on every view-state transition            |

### Slots

| Slot          | Description                                              |
| ------------- | -------------------------------------------------------- |
| `overlay`     | Content layered over the camera preview                  |
| `unsupported` | Fallback UI when scanning is unsupported (e.g. paste input) |
| `footer`      | Extra content below the status row                       |

### CSS Parts

| Part         | Element    | Description                            |
| ------------ | ---------- | -------------------------------------- |
| `wrapper`    | `<div>`    | Outer container (`role="region"`)      |
| `stage`      | `<div>`    | Square preview area                    |
| `video`      | `<video>`  | Camera preview element                 |
| `viewfinder` | `<div>`    | Decorative scan frame                  |
| `state`      | `<div>`    | Idle/denied/error/result panel (`data-state` reflects the status) |
| `status`     | `<div>`    | Live status line (`role="status"`)     |
| `controls`   | `<div>`    | Button row                             |

### CSS Custom Properties

| Property                        | Description                          | Default                     |
| ------------------------------- | ------------------------------------ | --------------------------- |
| `--qr-scanner-size`             | Preview edge (overrides `size`)      | size-derived px             |
| `--qr-scanner-radius`           | Border radius (overrides `rounded`)  | `var(--rounded-md)`         |
| `--qr-scanner-bg`               | Preview background while idle        | `var(--color-contrast-100)` |
| `--qr-scanner-viewfinder-color` | Viewfinder frame color               | `var(--color-primary)`      |
| `--qr-scanner-status-color`     | Status text color                    | `var(--text-color-secondary)` |

## Accessibility

The component is a `role="region"` labelled by `label`. The status line is a `role="status"` live region, so transitions ("Starting camera…", "Code scanned: …", permission errors) are announced without moving focus. The video and viewfinder are `aria-hidden` — state is conveyed through the live region, not the preview. Start/Stop/Retry controls are real `ore-button`s with visible labels.
