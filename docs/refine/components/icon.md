# Icon

A lightweight icon wrapper around a synchronous icon registry for consistent rendering, sizing, and accessibility.

## Registry

`ore-icon` resolves `name` from a synchronous registry. The registry always contains the icons refine's own components render (chevrons, close marks, spinners); it does not include the whole Lucide library, so an application only ever ships the icons it uses.

You can register your own icons (or override existing ones) with `registerIcons`. Keys may be kebab-case or PascalCase — both resolve.

```ts
import { registerIcons } from '@vielzeug/refine/icon';

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

To register individual Lucide icons, import them from `lucide` and pass them to `registerIcons` — tree-shaking keeps the bundle to exactly those icons.

```ts
import { registerIcons } from '@vielzeug/refine/icon';
import { Search, ChevronRight } from 'lucide';

registerIcons({ Search, ChevronRight });
```

When icon names arrive from data rather than a known set, import the side-effect module `@vielzeug/refine/icon-lucide` to register the complete Lucide library (~2,100 icons, ~100 kB gzipped).

```ts
import '@vielzeug/refine/icon-lucide';
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

- `name`: `string`, default `undefined` — Lucide icon name (for example `search`, `chevron-right`), resolved from the registered set
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
