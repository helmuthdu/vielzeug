# QR Code

A QR code display component powered by `@vielzeug/sigil`. Encodes the `value` payload into an inline SVG: themeable via `currentColor`, crisp at any scale, and requiring no canvas or external library. Payloads that exceed QR capacity render an error state and emit `error` instead of throwing.

## Variants

### Flat (Default)

Transparent background; module color inherits `currentColor`. Works on any surface.

<ComponentPreview center vertical>

```html
<ore-qr-code value="https://vielzeug.dev"></ore-qr-code>
```

</ComponentPreview>

### Card

Themed background surface with the component's border radius. Preferred when the code sits on a busy or colored backdrop: scanners need a light quiet zone.

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

| Level | Recovery | Use for                          |
| ----- | -------- | -------------------------------- |
| `L`   | ~7%      | Dense codes, clean media         |
| `M`   | ~15%     | Default                          |
| `Q`   | ~25%     | Print                            |
| `H`   | ~30%     | Overlaid logos, harsh conditions |

## Dot Styles

`dot-style` rounds or dots the data modules. Finder patterns always stay square so the code remains scannable.

<ComponentPreview center vertical>

```html
<ore-qr-code value="https://vielzeug.dev" dot-style="dots"></ore-qr-code>
<ore-qr-code value="https://vielzeug.dev" dot-style="rounded"></ore-qr-code>
```

</ComponentPreview>

## Gradient Modules

Setting both `gradient-from` and `gradient-to` paints the modules with a vertical gradient instead of the solid module color.

<ComponentPreview center vertical>

```html
<ore-qr-code value="https://vielzeug.dev" gradient-from="#0ea5e9" gradient-to="#7c3aed"></ore-qr-code>
```

</ComponentPreview>

## Logo Overlay

`image` embeds a centered logo; the modules it covers are left unpainted instead of blurred over. Keep the logo under a third of the code width and raise `error-correction` to `H`: carving modules out of the matrix destroys data, and level `H` recovers roughly 30%.

<ComponentPreview center vertical>

