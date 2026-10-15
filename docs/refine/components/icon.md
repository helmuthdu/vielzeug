<script setup>
import IconLibraryPreview from '../../.vitepress/theme/components/IconLibraryPreview.vue';
</script>

# Icon

A lightweight icon wrapper around a synchronous icon registry for consistent rendering, sizing, and accessibility.

## Registry

`ore-icon` resolves `name` from a synchronous registry. Refine includes a small licensed set of component defaults (chevrons, close marks, spinners), with no runtime icon-library imports. Application registrations always take precedence over defaults, regardless of import order.

You can register your own icons (or override existing ones) with `registerIcons`. Keys may be kebab-case or PascalCase: both resolve.

```ts
import { registerIcons } from '@vielzeug/refine/icons';

registerIcons({
  BrandMark: {
    viewBox: [0, 0, 32, 16],
    presentation: { fill: 'currentColor' },
    children: [
      { tag: 'path', attrs: { d: 'M0 0h16v16H0z' } },
      { tag: 'g', attrs: { fill: 'none', stroke: 'currentColor' }, children: [
        { tag: 'circle', attrs: { cx: 24, cy: 8, r: 6 } },
      ] },
    ],
  },
});
```

```html
<ore-icon name="brand-mark"></ore-icon>
```

### Lucide

Lucide is an optional peer: Refine core and the structural adapters work without it. If you use Lucide's data or the full-set registrar, declare the dependency in your application:

```sh
pnpm add lucide@^1.48.0
```

Convert selected Lucide icons with the pure structural adapter. It does not import Lucide or register icons by itself.

```ts
import { registerIcons } from '@vielzeug/refine/icons';
import { lucideIcons } from '@vielzeug/refine/icons/lucide';
import { Search, ChevronRight } from 'lucide';

registerIcons(lucideIcons({ Search, ChevronRight }));
```

For data-driven names, explicitly opt into the complete installed Lucide library:

```ts
import '@vielzeug/refine/icons/lucide/all';
```

Load the registration module before mounting elements that use those names.
Both the published entry and source-aliased production builds retain this
side-effect import, including VitePress sites.

### Selected Heroicons, Tabler, and Material Design Icons

Use a family adapter when you want app-owned names such as `Search` and `Home`, with the same named-map onboarding as `lucideIcons`. Install only your chosen Iconify-format data package:

::: code-group

```sh [Heroicons]
pnpm add @iconify-icons/heroicons
```

```sh [Tabler]
pnpm add @iconify-icons/tabler
```

```sh [Material Design Icons]
pnpm add @iconify-icons/mdi
```

:::

Import individual default exports and convert the named map before mounting icons:

::: code-group

```ts [Heroicons]
import '@vielzeug/refine/icon';
import { registerIcons } from '@vielzeug/refine/icons';
import { heroiconsIcons } from '@vielzeug/refine/icons/heroicons';
import Search from '@iconify-icons/heroicons/magnifying-glass';
import Home from '@iconify-icons/heroicons/home';

registerIcons(heroiconsIcons({ Search, Home }));
```

```ts [Tabler]
import '@vielzeug/refine/icon';
import { registerIcons } from '@vielzeug/refine/icons';
import { tablerIcons } from '@vielzeug/refine/icons/tabler';
import Search from '@iconify-icons/tabler/search';
import Home from '@iconify-icons/tabler/home';

registerIcons(tablerIcons({ Search, Home }));
```

```ts [Material Design Icons]
import '@vielzeug/refine/icon';
import { registerIcons } from '@vielzeug/refine/icons';
import { mdiIcons } from '@vielzeug/refine/icons/mdi';
import Search from '@iconify-icons/mdi/search';
import Home from '@iconify-icons/mdi/home';

registerIcons(mdiIcons({ Search, Home }));
```

:::

All three examples render the same application keys—no provider namespace required:

```html
<ore-icon name="search" label="Search"></ore-icon>
<ore-icon name="home" label="Home"></ore-icon>
```

These adapters consume **Iconify-format individual data only**, not `@heroicons/react`, `@tabler/icons-react`, other native framework components, or MDI raw path strings. Each data object contains `body` plus optional dimensions and transforms; the individual packages supply resolved dimensions. Adapters do not bundle collections, install data packages, or register icons automatically. No provider runtime dependency is required, but conversion needs `DOMParser`.

To override an internal name, choose that app key explicitly:

```ts
import { registerIcons } from '@vielzeug/refine/icons';
import { mdiIcons } from '@vielzeug/refine/icons/mdi';
import Home from '@iconify-icons/mdi/home';

registerIcons(mdiIcons({ Check: Home }));
```

`<ore-icon name="check">` now uses MDI home. Your registration takes precedence over defaults.

### Iconify collections and generic data

Use local Iconify data, not an Iconify web component, remote API, or CDN. The adapter works with the same structural format from other compatible collections; no collection is imported by Refine.

```ts
import { registerIcons } from '@vielzeug/refine/icons';
import { iconifyIcon, iconifyIcons } from '@vielzeug/refine/icons/iconify';
import home from '@iconify-icons/heroicons/home';
import tabler from '@iconify-json/tabler/icons.json';
import mdi from '@iconify-json/mdi/icons.json';

registerIcons({
  Home: iconifyIcon(home),
  ...iconifyIcons(tabler, ['search', 'chevron-right']),
  ...iconifyIcons(mdi, ['account', 'home']),
});
```

