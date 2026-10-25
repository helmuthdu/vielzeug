# Carousel

An accessible, keyboard-navigable carousel and slideshow. Place `<ore-carousel-slide>` children directly inside: no JS array or data binding required. Supports autoplay, swipe gestures, indicator dots, and five layout variants.

## Basic Usage

Give the carousel an explicit height and a descriptive `label`. The default variant translates slides in and out horizontally. Always set a descriptive `label`: the default `"Carousel"` is not specific enough for pages with multiple carousels. Give the host an explicit height via `style` or CSS; the `--carousel-min-height` fallback (`240px`) is insufficient for `gallery` and `filmstrip` variants which distribute space flexibly.

<ComponentPreview>

```html
<ore-carousel label="Team highlights" style="height:200px">
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%">
    <ore-text color="heading">Slide 1: Alice</ore-text>
  </ore-carousel-slide>
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%">
    <ore-text color="heading">Slide 2: Bob</ore-text>
  </ore-carousel-slide>
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%">
    <ore-text color="heading">Slide 3: Carol</ore-text>
  </ore-carousel-slide>
</ore-carousel>
```

</ComponentPreview>

## Autoplay

Autoplay is **off by default**. Add the `autoplay` attribute to enable timed slide advances. The timer pauses automatically when the pointer enters the carousel or any element inside receives keyboard focus, and resumes on leave.

Use `autoplay-interval` (in milliseconds, default `5000`) to control the delay. Changing `autoplay-interval` at runtime restarts the timer immediately.

Use `autoplay` only for decorative or media carousels (image galleries, hero banners). Omit it for instructional or interactive content. Do not enable `autoplay` on carousels containing forms or interactive controls: the timed advance will move content away from a user mid-interaction.

<ComponentPreview>

```html
<ore-carousel label="Auto-advancing slides" autoplay autoplay-interval="3000" style="height:160px">
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><ore-text color="heading">Slide A</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><ore-text color="heading">Slide B</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><ore-text color="heading">Slide C</ore-text></ore-carousel-slide
  >
</ore-carousel>
```

</ComponentPreview>

## No Loop

By default the carousel wraps: advancing past the last slide returns to the first. Set `loop="false"` to stop at the boundaries: the prev/next buttons disable automatically at the edges. Use `loop="false"` for wizard-style or sequential flows where step order matters.

<ComponentPreview>

```html
<ore-carousel label="Linear slides" loop="false" style="height:160px">
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><ore-text color="heading">First</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><ore-text color="heading">Middle</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><ore-text color="heading">Last</ore-text></ore-carousel-slide
  >
</ore-carousel>
```

</ComponentPreview>

## Programmatic Control

Set `slide-index` as a property at any time to jump to a specific slide (zero-based). The host element reflects the current index back on its `slide-index` attribute after every navigation. Listen to the `change` event to react to user- or autoplay-driven advances.

<ComponentPreview>

```html
<div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">
  <ore-button id="c-go-0" size="sm">Slide 1</ore-button>
  <ore-button id="c-go-1" size="sm">Slide 2</ore-button>
  <ore-button id="c-go-2" size="sm">Slide 3</ore-button>
</div>
<ore-carousel id="c-prog" label="Programmatic carousel" style="height:160px">
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><ore-text color="heading">Slide 1</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><ore-text color="heading">Slide 2</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><ore-text color="heading">Slide 3</ore-text></ore-carousel-slide
  >
</ore-carousel>
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
<ore-carousel label="Colored controls" color="primary" style="height:160px">
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><ore-text color="heading">Slide 1</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><ore-text color="heading">Slide 2</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><ore-text color="heading">Slide 3</ore-text></ore-carousel-slide
  >
</ore-carousel>
```

</ComponentPreview>

## No Controls / No Indicators

`show-controls` and `show-indicators` are independent. Set either to `"false"` to hide it.

<ComponentPreview>

```html
<ore-carousel
  label="Minimal carousel"
  show-controls="false"
  show-indicators="false"
  autoplay
  autoplay-interval="1800"
  style="height:140px">
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><ore-text color="heading">One</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><ore-text color="heading">Two</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><ore-text color="heading">Three</ore-text></ore-carousel-slide
  >
</ore-carousel>
```

