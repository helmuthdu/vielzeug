# Carousel

An accessible, keyboard-navigable carousel and slideshow. Place `<sg-carousel-slide>` children directly inside — no JS array or data binding required. Supports autoplay, swipe gestures, indicator dots, and five layout variants including continuous marquee scrolling.

## Basic Usage

Give the carousel an explicit height and a descriptive `label`. The default variant translates slides in and out horizontally. Always set a descriptive `label` — the default `"Carousel"` is not specific enough for pages with multiple carousels. Give the host an explicit height via `style` or CSS; the `--carousel-min-height` fallback (`240px`) is insufficient for `gallery` and `filmstrip` variants which distribute space flexibly.

<ComponentPreview>

```html
<sg-carousel label="Team highlights" style="height:200px">
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%">
    <sg-text color="heading">Slide 1 — Alice</sg-text>
  </sg-carousel-slide>
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%">
    <sg-text color="heading">Slide 2 — Bob</sg-text>
  </sg-carousel-slide>
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%">
    <sg-text color="heading">Slide 3 — Carol</sg-text>
  </sg-carousel-slide>
</sg-carousel>
```

</ComponentPreview>

## Autoplay

Autoplay is **off by default**. Add the `autoplay` attribute to enable timed slide advances. The timer pauses automatically when the pointer enters the carousel or any element inside receives keyboard focus, and resumes on leave.

Use `autoplay-interval` (in milliseconds, default `5000`) to control the delay. Changing `autoplay-interval` at runtime restarts the timer immediately.

Use `autoplay` only for decorative or media carousels (image galleries, hero banners). Omit it for instructional or interactive content. Do not enable `autoplay` on carousels containing forms or interactive controls — the timed advance will move content away from a user mid-interaction.

<ComponentPreview>

```html
<sg-carousel label="Auto-advancing slides" autoplay autoplay-interval="3000" style="height:160px">
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><sg-text color="heading">Slide A</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><sg-text color="heading">Slide B</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><sg-text color="heading">Slide C</sg-text></sg-carousel-slide
  >
</sg-carousel>
```

</ComponentPreview>

## No Loop

By default the carousel wraps: advancing past the last slide returns to the first. Set `loop="false"` to stop at the boundaries — the prev/next buttons disable automatically at the edges. Use `loop="false"` for wizard-style or sequential flows where step order matters.

<ComponentPreview>

```html
<sg-carousel label="Linear slides" loop="false" style="height:160px">
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><sg-text color="heading">First</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><sg-text color="heading">Middle</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><sg-text color="heading">Last</sg-text></sg-carousel-slide
  >
</sg-carousel>
```

</ComponentPreview>

## Programmatic Control

Set `slide-index` as a property at any time to jump to a specific slide (zero-based). The host element reflects the current index back on its `slide-index` attribute after every navigation. Listen to the `change` event to react to user- or autoplay-driven advances.

<ComponentPreview>

```html
<div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">
  <sg-button id="c-go-0" size="sm">Slide 1</sg-button>
  <sg-button id="c-go-1" size="sm">Slide 2</sg-button>
  <sg-button id="c-go-2" size="sm">Slide 3</sg-button>
</div>
<sg-carousel id="c-prog" label="Programmatic carousel" style="height:160px">
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><sg-text color="heading">Slide 1</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><sg-text color="heading">Slide 2</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><sg-text color="heading">Slide 3</sg-text></sg-carousel-slide
  >
</sg-carousel>
<script>
  const c = document.getElementById('c-prog');
  [0, 1, 2].forEach((i) => {
    document.getElementById(`c-go-${i}`).addEventListener('click', () => {
      c['slide-index'] = i;
    });
  });
  c.addEventListener('change', (e) => console.log('Active index:', e.detail.index));
</script>
```

</ComponentPreview>

## Button Color

Pass `color` to theme the prev/next navigation buttons with any design-system color token.

<ComponentPreview>

```html
<sg-carousel label="Colored controls" color="primary" style="height:160px">
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><sg-text color="heading">Slide 1</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><sg-text color="heading">Slide 2</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><sg-text color="heading">Slide 3</sg-text></sg-carousel-slide
  >
</sg-carousel>
```

</ComponentPreview>

## No Controls / No Indicators

