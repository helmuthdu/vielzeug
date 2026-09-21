# QR Code

A QR code display component powered by `@vielzeug/sigil`. Encodes the `value` payload into an inline SVG — themeable via `currentColor`, crisp at any scale, and requiring no canvas or external library. Payloads that exceed QR capacity render an error state and emit `error` instead of throwing.

## Variants

### Flat (Default)

Transparent background; module color inherits `currentColor`. Works on any surface.

<ComponentPreview center vertical>

```html
<ore-qr-code value="https://vielzeug.dev"></ore-qr-code>
```

</ComponentPreview>

### Card

Themed background surface with the component's border radius. Preferred when the code sits on a busy or colored backdrop — scanners need a light quiet zone.

<ComponentPreview center vertical>

```html
<ore-qr-code value="https://vielzeug.dev" variant="card"></ore-qr-code>
```

</ComponentPreview>

## Sizes

`size` accepts the named scale or any pixel value.

<ComponentPreview center vertical>

```html
<ore-qr-code value="https://vielzeug.dev" size="sm"></ore-qr-code>
<ore-qr-code value="https://vielzeug.dev" size="md"></ore-qr-code>
<ore-qr-code value="https://vielzeug.dev" size="lg"></ore-qr-code>
<ore-qr-code value="https://vielzeug.dev" size="96"></ore-qr-code>
```

</ComponentPreview>

| `size` | Rendered edge |
| ------ | ------------- |
| `sm`   | 128 px        |
| `md`   | 192 px        |
| `lg`   | 256 px        |
| number | That many px  |

## Error Correction

Higher levels tolerate more damage (logos, print wear) at the cost of a denser matrix. The encoder picks the smallest QR version that fits automatically.

<ComponentPreview center vertical>

```html
<ore-qr-code value="https://vielzeug.dev" error-correction="L"></ore-qr-code>
<ore-qr-code value="https://vielzeug.dev" error-correction="H"></ore-qr-code>
```

</ComponentPreview>

| Level | Recovery | Use for                |
| ----- | -------- | ---------------------- |
| `L`   | ~7%      | Dense codes, clean media |
| `M`   | ~15%     | Default                |
| `Q`   | ~25%     | Print                  |
| `H`   | ~30%     | Overlaid logos, harsh conditions |

## Caption Slot

<ComponentPreview center vertical>

```html
<ore-qr-code value="mesh://offer/abc123" variant="card">
  <span slot="caption">Scan to pair</span>
</ore-qr-code>
```

</ComponentPreview>

## Events

```html
<ore-qr-code value="https://vielzeug.dev" id="qr"></ore-qr-code>

<script type="module">
  const qr = document.getElementById('qr');
  qr.addEventListener('render', (e) => console.log('version', e.detail.version));
  qr.addEventListener('error', (e) => console.warn(e.detail.error.message));
</script>
```

## Custom Styling

```html
<ore-qr-code
  value="https://vielzeug.dev"
  style="--qr-code-dark: var(--color-primary); --qr-code-radius: var(--rounded-lg)">
</ore-qr-code>
```

## API Reference

### Attributes

| Attribute          | Type                                                              | Default      | Description                                  |
| ------------------ | ----------------------------------------------------------------- | ------------ | -------------------------------------------- |
| `value`            | `string`                                                          | `''`         | The payload to encode                        |
| `error-correction` | `'L' \| 'M' \| 'Q' \| 'H'`                                        | `'M'`        | Error-correction level                       |
| `margin`           | `number`                                                          | `4`          | Quiet-zone width in modules                  |
| `size`             | `'sm' \| 'md' \| 'lg' \| number`                                  | `'md'`       | Rendered edge length                         |
| `label`            | `string`                                                          | `'QR code'`  | Accessible name of the SVG                   |
| `variant`          | `'flat' \| 'card'`                                                | `'flat'`     | Surface variant                              |
| `rounded`          | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'` | `'md'`     | Border radius                                |

### Events

| Event    | Detail                             | Description                                  |
| -------- | ---------------------------------- | -------------------------------------------- |
| `render` | `{ version: number; size: number }` | Emitted after each successful encode         |
| `error`  | `{ error: SigilError }`            | Emitted when encoding fails (e.g. capacity)  |

### Slots

| Slot      | Description                          |
| --------- | ------------------------------------ |
| `caption` | Optional caption below the code      |

### CSS Parts

| Part      | Element     | Description              |
| --------- | ----------- | ------------------------ |
| `wrapper` | `<div>`     | Outer container          |
| `svg`     | `<span>`    | Rendered SVG container   |
| `caption` | `<span>`    | Caption slot container   |
| `error`   | `<div>`     | Error-state container    |

### CSS Custom Properties

| Property                | Description                          | Default                 |
| ----------------------- | ------------------------------------ | ----------------------- |
| `--qr-code-dark`        | Module color                         | `currentColor`          |
| `--qr-code-light`       | Module background                    | `transparent`           |
| `--qr-code-size`        | Rendered edge (overrides `size`)     | size-derived px         |
| `--qr-code-radius`      | Border radius (overrides `rounded`)  | `var(--rounded-md)`     |
| `--qr-code-padding`     | Inner padding around the matrix      | `var(--size-3)`         |
| `--qr-code-bg`          | Card background (`variant="card"`)   | `var(--color-canvas)`   |
| `--qr-code-border`      | Card border width (`variant="card"`) | `var(--border)`         |
| `--qr-code-border-color` | Card border color (`variant="card"`) | `var(--color-divider)`  |
| `--qr-code-shadow`      | Card box shadow (`variant="card"`)   | `var(--shadow-sm)`      |
| `--qr-code-error-color` | Error-state text color               | `var(--text-color-secondary)` |

## Accessibility

The SVG carries `role="img"` with `aria-label` from `label` and a `<title>` element — give `label` a meaningful description of what the code *does* ("Pairing code", "Wi-Fi join code"), not the payload itself. The error state uses `role="alert"`. On dark surfaces prefer `variant="card"` or set `--qr-code-light` so the quiet zone keeps contrast for scanners.