```html
<ore-icon name="home" label="Home"></ore-icon>
<ore-icon name="tabler:search"></ore-icon>
<ore-icon name="mdi:account"></ore-icon>
```

Install only the data packages you choose. `@iconify-icons/<prefix>/<name>` exports a default individual data object; `@iconify-json/<prefix>/icons.json` exports collection JSON. Enable `resolveJsonModule` for TypeScript JSON imports. Selecting names from collection JSON limits registration, but your bundler may still include the entire imported collection: individual icon modules are the smallest option.

| Library | Iconify prefix | Data packages | Upstream license |
| --- | --- | --- | --- |
| [Heroicons](https://github.com/tailwindlabs/heroicons) | `heroicons` | `@iconify-icons/heroicons`, `@iconify-json/heroicons` | MIT |
| [Tabler Icons](https://github.com/tabler/tabler-icons) | `tabler` | `@iconify-icons/tabler`, `@iconify-json/tabler` | MIT |
| [Material Design Icons](https://github.com/Templarian/MaterialDesign) | `mdi` | `@iconify-icons/mdi`, `@iconify-json/mdi` | Apache-2.0 |

These three families are tested with upstream Iconify data. Preserve their license/attribution requirements when redistributing SVGs. Refine's curated defaults and test-fixture licenses are in `THIRD_PARTY_NOTICES`.

### Live library comparison

This isolated preview uses `heroiconsIcons`, `tablerIcons`, and `mdiIcons` with the same licensed local fixture data used by the browser tests. App keys `HeroHome`, `TablerHome`, and `MaterialHome` need no namespace. Heroicons and Tabler retain their outline strokes; Material Design Icons retains its filled path. The first row supplies accessible labels, the next icon is decorative beside text, and the button overrides the internal `check` name without modifying any library outside this sandbox.

<IconLibraryPreview />

`iconifyIcon(data)` returns one `IconDefinition`. `iconifyIcons(collection, names?)` returns a registration map, using `prefix:name` keys when `prefix` is set. Omitting `names` explicitly converts all icons and aliases in that collection. Dimensions default to Iconify's 16×16; collection dimensions and per-icon/alias overrides are honored. Alias chains, horizontal/vertical flips, and integer quarter-turn rotations are supported.

Offsets must be finite numbers; dimensions must be finite positive numbers. Validation applies to resolved icon, collection, and alias geometry before any flip or rotation. Provider `class` metadata (such as Tabler's `icon-tabler`) is discarded recursively; SVG presentation attributes are preserved. Classes are not accepted in neutral definitions.

Conversion requires a browser `DOMParser` (or a DOM-equipped build/test environment). There is no network access, asynchronous provider, or framework callback.

### Definition contract and errors

`IconDefinition` contains `viewBox: readonly [left, top, width, height]`, optional root `presentation`, and recursive `children`. Each child has a `tag`, optional `attrs`, and optional `children`. Root presentation and child attributes remain intact, so filled, stroked, mixed, and non-square icons need no special flags.

`registerIcons` accepts only this format, validates the entire batch before registering anything, and snapshots the supplied data. Re-registering the same normalized name replaces an application registration. Names are case-insensitive and ignore hyphens/underscores; namespace colons remain significant. Register before mounting icons; registration does not notify already-mounted elements.

Unsupported tags or attributes, scripts, event handlers, styles, external references, malformed SVG, invalid dimensions/transforms, duplicate IDs, missing icons, and cyclic aliases throw `RefineError`. Treat SVG as trusted developer-owned data, not untrusted user input. SVG text and animation elements are intentionally unsupported. Local `href="#id"`/`url(#id)` references are supported and rewritten per rendered instance, including gradients, masks, and clip paths. No `unsafeHtml` is used.

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

- `name`: `string`, default `undefined`: Registered icon name (for example `search`, `heroicons:home`)
- `size`: `number | string`, default `16`: Icon width/height
- `stroke-width`: `number`, default `undefined`: Overrides root and nested stroke widths; otherwise the definition's widths remain intact (Lucide defaults to 2)
- `absolute-stroke-width`: `boolean`, default `false`: Uses SVG non-scaling strokes, including CSS sizes and non-square viewBoxes
- `solid`: `boolean`, default `false`: Explicitly overrides root and nested fills to `currentColor` and strokes to `none`; leave off to preserve native presentation
- `label`: `string`, default `undefined`: Accessible label; omit for decorative icons, required when the icon is the sole means of conveying information

## Notes

- There is no `color` attribute. Set icon color through CSS via `currentColor`.
- Example: `<span style="color: var(--color-success);"><ore-icon name="check"></ore-icon></span>`

### CSS Parts

| Part  | Description          |
| ----- | -------------------- |
| `svg` | Internal SVG element |

## Accessibility

When `label` is omitted, the icon is treated as decorative and receives `aria-hidden="true"`. When `label` is provided, the host element receives `role="img"` and `aria-label` set to that value. Always set `label` when an icon conveys meaning without accompanying visible text.
