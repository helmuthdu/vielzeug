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
<<< @/../packages/sigil/src/content/icon/icon.ts
:::

## Basic Usage

```html
<sg-icon name="search"></sg-icon>
<sg-icon name="chevron-right" size="18"></sg-icon>
<sg-icon name="trash-2" label="Delete"></sg-icon>
<sg-icon name="star" solid></sg-icon>

<script type="module">
  import '@vielzeug/sigil/icon';
</script>
```

## Registry (Option A)

`sg-icon` reads from a synchronous icon registry. The default registry is seeded from Lucide at module load.

You can register your own icons (or override existing ones) with `registerIcons`.

```ts
import { registerIcons } from '@vielzeug/sigil/content';

registerIcons({
  BrandMark: [
    ['path', { d: 'M4 4h16v16H4z' }],
    ['circle', { cx: 12, cy: 12, r: 3 }],
  ],
});
```

```html
<sg-icon name="brand-mark"></sg-icon>
```

## Styling and Color

<ComponentPreview center>

```html
<div style="display: flex; gap: 0.75rem; align-items: center;">
  <sg-icon name="search"></sg-icon>
  <sg-icon name="search" size="20"></sg-icon>
  <sg-icon name="search" size="24"></sg-icon>
  <span style="color: var(--color-warning);"><sg-icon name="triangle-alert"></sg-icon></span>
  <span style="color: var(--color-success);"><sg-icon name="check"></sg-icon></span>
  <span style="color: var(--color-warning);"><sg-icon name="star" solid></sg-icon></span>
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
- Example: `<span style="color: var(--color-success);"><sg-icon name="check"></sg-icon></span>`

### CSS Parts

| Part  | Description          |
| ----- | -------------------- |
| `svg` | Internal SVG element |