</ComponentPreview>

## Vertical Orientation

Add `orientation="vertical"` to any variant. Slides transition top/bottom, arrow keys swap to Up/Down, indicators move to the left edge, and nav buttons group at the right-center edge.

<ComponentPreview>

```html
<ore-carousel label="Vertical carousel" orientation="vertical" style="height:240px;width:320px">
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><ore-text color="heading">Top</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><ore-text color="heading">Middle</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><ore-text color="heading">Bottom</ore-text></ore-carousel-slide
  >
</ore-carousel>
```

</ComponentPreview>

## Variants

The `variant` attribute switches the slide layout and transition style. All variants support `orientation="vertical"`.

### Fade

Slides crossfade in-place: no lateral movement. Use for image-heavy content where translation motion may be distracting.

<ComponentPreview>

```html
<ore-carousel label="Fade carousel" variant="fade" style="height:200px">
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:100%"
    ><ore-text color="heading">Slide 1</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:100%"
    ><ore-text color="heading">Slide 2</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:100%"
    ><ore-text color="heading">Slide 3</ore-text></ore-carousel-slide
  >
</ore-carousel>
```

</ComponentPreview>

### Filmstrip

All slides are visible simultaneously. The active slide expands to fill the remaining space; inactive slides collapse to `--carousel-filmstrip-inactive` (default `var(--size-16)`).

<ComponentPreview>

```html
<ore-carousel label="Filmstrip carousel" variant="filmstrip" style="height:200px">
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><ore-text color="heading">Slide 1</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200)"
    ><ore-text color="heading">Slide 2</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300)"
    ><ore-text color="heading">Slide 3</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><ore-text color="heading">Slide 4</ore-text></ore-carousel-slide
  >
</ore-carousel>
```

</ComponentPreview>

#### Vertical Filmstrip

<ComponentPreview>

```html
<ore-carousel label="Vertical filmstrip" variant="filmstrip" orientation="vertical" style="height:300px;width:320px">
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><ore-text color="heading">Top</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200)"
    ><ore-text color="heading">Middle</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300)"
    ><ore-text color="heading">Bottom</ore-text></ore-carousel-slide
  >
</ore-carousel>
```

</ComponentPreview>

### Gallery

The active slide dominates (~4× the size of thumbnails); the immediately adjacent slides show as thumbnails. Slides beyond the adjacent pair are hidden. Thumbnail size is controlled by `--carousel-gallery-thumbnail`.

<ComponentPreview>

```html
<ore-carousel label="Gallery carousel" variant="gallery" style="height:200px">
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><ore-text color="heading">Slide 1</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200)"
    ><ore-text color="heading">Slide 2</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300)"
    ><ore-text color="heading">Slide 3</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><ore-text color="heading">Slide 4</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200)"
    ><ore-text color="heading">Slide 5</ore-text></ore-carousel-slide
  >
</ore-carousel>
```

</ComponentPreview>

#### Vertical Gallery

<ComponentPreview>

```html
<ore-carousel label="Vertical gallery" variant="gallery" orientation="vertical" style="height:360px;width:320px">
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><ore-text color="heading">Slide 1</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200)"
    ><ore-text color="heading">Slide 2</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300)"
    ><ore-text color="heading">Slide 3</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100)"
    ><ore-text color="heading">Slide 4</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200)"
    ><ore-text color="heading">Slide 5</ore-text></ore-carousel-slide
  >
</ore-carousel>
```

</ComponentPreview>

### Coverflow

The active card stays centered while neighboring cards overlap with bounded rotation, scale, and depth. The number of previews fits the **carousel's container**, not the viewport or a fixed count: wider containers admit more cards without changing the active card's size. A narrow container can show only the active card. Covers outside the fitted range are hidden and cannot intercept clicks.

Navigation occupies a separate area below horizontal coverflow or beside vertical coverflow, rather than covering the cards. All carousel variants use fully rounded previous/next buttons to match the navigation pill.