`show-controls` and `show-indicators` are independent. Set either to `"false"` to hide it.

<ComponentPreview>

```html
<sg-carousel
  label="Minimal carousel"
  show-controls="false"
  show-indicators="false"
  autoplay
  autoplay-interval="1800"
  style="height:140px">
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><sg-text color="heading">One</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><sg-text color="heading">Two</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><sg-text color="heading">Three</sg-text></sg-carousel-slide
  >
</sg-carousel>
```

</ComponentPreview>

## Vertical Orientation

Add `orientation="vertical"` to any variant. Slides transition top/bottom, arrow keys swap to Up/Down, indicators move to the left edge, and nav buttons group at the right-center edge.

<ComponentPreview>

```html
<sg-carousel label="Vertical carousel" orientation="vertical" style="height:240px;width:320px">
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><sg-text color="heading">Top</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><sg-text color="heading">Middle</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><sg-text color="heading">Bottom</sg-text></sg-carousel-slide
  >
</sg-carousel>
```

</ComponentPreview>

## Variants

The `variant` attribute switches the slide layout and transition style. All variants support `orientation="vertical"`.

### Fade

Slides crossfade in-place — no lateral movement. Use for image-heavy content where translation motion may be distracting.

<ComponentPreview>

```html
<sg-carousel label="Fade carousel" variant="fade" style="height:200px">
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><sg-text color="heading">Slide 1</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><sg-text color="heading">Slide 2</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><sg-text color="heading">Slide 3</sg-text></sg-carousel-slide
  >
</sg-carousel>
```

</ComponentPreview>

### Filmstrip

All slides are visible simultaneously. The active slide expands to fill the remaining space; inactive slides collapse to `--carousel-filmstrip-inactive` (default `var(--size-16)`).

<ComponentPreview>

```html
<sg-carousel label="Filmstrip carousel" variant="filmstrip" style="height:200px">
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><sg-text color="heading">Slide 1</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200)"
    ><sg-text color="heading">Slide 2</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300)"
    ><sg-text color="heading">Slide 3</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><sg-text color="heading">Slide 4</sg-text></sg-carousel-slide
  >
</sg-carousel>
```

</ComponentPreview>

#### Vertical Filmstrip

<ComponentPreview>

```html
<sg-carousel label="Vertical filmstrip" variant="filmstrip" orientation="vertical" style="height:300px;width:320px">
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><sg-text color="heading">Top</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200)"
    ><sg-text color="heading">Middle</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300)"
    ><sg-text color="heading">Bottom</sg-text></sg-carousel-slide
  >
</sg-carousel>
```

</ComponentPreview>

### Gallery

The active slide dominates (~4× the size of thumbnails); the immediately adjacent slides show as thumbnails. Slides beyond the adjacent pair are hidden. Thumbnail size is controlled by `--carousel-gallery-thumbnail`.

<ComponentPreview>

```html
<sg-carousel label="Gallery carousel" variant="gallery" style="height:200px">
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><sg-text color="heading">Slide 1</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200)"
    ><sg-text color="heading">Slide 2</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300)"
    ><sg-text color="heading">Slide 3</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><sg-text color="heading">Slide 4</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200)"
    ><sg-text color="heading">Slide 5</sg-text></sg-carousel-slide
  >
</sg-carousel>
```

</ComponentPreview>

#### Vertical Gallery

<ComponentPreview>

```html
<sg-carousel label="Vertical gallery" variant="gallery" orientation="vertical" style="height:360px;width:320px">
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><sg-text color="heading">Slide 1</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200)"
    ><sg-text color="heading">Slide 2</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300)"
    ><sg-text color="heading">Slide 3</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><sg-text color="heading">Slide 4</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200)"
    ><sg-text color="heading">Slide 5</sg-text></sg-carousel-slide
  >
</sg-carousel>
```

</ComponentPreview>

### Marquee

A continuously scrolling ticker. Slides are cloned internally to create a seamless loop. Scrolling pauses on `pointerenter` and resumes on `pointerleave`. Use `marquee-duration` (seconds, default `10`) to control speed — lower values scroll faster.

Set `loop="false"` to run the animation once then stop. Controls and indicators are shown by default and work the same as other variants.