```html
<ore-qr-code
  value="https://vielzeug.dev"
  error-correction="H"
  image="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjY0IiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxlbGxpcHNlIGN4PSI0Ni4xNzE2NzciIGN5PSItOS40OTY0MDk0IiByeD0iMTEuOTQ5NTkyIiByeT0iMzEuMDE3MDY5IiBzdHlsZT0iZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOiNjMGJmYmM7c3Ryb2tlLXdpZHRoOjMuMDMwMjc7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2Utb3BhY2l0eTowLjY5NjA3ODtwYWludC1vcmRlcjpzdHJva2UgbWFya2VycyBmaWxsIiB0cmFuc2Zvcm09Im1hdHJpeCgwLjU0NjU1ODYxLDAuODM3NDIwODUsLTAuNzEyMzE4OTUsMC43MDE4NTU5LDAsMCkiIC8+PGVsbGlwc2UgY3g9Ii0yMi43OTAwMjQiIGN5PSI0My44ODAyODMiIHJ4PSIxMS45NDk1OTIiIHJ5PSIzMS4wMTcwNjciIHN0eWxlPSJmaWxsLW9wYWNpdHk6MTtzdHJva2U6I2MwYmZiYztzdHJva2Utd2lkdGg6My4wMzAyNztzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1vcGFjaXR5OjAuNjk2MDc4O3BhaW50LW9yZGVyOnN0cm9rZSBtYXJrZXJzIGZpbGwiIHRyYW5zZm9ybT0ibWF0cml4KDAuNDUxOTQ4NDQsLTAuODkyMDQ0MDYsMC45NjM5ODQ1MiwwLjI2NTk1ODM2LDAsMCkiIC8+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMCwtMy40Nzk4Mzg1LC0zLjQ3OTgzODUsMCwxMTYuMDYxNzEsMjc2LjMzMDU4KSI+PHBhdGggZD0ibSA3NC4wMTQ2NTMsMjAuMzU4MjM5IGMgMCwwIC0yLjc0MjU5MSwxLjYyMjQzNCAtMi44Nzc5NzIsMS41NTY0NTEgLTAuMjIwNDk3LC0wLjEwNzQ4OSAwLjA1MzgzLC0wLjYxMDkwNyAwLjA1MzgzLC0wLjYxMDkwNyAtMC42NTAyNTEsMC41NDgxNjEgLTEuMzAwNTAxLDEuMDk2MzIzIC0xLjk1MDc1MiwxLjY0NDQ4NCAtMC4wMjg3LDAuMDI0NjQgLTAuMDU2NzUsMC4wNTA1OCAtMC4wODM5OSwwLjA3NzgyIC0wLjYwNTA2NSwwLjYwNTA2NiAtMC42MDUwNjUsMS41ODU5NjIgMCwyLjE5MTAyNyAwLjYwNTA2NSwwLjYwNTA2NSAxLjU4NTk2MSwwLjYwNTA2NSAyLjE5MTAyNiwwIDAuMDY1NjYsLTAuMDY1NjYgMC4xNzU3NTUsLTAuMjA5NDc4IDAuMTc1NzU1LC0wLjIwOTQ3OCBsIDEuODI4MDEsLTIuNDM1ODM1IGMgMCwwIC0wLjQ3MDk1OCwwLjI1MDA4NCAtMC41NjQ1ODYsLTAuMTA5MTM3IHoiIHN0eWxlPSJmaWxsOiNlOTIwNjM7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlLXdpZHRoOjAuMDEwMzc2MyIvPjxjaXJjbGUgY3g9IjcwLjI1MDMyIiBjeT0iMjQuMTIwMjg1IiByPSIxLjEwNjc0MDUiIHN0eWxlPSJmaWxsOiNmM2YzZjM7ZmlsbC1vcGFjaXR5OjAuNzAyNzAzO3N0cm9rZS13aWR0aDowLjAxMDM3NjMiLz48L2c+PGVsbGlwc2UgY3g9Ii0yMi43ODk5OTciIGN5PSI0My44ODAyNzIiIHJ4PSIxMS45NDk1OTIiIHJ5PSIzMS4wMTcwNjciIHN0eWxlPSJmaWxsLW9wYWNpdHk6MTtzdHJva2U6I2MwYmZiYztzdHJva2Utd2lkdGg6My4wMzAyNztzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1vcGFjaXR5OjAuNjk2MDc4O3BhaW50LW9yZGVyOnN0cm9rZSBtYXJrZXJzIGZpbGwiIHRyYW5zZm9ybT0ibWF0cml4KC0wLjg5MjA0NDA2LDAuNDUxOTQ4NDQsMC4yNjU5NTgzNiwwLjk2Mzk4NDUyLDAsMCkiIC8+PGcgc3R5bGU9ImZpbGw6I2MwYmZiYyIgdHJhbnNmb3JtPSJtYXRyaXgoLTAuNzU2NDAyMzUsLTAuMjAyNjc3NCwwLjIwMjY3NzQsLTAuNzU2NDAyMzUsNjAuMjM2NTQsNTcuMjEyMTE4KSI+PHBhdGggZD0ibSA0My4yNzMzMTQsNDQuMTA0ODI5IGEgMy4yMDQxMDMxLDMuMTgwODkyMyA0NC45NTM3NyAwIDAgLTMuMDkwMjQxLDIuMzM0NTE1IDMuMjA0MTAzMSwzLjE4MDg5MjMgNDQuOTUzNzcgMCAwIDIuMjQ3MjIxLDMuOTMzMjYxIDMuMjA0MTAzMSwzLjE4MDg5MjMgNDQuOTUzNzcgMCAwIDAuODM1NTM3LDAuMTE3MjIzIGggMC4wMjQ5NCBsIDMuMTY3NTU5LDEwZS03IC0xMGUtNywtMy4xOTI1IGEgMy4yMDQxMDMxLDMuMTgwODkyMyA0NC45NTM3NyAwIDAgLTIuMzU2OTYxLC0zLjA3NTI3NiAzLjIwNDEwMzEsMy4xODA4OTIzIDQ0Ljk1Mzc3IDAgMCAtMC44MjgwNTQsLTAuMTE3MjI0IHoiIHN0eWxlPSJmaWxsOiNjMGJmYmM7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjIuNTU0O3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjpzdHJva2UgbWFya2VycyBmaWxsIi8+PC9nPjxnIHN0eWxlPSJmaWxsOiNjMGJmYmMiIHRyYW5zZm9ybT0ibWF0cml4KC0wLjU1MzcyNDk1LDAuNTUzNzI0OTUsLTAuNTUzNzI0OTUsLTAuNTUzNzI0OTUsNjguNjU2MjYsMjAuNjcwNTE2KSI+PHBhdGggZD0ibSA0My4yNzMzMTQsNDQuMTA0ODI5IGEgMy4yMDQxMDMxLDMuMTgwODkyMyA0NC45NTM3NyAwIDAgLTMuMDkwMjQxLDIuMzM0NTE1IDMuMjA0MTAzMSwzLjE4MDg5MjMgNDQuOTUzNzcgMCAwIDIuMjQ3MjIxLDMuOTMzMjYxIDMuMjA0MTAzMSwzLjE4MDg5MjMgNDQuOTUzNzcgMCAwIDAuODM1NTM3LDAuMTE3MjIzIGggMC4wMjQ5NCBsIDMuMTY3NTU5LDEwZS03IC0xMGUtNywtMy4xOTI1IGEgMy4yMDQxMDMxLDMuMTgwODkyMyA0NC45NTM3NyAwIDAgLTIuMzU2OTYxLC0zLjA3NTI3NiAzLjIwNDEwMzEsMy4xODA4OTIzIDQ0Ljk1Mzc3IDAgMCAtMC44MjgwNTQsLTAuMTE3MjI0IHoiIHN0eWxlPSJmaWxsOiNjMGJmYmM7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjIuNTU0O3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjpzdHJva2UgbWFya2VycyBmaWxsIi8+PC9nPjxnIHN0eWxlPSJmaWxsOiNjMGJmYmMiIHRyYW5zZm9ybT0ibWF0cml4KDAuMjAyNjc3NCwwLjc1NjQwMjM1LC0wLjc1NjQwMjM1LDAuMjAyNjc3NCw0MC4zODA5MzIsLTQuOTQwMzAwNykiPjxwYXRoIGQ9Im0gNDMuMjczMzE0LDQ0LjEwNDgyOSBhIDMuMjA0MTAzMSwzLjE4MDg5MjMgNDQuOTUzNzcgMCAwIC0zLjA5MDI0MSwyLjMzNDUxNSAzLjIwNDEwMzEsMy4xODA4OTIzIDQ0Ljk1Mzc3IDAgMCAyLjI0NzIyMSwzLjkzMzI2MSAzLjIwNDEwMzEsMy4xODA4OTIzIDQ0Ljk1Mzc3IDAgMCAwLjgzNTUzNywwLjExNzIyMyBoIDAuMDI0OTQgbCAzLjE2NzU1OSwxMGUtNyAtMTBlLTcsLTMuMTkyNSBhIDMuMjA0MTAzMSwzLjE4MDg5MjMgNDQuOTUzNzcgMCAwIC0yLjM1Njk2MSwtMy4wNzUyNzYgMy4yMDQxMDMxLDMuMTgwODkyMyA0NC45NTM3NyAwIDAgLTAuODI4MDU0LC0wLjExNzIyNCB6IiBzdHlsZT0iZmlsbDojYzBiZmJjO2ZpbGwtb3BhY2l0eToxO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDoyLjU1NDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6c3Ryb2tlIG1hcmtlcnMgZmlsbCIvPjwvZz48L3N2Zz4="
  image-size="0.22"></ore-qr-code>
```