Set `--carousel-coverflow-size` to the card width and `--carousel-coverflow-spacing` to the distance between card centers. Use positive CSS lengths; smaller spacing increases overlap. Card backgrounds, imagery, captions, and active treatments remain your content's responsibility. You do not need transforms, resize handlers, or app-level hit-testing.

These square covers use the same centered labels and contrast backgrounds as the other variants. Resize the containing panel to change the number of visible covers:

<ComponentPreview>

```html
<ore-carousel
  label="Coverflow carousel"
  variant="coverflow"
  style="height:var(--size-72);--carousel-coverflow-size:var(--size-40);--carousel-coverflow-spacing:var(--size-12)">
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:auto;aspect-ratio:1;border-radius:var(--rounded-lg)"
    ><ore-text color="heading">Slide 1</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:auto;aspect-ratio:1;border-radius:var(--rounded-lg)"
    ><ore-text color="heading">Slide 2</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:auto;aspect-ratio:1;border-radius:var(--rounded-lg)"
    ><ore-text color="heading">Slide 3</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:auto;aspect-ratio:1;border-radius:var(--rounded-lg)"
    ><ore-text color="heading">Slide 4</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:auto;aspect-ratio:1;border-radius:var(--rounded-lg)"
    ><ore-text color="heading">Slide 5</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:auto;aspect-ratio:1;border-radius:var(--rounded-lg)"
    ><ore-text color="heading">Slide 6</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:auto;aspect-ratio:1;border-radius:var(--rounded-lg)"
    ><ore-text color="heading">Slide 7</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:auto;aspect-ratio:1;border-radius:var(--rounded-lg)"
    ><ore-text color="heading">Slide 8</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:auto;aspect-ratio:1;border-radius:var(--rounded-lg)"
    ><ore-text color="heading">Slide 9</ore-text></ore-carousel-slide
  >
</ore-carousel>
```

</ComponentPreview>

Clicking or tapping a visible preview activates it through the same `change` event as swipes, controls, and keyboard navigation. Only the active slide's content is interactive: clicking a preview does **not** activate a link or button within it. Clicking an already active slide leaves the index unchanged and allows its controls to work normally.

With `loop="true"`, the closest circular neighbors appear on either side; each slide appears once, including in two-item and even-sized collections. With `loop="false"`, previews do not wrap across the collection's ends. Resizing changes only layout: it does not change the active index, emit `change`, or move focus.

For `orientation="vertical"`, `--carousel-coverflow-size` sets the card height, spacing advances vertically, and the available track height determines the preview count. Give the host an explicit height.

#### Cover selection

Keep domain selection in your app and map the carousel's index to an item ID. The component never loads media or initiates playback. Leave autoplay off for pickers.

<ComponentPreview>

```html
<ore-carousel
  id="cover-picker"
  label="Choose a cover"
  variant="coverflow"
  show-controls="false"
  show-indicators="false"
  style="height:var(--size-56)">
  <ore-carousel-slide
    aria-label="Dawn"
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);height:auto;aspect-ratio:1;border-radius:var(--rounded-lg)"
    ><ore-text color="heading">Dawn</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    aria-label="Dusk"
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);height:auto;aspect-ratio:1;border-radius:var(--rounded-lg)"
    ><ore-text color="heading">Dusk</ore-text></ore-carousel-slide
  >
  <ore-carousel-slide
    aria-label="Night"
    style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);height:auto;aspect-ratio:1;border-radius:var(--rounded-lg)"
    ><ore-text color="heading">Night</ore-text></ore-carousel-slide
  >
</ore-carousel>
<ore-text id="cover-choice" aria-live="polite">Selected: Dawn</ore-text>
<script>
  const covers = ['Dawn', 'Dusk', 'Night'];
  document.getElementById('cover-picker').addEventListener('change', (event) => {
    document.getElementById('cover-choice').textContent = `Selected: ${covers[event.detail.index]}`;
  });
</script>
```

</ComponentPreview>