Set an explicit `width` on each slide in `marquee` mode so the seamless loop transition point is predictable. Do not use the `marquee` variant for content that users need to read carefully; the continuous motion is unsuitable for anything requiring sustained attention.

::: warning Marquee and motion sensitivity
Even with `prefers-reduced-motion` support, the marquee variant still presents rapidly-changing content that can be distracting. Consider hiding the `marquee` variant entirely for users with motion sensitivity who may not have the OS preference set.
:::

<ComponentPreview>

```html
<sg-carousel label="Marquee ticker" variant="marquee" marquee-duration="20" style="height:120px">
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);width:200px"
    ><sg-text color="heading">Item A</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);width:200px"
    ><sg-text color="heading">Item B</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);width:200px"
    ><sg-text color="heading">Item C</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);width:200px"
    ><sg-text color="heading">Item D</sg-text></sg-carousel-slide
  >
</sg-carousel>
```

</ComponentPreview>

#### Vertical Marquee

Add `orientation="vertical"` for a top-to-bottom ticker. Set an explicit `height` on each slide to control row size.

<ComponentPreview>

```html
<sg-carousel
  label="Vertical marquee"
  variant="marquee"
  orientation="vertical"
  marquee-duration="12"
  style="height:300px;width:240px">
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:180px"
    ><sg-text color="heading">Item A</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:180px"
    ><sg-text color="heading">Item B</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:180px"
    ><sg-text color="heading">Item C</sg-text></sg-carousel-slide
  >
  <sg-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:180px"
    ><sg-text color="heading">Item D</sg-text></sg-carousel-slide
  >
</sg-carousel>
```

</ComponentPreview>

## Keyboard Navigation

| Key                        | Action         |
| -------------------------- | -------------- |
| `ArrowRight` / `ArrowDown` | Next slide     |
| `ArrowLeft` / `ArrowUp`    | Previous slide |
| `Home`                     | First slide    |
| `End`                      | Last slide     |

Arrow key direction adjusts automatically for `orientation="vertical"`. When `loop="false"`, navigation stops at the boundaries.

## API Reference

**`sg-carousel` Attributes / Properties**

| Name                | Type                                                                      | Default        | Description                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`             | `string`                                                                  | `'Carousel'`   | `aria-label` for the `role="region"` landmark                                                                                                                                                                   |
| `variant`           | `'default' \| 'fade' \| 'filmstrip' \| 'gallery' \| 'marquee'`            | `'default'`    | Layout and transition style                                                                                                                                                                                     |
| `orientation`       | `'horizontal' \| 'vertical'`                                              | `'horizontal'` | Slide direction and keyboard axis                                                                                                                                                                               |
| `slide-index`       | `number`                                                                  | `0`            | Active slide (zero-based). Writable at any time; reflected as an attribute after navigation                                                                                                                     |
| `loop`              | `boolean`                                                                 | `true`         | Wrap last→first and first→last. In `marquee` mode controls animation repeat (loop indefinitely vs. play once) — navigation always loops in marquee. Setting `loop="false"` on marquee emits a dev-mode warning. |
| `autoplay`          | `boolean`                                                                 | `false`        | Advance slides on a timer; pauses on hover and focus                                                                                                                                                            |
| `autoplay-interval` | `number`                                                                  | `5000`         | Milliseconds between automatic advances; reactive — changing it restarts the timer                                                                                                                              |
| `marquee-duration`  | `number`                                                                  | `10`           | Duration in seconds for one full marquee cycle; lower = faster                                                                                                                                                  |
| `color`             | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —              | Theme color for prev/next navigation buttons                                                                                                                                                                    |
| `show-controls`     | `boolean`                                                                 | `true`         | Show prev/next navigation buttons                                                                                                                                                                               |
| `show-indicators`   | `boolean`                                                                 | `true`         | Show indicator dot navigation                                                                                                                                                                                   |

**`sg-carousel` Events**

| Event    | Detail              | Description                                            |
| -------- | ------------------- | ------------------------------------------------------ |
| `change` | `{ index: number }` | Fired on every slide change (user- or autoplay-driven) |

**`sg-carousel` CSS Custom Properties**

| Property                         | Default                     | Description                                                                                                                                      |
| -------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--carousel-bg`                  | `var(--color-canvas)`       | Slide area background                                                                                                                            |
| `--carousel-radius`              | `var(--rounded-xl)`         | Host border radius                                                                                                                               |
| `--carousel-min-height`          | `240px`                     | Fallback minimum height — set an explicit height for `filmstrip` and `gallery`                                                                   |
| `--carousel-transition-duration` | `0.35s`                     | Slide transition duration (`default` and `fade`); also controls marquee seek animation duration. Auto-set to `0s` under `prefers-reduced-motion` |
| `--carousel-dot-bg`              | `var(--color-contrast-300)` | Inactive indicator dot color                                                                                                                     |
| `--carousel-dot-active-bg`       | `var(--color-contrast-700)` | Active indicator fill color                                                                                                                      |
| `--carousel-filmstrip-inactive`  | `var(--size-16)`            | Collapsed width (horizontal) or height (vertical) of inactive filmstrip slides                                                                   |
| `--carousel-filmstrip-gap`       | `var(--size-2)`             | Gap between slides in `filmstrip` mode                                                                                                           |
| `--carousel-gallery-thumbnail`   | `var(--size-24)`            | Thumbnail width (horizontal) or height (vertical) in `gallery` mode                                                                              |
| `--carousel-gallery-gap`         | `var(--size-2)`             | Gap between slides in `gallery` mode                                                                                                             |
| `--carousel-marquee-gap`         | `var(--size-4)`             | Gap between slides in `marquee` mode                                                                                                             |