</ComponentPreview>

## Loading State

While the payload is being generated (an async share link, a rotating token), `loading` shows a shimmer placeholder and suppresses the empty-value error. The `render` event fires when the code settles.

<ComponentPreview center vertical>

```html
<ore-qr-code value="" loading></ore-qr-code>
```

</ComponentPreview>

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

## Export

`toSvg()` returns the rendered string for copy or embed. `toPng(scale)` rasterizes to a PNG blob at `scale` device pixels per module; theme colors (`currentColor`, custom properties, relative logo URLs) resolve against the live page before export. A cross-origin `image` logo must be CORS-enabled (or a `data:` URI) or the rasterized canvas is tainted and `toPng` rejects with a `SigilError`.

```html
<ore-qr-code value="https://vielzeug.dev" id="qr"></ore-qr-code>

<script type="module">
  const qr = document.getElementById('qr');
  const blob = await qr.toPng(8); // 8 px per module
  const url = URL.createObjectURL(blob);
  // offer `url` as a download…
</script>
```

## Custom Styling

```html
<ore-qr-code
  value="https://vielzeug.dev"
  style="--qr-code-dark: var(--color-primary); --qr-code-radius: var(--rounded-lg)">
</ore-qr-code>
```

### Scan-line flourish

A scanner-style sweep needs an overlay element: `::part()` cannot reach pseudo-elements, so wrap the code in a positioned frame.

```html
<style>
  .scan-frame {
    position: relative;
    display: inline-block;
  }

  .scan-frame::after {
    position: absolute;
    inset-inline: 8%;
    height: 2px;
    content: '';
    background: var(--color-primary);
    box-shadow: 0 0 12px var(--color-primary);
    animation: qr-scan 2.4s ease-in-out infinite alternate;
  }

  @keyframes qr-scan {
    from {
      top: 6%;
    }
    to {
      top: 94%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scan-frame::after {
      animation: none;
    }
  }
</style>

<div class="scan-frame">
  <ore-qr-code value="https://vielzeug.dev" variant="card"></ore-qr-code>
</div>
```