Coverflow adds `tabindex="0"` to the host when you have not supplied one, so keyboard navigation remains available even with controls and indicators hidden. It respects an explicit `tabindex`. Inactive content is inert and hidden from assistive technology; the host and navigation controls provide access to every cover. When navigation hides focused slide content, focus moves back to the carousel.

## Keyboard Navigation

| Key                        | Action         |
| -------------------------- | -------------- |
| `ArrowRight` / `ArrowDown` | Next slide     |
| `ArrowLeft` / `ArrowUp`    | Previous slide |
| `Home`                     | First slide    |
| `End`                      | Last slide     |

Arrow key direction adjusts automatically for `orientation="vertical"`. When `loop="false"`, navigation stops at the boundaries.

Horizontal coverflow mirrors layout and Left/Right navigation for `dir="rtl"`. Arrow keys in editable slide content keep their native behavior instead of changing covers.

## API Reference

**`ore-carousel` Attributes / Properties**

| Name                | Type                                                                      | Default        | Description                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`             | `string`                                                                  | `'Carousel'`   | `aria-label` for the `role="region"` landmark                                                                                                                                                                   |
| `variant`           | `'default' \| 'fade' \| 'filmstrip' \| 'gallery' \| 'coverflow'`             | `'default'`    | Layout and transition style                                                                                                                                                                                     |
| `orientation`       | `'horizontal' \| 'vertical'`                                              | `'horizontal'` | Slide direction and keyboard axis                                                                                                                                                                               |
| `slide-index`       | `number`                                                                  | `0`            | Active slide (zero-based). Writable at any time; reflected as an attribute after navigation                                                                                                                     |
| `loop`              | `boolean`                                                                 | `true`         | Wrap last→first and first→last.                                                                                                                                                                                 |
| `autoplay`          | `boolean`                                                                 | `false`        | Advance slides on a timer; pauses on hover and focus                                                                                                                                                            |
| `autoplay-interval` | `number`                                                                  | `5000`         | Milliseconds between automatic advances; reactive: changing it restarts the timer                                                                                                                              |
| `color`             | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | N/A | Theme color for prev/next navigation buttons                                                                                                                                                                    |
| `show-controls`     | `boolean`                                                                 | `true`         | Show prev/next navigation buttons                                                                                                                                                                               |
| `show-indicators`   | `boolean`                                                                 | `true`         | Show indicator dot navigation                                                                                                                                                                                   |

**`ore-carousel` Events**

| Event    | Detail              | Description                                            |
| -------- | ------------------- | ------------------------------------------------------ |
| `change` | `{ index: number }` | Fired on every slide change (user- or autoplay-driven) |

**`ore-carousel` CSS Custom Properties**

| Property                         | Default                     | Description                                                                                                                                      |
| -------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--carousel-bg`                  | `var(--color-canvas)`       | Slide area background                                                                                                                            |
| `--carousel-radius`              | `var(--rounded-xl)`         | Host border radius                                                                                                                               |
| `--carousel-min-height`          | `240px`                     | Fallback minimum height: set an explicit height for `filmstrip` and `gallery`                                                                   |
| `--carousel-transition-duration` | `var(--duration-350)`       | Slide transition duration, including coverflow. Zeroes under Motion Mode (see [Theming → Motion Mode](/refine/theming#motion-mode)) |
| `--carousel-dot-bg`              | `var(--color-contrast-300)` | Inactive indicator dot color                                                                                                                     |
| `--carousel-dot-active-bg`       | `var(--color-contrast-700)` | Active indicator fill color                                                                                                                      |
| `--carousel-filmstrip-inactive`  | `var(--size-16)`            | Collapsed width (horizontal) or height (vertical) of inactive filmstrip slides                                                                   |
| `--carousel-filmstrip-gap`       | `var(--size-2)`             | Gap between slides in `filmstrip` mode                                                                                                           |
| `--carousel-gallery-thumbnail`   | `var(--size-24)`            | Thumbnail width (horizontal) or height (vertical) in `gallery` mode                                                                              |
| `--carousel-gallery-gap`         | `var(--size-2)`             | Gap between slides in `gallery` mode                                                                                                             |
| `--carousel-coverflow-size`      | `var(--size-40)`            | Card width (horizontal) or height (vertical), constrained by available track space |
| `--carousel-coverflow-spacing`   | `var(--size-12)`            | Positive CSS length between neighboring card centers; controls overlap and fitted preview count |
| `--carousel-coverflow-perspective` | `calc(var(--size-64) * 4)` | Perspective distance for coverflow depth |

**`ore-carousel` CSS Parts**

| Part         | Element       | Description                                   |
| ------------ | ------------- | --------------------------------------------- |
| `track`      | `<div>`       | The slide track: also the `aria-live` region |
| `controls`   | `<div>`       | Prev/next button wrapper                      |
| `prev-btn`   | `<ore-button>` | Previous-slide button                         |
| `next-btn`   | `<ore-button>` | Next-slide button                             |
| `indicators` | `<div>`       | Navigation bar containing the indicator `tablist` and controls |

**`ore-carousel-slide`**

A transparent wrapper. It carries `role="group"` and `aria-roledescription="slide"` automatically. No public attributes or properties: all attributes below are set by `ore-carousel` to drive CSS layout and should not be set manually.

| Attribute              | Set by        | Description                                                                |
| ---------------------- | ------------- | -------------------------------------------------------------------------- |
| `data-variant`         | `ore-carousel` | Mirrors the parent `variant` value                                         |
| `data-orientation`     | `ore-carousel` | Mirrors the parent `orientation` value                                     |
| `data-active`          | `ore-carousel` | Present on the currently active slide                                      |
| `data-before`          | `ore-carousel` | Present on slides before the active one (`default` / `fade` variants)      |
| `data-after`           | `ore-carousel` | Present on slides after the active one (`default` / `fade` variants)       |
| `data-gallery-visible` | `ore-carousel` | Present on the active slide and its immediate neighbours in `gallery` mode |
| `data-coverflow-visible` | `ore-carousel` | Present on the active slide and container-fitted previews in `coverflow` mode |

## Touch and drag navigation

Swipe or drag slide content at least 48 CSS pixels along the carousel's orientation, then release to change the active slide. The carousel emits the same `change` event as its navigation buttons, including when the gesture starts on a button or image inside a slide. Cancelled gestures and shorter drags do not change slides.

Horizontal carousels preserve vertical page scrolling; vertical carousels preserve horizontal scrolling. Both allow pinch zoom. The carousel's own controls and indicators do not start swipes.

After a drag activates, its pointer-generated click is suppressed so a cover picker or other clickable slide does not select an unintended item. Taps and keyboard activation still work. You do not need app-level touch handlers.

## Accessibility

The carousel follows the [ARIA Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).

The host carries `role="region"` and `aria-roledescription="carousel"`. Each `<ore-carousel-slide>` has `role="group"` and `aria-roledescription="slide"`. Inactive slides receive `aria-hidden="true"`; each slide's `aria-label` is auto-set to `"Slide N of M"` if not provided. The track uses `aria-live="polite"`, which switches to `"off"` during autoplay so timed advances don't trigger screen reader speech. Prev/next buttons carry `aria-label="Previous slide"` and `aria-label="Next slide"` respectively; `disabled` is set at boundaries when `loop="false"`. The indicators container has `role="tablist"` with each dot carrying `role="tab"` and `aria-selected`. An internal `announce()` helper fires a screen-reader announcement on every slide change.

When `autoplay` is on, the timer stops on `focusin` or `pointerenter` so keyboard and pointer users can read slide content uninterrupted, and restarts on `focusout` or `pointerleave`.

Slide motion follows Motion Mode: `--carousel-transition-duration` defaults to `var(--duration-350)`, which zeroes under `prefers-reduced-motion` and under `data-motion="reduced"` (slides change instantly), and stays 350ms when the app opts back in with `data-motion="full"`.

::: tip Always set `label`
The `label` attribute becomes the `aria-label` of the `role="region"` landmark. Without it, the region is announced as `"Carousel"`: too generic when a page has multiple carousels.
:::