**`sg-carousel` CSS Parts**

| Part         | Element       | Description                                   |
| ------------ | ------------- | --------------------------------------------- |
| `track`      | `<div>`       | The slide track — also the `aria-live` region |
| `controls`   | `<div>`       | Prev/next button wrapper                      |
| `prev-btn`   | `<sg-button>` | Previous-slide button                         |
| `next-btn`   | `<sg-button>` | Next-slide button                             |
| `indicators` | `<div>`       | Indicator `tablist` container                 |

**`sg-carousel-slide`**

A transparent wrapper. It carries `role="group"` and `aria-roledescription="slide"` automatically. No public attributes or properties — all attributes below are set by `sg-carousel` to drive CSS layout and should not be set manually.

| Attribute              | Set by        | Description                                                                |
| ---------------------- | ------------- | -------------------------------------------------------------------------- |
| `data-variant`         | `sg-carousel` | Mirrors the parent `variant` value                                         |
| `data-orientation`     | `sg-carousel` | Mirrors the parent `orientation` value                                     |
| `data-active`          | `sg-carousel` | Present on the currently active slide                                      |
| `data-before`          | `sg-carousel` | Present on slides before the active one (`default` / `fade` variants)      |
| `data-after`           | `sg-carousel` | Present on slides after the active one (`default` / `fade` variants)       |
| `data-gallery-visible` | `sg-carousel` | Present on the active slide and its immediate neighbours in `gallery` mode |

## Accessibility

The carousel follows the [ARIA Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).

The host carries `role="region"` and `aria-roledescription="carousel"`. Each `<sg-carousel-slide>` has `role="group"` and `aria-roledescription="slide"`. Inactive slides receive `aria-hidden="true"`; each slide's `aria-label` is auto-set to `"Slide N of M"` if not provided. The track uses `aria-live="polite"`, which switches to `"off"` during autoplay so timed advances don't trigger screen reader speech. Prev/next buttons carry `aria-label="Previous slide"` and `aria-label="Next slide"` respectively; `disabled` is set at boundaries when `loop="false"`. The indicators container has `role="tablist"` with each dot carrying `role="tab"` and `aria-selected`. An internal `announce()` helper fires a screen-reader announcement on every slide change.

When `autoplay` is on, the timer stops on `focusin` or `pointerenter` so keyboard and pointer users can read slide content uninterrupted, and restarts on `focusout` or `pointerleave`.

The carousel responds to `prefers-reduced-motion: reduce` automatically: `--carousel-transition-duration` is set to `0s`, eliminating slide translation and fade transitions, and the marquee CSS animation is disabled entirely.

::: tip Always set `label`
The `label` attribute becomes the `aria-label` of the `role="region"` landmark. Without it, the region is announced as `"Carousel"` — too generic when a page has multiple carousels.
:::
