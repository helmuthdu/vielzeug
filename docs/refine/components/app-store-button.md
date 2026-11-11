# App Store Button

An app-store download badge: the store logo plus the classic two-line "Download on the / App Store" lockup, linking to a store listing. The badge renders as a real anchor with the theme's contrast tokens, so it stays readable in both appearances without any brand-asset files.

## Stores

Three stores ship with a badge treatment. Pick one with the `store` attribute (`apple` is the default).

<ComponentPreview center>

```html
<ore-app-store-button store="apple" href="https://apps.apple.com/app/id1234567890"></ore-app-store-button>
<ore-app-store-button store="google-play" href="https://play.google.com/store/apps/details?id=com.example"></ore-app-store-button>
<ore-app-store-button store="huawei" href="https://appgallery.huawei.com/app/C12345678"></ore-app-store-button>
```

</ComponentPreview>

| Store         | Badge text                         |
| ------------- | ---------------------------------- |
| `apple`       | Download on the App Store          |
| `google-play` | Get it on Google Play              |
| `huawei`      | Explore it on AppGallery           |

## Variants

`filled` (the default) renders the classic inverted slab: dark ink in the light appearance, a light slab in the dark one. `outline` renders a bordered badge drawn with the surrounding text color, so it blends into light and dark sections alike.

<ComponentPreview center>

```html
<ore-app-store-button href="https://apps.apple.com/app/id1234567890"></ore-app-store-button>
<ore-app-store-button variant="outline" href="https://apps.apple.com/app/id1234567890"></ore-app-store-button>
```

</ComponentPreview>

## Sizes

`md` is the standard 40px badge; `lg` is the 44px touch-friendly tier.

<ComponentPreview center>

```html
<ore-app-store-button size="md" href="https://apps.apple.com/app/id1234567890"></ore-app-store-button>
<ore-app-store-button size="lg" store="google-play" href="https://play.google.com/store/apps/details?id=com.example"></ore-app-store-button>
```

</ComponentPreview>

## Linking

With `href` the badge is a native `<a>`: `target` and `rel` pass through, and `noopener noreferrer` is added automatically whenever `target="_blank"`. Open store links in a new tab so visitors keep your page:

<ComponentPreview center>

```html
<ore-app-store-button store="apple" href="https://apps.apple.com/app/id1234567890" target="_blank"></ore-app-store-button>
```

</ComponentPreview>

Without `href` the badge still renders (useful in build pipelines where the listing URL arrives later), but as an image-role badge: it shows the printed text to screen readers and is not focusable or clickable.

## API Reference

### `ore-app-store-button` Attributes

| Attribute | Type                                         | Default    | Description                                                          |
| --------- | -------------------------------------------- | ---------- | -------------------------------------------------------------------- |
| `store`   | `'apple' \| 'google-play' \| 'huawei'`       | `'apple'`  | Store badge to render                                                |
| `variant` | `'filled' \| 'outline'`                      | `'filled'` | Visual treatment                                                     |
| `size`    | `'md' \| 'lg'`                               | `'md'`     | Badge size (40px / 44px)                                             |
| `href`    | `string`                                     | N/A        | Store listing URL; the badge is an anchor when set                   |
| `target`  | `'_blank' \| '_self' \| '_parent' \| '_top'` | N/A        | Link target (requires `href`)                                        |
| `rel`     | `string`                                     | N/A        | Link `rel`; `noopener noreferrer` is merged in for `target="_blank"` |
| `label`   | `string`                                     | N/A        | Accessible label override (defaults to the printed badge text)       |

### Slots

None. The badge lockup is fixed by design: it mirrors the store's printed badge.

### Events

The badge emits no custom events; with `href` set, the native anchor's `click` composes out of the shadow DOM as usual.

### CSS Parts

| Part      | Element                                      |
| --------- | -------------------------------------------- |
| `link`    | The anchor (`href` set) or image-role span   |
| `logo`    | The store logo wrapper                       |
| `labels`  | The two-line text lockup wrapper             |
| `eyebrow` | The small uppercase line ("Download on the") |
| `store`   | The store name line ("App Store")            |

### CSS Custom Properties

| Property                                  | Description                 | Default                         |
| ----------------------------------------- | --------------------------- | ------------------------------- |
| `--app-store-button-filled-bg`            | Filled badge background     | `var(--color-contrast-900)`     |
| `--app-store-button-filled-color`         | Filled badge foreground     | `var(--color-contrast-50)`      |
| `--app-store-button-filled-hover-bg`      | Filled background on hover  | `var(--color-contrast-800)`     |
| `--app-store-button-outline-color`        | Outline badge foreground    | `var(--text-color-heading)`     |
| `--app-store-button-outline-border-color` | Outline badge border color  | `var(--color-neutral-border)`   |
| `--app-store-button-outline-hover-bg`     | Outline background on hover | `var(--color-neutral-backdrop)` |
| `--app-store-button-radius`               | Badge corner radius         | `var(--rounded-lg)`             |
| `--app-store-button-eyebrow-opacity`      | Opacity of the eyebrow line | `0.85`                          |

To pin the classic pure-black Apple badge regardless of appearance, override the filled tokens:

```css
ore-app-store-button {
  --app-store-button-filled-bg: #000;
  --app-store-button-filled-hover-bg: #1a1a1a;
}
```

## Trademarks

Apple, the Apple logo, "App Store", Google, "Google Play", Huawei, and "AppGallery" are trademarks of their respective owners. The badge renders the store logo and printed text for the sole purpose of linking to your app's store listing, and the logo path data is the public-domain (CC0) artwork from [Simple Icons](https://simple-icons.si).

Trademarks are not dedicated to the public domain: each store publishes brand guidelines for its official download badge (official artwork, prescribed colors, minimum sizes). The themed `filled`/`outline` treatments here are theme-coherent renderings, not the official assets: if your store agreement or brand guidelines require the official badge, pin the filled tokens to the prescribed colors (for example pure black for the Apple badge, as shown above) or use the store-provided badge image instead. When in doubt, check the current guidelines: [Apple](https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html), [Google Play](https://play.google/about/downloads/entrypoints/), [Huawei AppGallery](https://developer.huawei.com/consumer/en/doc/development/AppGallery-connect-Guides/agcdownloads-getbadge-0000001057274307).

## Accessibility

**Screen readers:** the badge exposes one accessible name matching the printed text ("Get it on Google Play"). The logo and lockup are `aria-hidden`, so nothing is announced twice. Override the name to name your app (`label="Get Quest Tamer on the App Store"`).

**Keyboard:** with `href` the badge is a real anchor in the tab order and shows the shared focus ring on `:focus-visible`. Without `href` it is intentionally not focusable.

**Contrast:** the filled badge pairs the extremes of the contrast ramp (`--color-contrast-900` with `--color-contrast-50`), so it passes contrast requirements in both appearances; the outline badge inherits the surrounding body text color.
