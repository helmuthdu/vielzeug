# Icon

A lightweight icon wrapper around a synchronous icon registry for consistent rendering, sizing, and accessibility.

## Features

- 🧩 **Single API** — consistent `name`, `size`, and a11y behavior
- ♿ **Accessible by default** — decorative when unlabeled, semantic when `label` is set
- 🎨 **Theme-friendly** — uses `currentColor` so color is controlled with CSS
- 📏 **Flexible sizing** — number (px) or CSS length values
- 🧱 **Solid mode** — enable `solid` for filled icon rendering

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/content/icon/icon.ts
:::

## Basic Usage

```html
<bit-icon name="search"></bit-icon>
<bit-icon name="chevron-right" size="18"></bit-icon>
<bit-icon name="trash-2" label="Delete"></bit-icon>
<bit-icon name="star" solid></bit-icon>

<script type="module">
  import '@vielzeug/buildit/icon';
</script>
```

## Registry (Option A)

`bit-icon` reads from a synchronous icon registry. The default registry is seeded from Lucide at module load.

You can register your own icons (or override existing ones) with `registerIcons`.

```ts
import { registerIcons } from '@vielzeug/buildit/content';

registerIcons({
  BrandMark: [
    ['path', { d: 'M4 4h16v16H4z' }],
    ['circle', { cx: 12, cy: 12, r: 3 }],
  ],
});
```

```html
<bit-icon name="brand-mark"></bit-icon>
```

## Styling and Color

<ComponentPreview center>

```html
<div style="display: flex; gap: 0.75rem; align-items: center;">
  <bit-icon name="search"></bit-icon>
  <bit-icon name="search" size="20"></bit-icon>
  <bit-icon name="search" size="24"></bit-icon>
  <span style="color: var(--color-warning);"><bit-icon name="triangle-alert"></bit-icon></span>
  <span style="color: var(--color-success);"><bit-icon name="check"></bit-icon></span>
  <span style="color: var(--color-warning);"><bit-icon name="star" solid></bit-icon></span>
</div>
```

</ComponentPreview>

## Accessibility

- If `label` is omitted, the icon is treated as decorative (`aria-hidden="true"`).
- If `label` is provided, the host gets `role="img"` and `aria-label`.

## API Reference

### Attributes

- `name`: `string`, default `undefined` — Lucide icon name (for example `search`, `chevron-right`)
- `size`: `number | string`, default `16` — Icon width/height
- `stroke-width`: `number`, default `2` — SVG stroke width
- `absolute-stroke-width`: `boolean`, default `false` — Keeps stroke width visually consistent on scale
- `solid`: `boolean`, default `false` — Renders icon as a filled shape
- `label`: `string`, default `undefined` — Accessible label; omit for decorative icons

## Notes

- There is no `color` attribute. Set icon color through CSS via `currentColor`.
- Example: `<span style="color: var(--color-success);"><bit-icon name="check"></bit-icon></span>`

### CSS Parts

| Part  | Description          |
| ----- | -------------------- |
| `svg` | Internal SVG element |