## API Reference

### Attributes

| Attribute          | Type                                                                 | Default     | Description                                       |
| ------------------ | -------------------------------------------------------------------- | ----------- | ------------------------------------------------- |
| `value`            | `string`                                                             | `''`        | The payload to encode                             |
| `dot-style`        | `'dots' \| 'rounded' \| 'square'`                                    | `'square'`  | Data-module shape (finders stay square)           |
| `error-correction` | `'L' \| 'M' \| 'Q' \| 'H'`                                           | `'M'`       | Error-correction level                            |
| `gradient-from`    | `string`                                                             | `''`        | Gradient module paint start (needs `gradient-to`) |
| `gradient-to`      | `string`                                                             | `''`        | Gradient module paint end (needs `gradient-from`) |
| `image`            | `string`                                                             | `''`        | Logo overlay URL; modules under it are skipped    |
| `image-size`       | `number`                                                             | `0.22`      | Logo size as a fraction of the code edge          |
| `loading`          | `boolean`                                                            | `false`     | Shimmer placeholder instead of the code           |
| `margin`           | `number`                                                             | `4`         | Quiet-zone width in modules                       |
| `size`             | `'sm' \| 'md' \| 'lg' \| number`                                     | `'md'`      | Rendered edge length                              |
| `label`            | `string`                                                             | `'QR code'` | Accessible name of the SVG                        |
| `variant`          | `'flat' \| 'card'`                                                   | `'flat'`    | Surface variant                                   |
| `rounded`          | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'` | `'md'`      | Border radius                                     |

### Methods

| Method       | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| `toPng(s=8)` | Rasterizes the code to a PNG `Blob` at `s` device px per module (default 8) |
| `toSvg()`    | Returns the rendered SVG string: `''` while loading or in an error state    |

### Events

| Event    | Detail                              | Description                                 |
| -------- | ----------------------------------- | ------------------------------------------- |
| `render` | `{ version: number; size: number }` | Emitted after each successful encode        |
| `error`  | `{ error: SigilError }`             | Emitted when encoding fails (e.g. capacity) |

### Slots

| Slot      | Description                     |
| --------- | ------------------------------- |
| `caption` | Optional caption below the code |

### CSS Parts

| Part       | Element  | Description            |
| ---------- | -------- | ---------------------- |
| `wrapper`  | `<div>`  | Outer container        |
| `svg`      | `<span>` | Rendered SVG container |
| `skeleton` | `<span>` | Loading placeholder    |
| `caption`  | `<span>` | Caption slot container |
| `error`    | `<div>`  | Error-state container  |

### CSS Custom Properties

| Property                       | Description                          | Default                       |
| ------------------------------ | ------------------------------------ | ----------------------------- |
| `--qr-code-dark`               | Module color                         | `currentColor`                |
| `--qr-code-light`              | Module background                    | `transparent`                 |
| `--qr-code-size`               | Rendered edge (overrides `size`)     | size-derived px               |
| `--qr-code-radius`             | Border radius (overrides `rounded`)  | `var(--rounded-md)`           |
| `--qr-code-padding`            | Inner padding around the matrix      | `var(--size-3)`               |
| `--qr-code-bg`                 | Card background (`variant="card"`)   | `var(--color-canvas)`         |
| `--qr-code-border`             | Card border width (`variant="card"`) | `var(--border)`               |
| `--qr-code-border-color`       | Card border color (`variant="card"`) | `var(--color-divider)`        |
| `--qr-code-shadow`             | Card box shadow (`variant="card"`)   | `var(--shadow-sm)`            |
| `--qr-code-error-color`        | Error-state text color               | `var(--text-color-secondary)` |
| `--qr-code-skeleton-bg`        | Loading placeholder base color       | `var(--color-contrast-200)`   |
| `--qr-code-skeleton-highlight` | Loading placeholder shimmer color    | `var(--color-contrast-100)`   |
| `--qr-code-skeleton-radius`    | Loading placeholder corner radius    | `var(--rounded-md)`           |
| `--qr-code-skeleton-duration`  | Shimmer cycle duration               | `1.6s`                        |

## Accessibility

The SVG carries `role="img"` with `aria-label` from `label` and a `<title>` element: give `label` a meaningful description of what the code _does_ ("Pairing code", "Wi-Fi join code"), not the payload itself. The error state uses `role="alert"`. On dark surfaces prefer `variant="card"` or set `--qr-code-light` so the quiet zone keeps contrast for scanners.
