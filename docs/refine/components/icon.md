# Icon

A lightweight icon wrapper around a synchronous icon registry for consistent rendering, sizing, and accessibility.

## Registry (Option A)

`ore-icon` reads from a synchronous icon registry. The default registry is seeded from Lucide at module load.

You can register your own icons (or override existing ones) with `registerIcons`.

```ts
import { registerIcons } from '@vielzeug/refine/content';

registerIcons({
  BrandMark: [
    ['path', { d: 'M4 4h16v16H4z' }],
    ['circle', { cx: 12, cy: 12, r: 3 }],
  ],
});
```

```html
<ore-icon name="brand-mark"></ore-icon>
```

## Styling and Color

<ComponentPreview center>

```html
<div style="display: flex; gap: 0.75rem; align-items: center;">
  <ore-icon name="search"></ore-icon>
  <ore-icon name="search" size="20"></ore-icon>
  <ore-icon name="search" size="24"></ore-icon>
  <span style="color: var(--color-warning);"><ore-icon name="triangle-alert"></ore-icon></span>
  <span style="color: var(--color-success);"><ore-icon name="check"></ore-icon></span>
  <span style="color: var(--color-warning);"><ore-icon name="star" solid></ore-icon></span>
</div>
```

</ComponentPreview>

## API Reference

### Attributes

- `name`: `string`, default `undefined` — Lucide icon name (for example `search`, `chevron-right`)
- `size`: `number | string`, default `16` — Icon width/height
- `stroke-width`: `number`, default `2` — SVG stroke width
- `absolute-stroke-width`: `boolean`, default `false` — Keeps stroke width visually consistent on scale
- `solid`: `boolean`, default `false` — Renders icon as a filled shape
- `label`: `string`, default `undefined` — Accessible label; omit for decorative icons, required when the icon is the sole means of conveying information

## Notes

- There is no `color` attribute. Set icon color through CSS via `currentColor`.
- Example: `<span style="color: var(--color-success);"><ore-icon name="check"></ore-icon></span>`

### CSS Parts

| Part  | Description          |
| ----- | -------------------- |
| `svg` | Internal SVG element |

## Accessibility

When `label` is omitted, the icon is treated as decorative and receives `aria-hidden="true"`. When `label` is provided, the host element receives `role="img"` and `aria-label` set to that value. Always set `label` when an icon conveys meaning without accompanying visible text.
