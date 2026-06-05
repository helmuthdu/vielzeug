# Carousel

An accessible, keyboard-navigable carousel / slideshow. Place `<bit-carousel-slide>` elements as direct children. Supports autoplay, swipe gestures, indicator dots, and prev/next navigation buttons. All state is reactive — change `slide-index` at any time to jump programmatically.

## Features

- 🖼️ **Slot-based slides** — place any `<bit-carousel-slide>` children; no JS array required
- ⌨️ **Keyboard navigation** — Arrow keys, Home, End; direction-aware (horizontal / vertical)
- 👆 **Touch/pointer swipe** — built on `createSwipeControl`; 48 px threshold by default
- 🔁 **Loop support** — wraps from last to first and vice versa (`loop`, default `true`)
- ▶️ **Autoplay** — opt-in with `autoplay`; pauses on hover and focus
- 🔘 **Progress indicators** — pill-shaped with animated fill countdown during autoplay; `role="tablist"` with per-indicator `role="tab"` and `aria-selected`
- ◀▶ **Prev / Next buttons** — `bit-button` ghost controls; accept a `color` prop for theme-aware styling; disabled automatically when looping is off and at the edge
- ♿ **Fully accessible** — `role="region"`, `aria-roledescription`, `aria-live`, `aria-hidden` on inactive slides
- 🎨 **CSS custom properties** — full theming via `--carousel-*` tokens

## Source Code

::: details View Source
<<< @/../packages/sigil/src/content/carousel/carousel.ts
:::

## Basic Usage

<ComponentPreview>

```html
<bit-carousel id="c-basic" label="Team highlights" style="height:200px">
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0f4ff;height:100%">
    Slide 1 — Alice
  </bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0fff4;height:100%">
    Slide 2 — Bob
  </bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#fff7f0;height:100%">
    Slide 3 — Carol
  </bit-carousel-slide>
</bit-carousel>
```

</ComponentPreview>

## Autoplay

Set `autoplay` to advance slides automatically. Use `autoplay-interval` to control the delay (ms). Autoplay pauses automatically when the user hovers over or focuses the carousel.

<ComponentPreview>

```html
<bit-carousel
  id="c-auto"
  label="Auto-advancing slides"
  autoplay
  autoplay-interval="2500"
  style="height:160px">
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0f4ff;height:100%">Slide A</bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0fff4;height:100%">Slide B</bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#fff7f0;height:100%">Slide C</bit-carousel-slide>
</bit-carousel>
```

</ComponentPreview>

## No Loop

Set `loop="false"` to prevent wrapping. The prev button disables at the first slide and the next button disables at the last.

<ComponentPreview>

```html
<bit-carousel id="c-noloop" label="Linear slides" loop="false" style="height:160px">
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0f4ff;height:100%">First</bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0fff4;height:100%">Middle</bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#fff7f0;height:100%">Last</bit-carousel-slide>
</bit-carousel>
```

</ComponentPreview>

## Programmatic Control

Set `slide-index` at any time to jump to a specific slide. Listen to the `change` event to track the active index.

<ComponentPreview>

```html
<div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">
  <bit-button id="c-go-0" size="sm">Slide 1</bit-button>
  <bit-button id="c-go-1" size="sm">Slide 2</bit-button>
  <bit-button id="c-go-2" size="sm">Slide 3</bit-button>
</div>
<bit-carousel id="c-prog" label="Programmatic carousel" style="height:160px">
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0f4ff;height:100%">Slide 1</bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0fff4;height:100%">Slide 2</bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#fff7f0;height:100%">Slide 3</bit-carousel-slide>
</bit-carousel>
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
<bit-carousel id="c-color" label="Colored controls" color="primary" style="height:160px">
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0f4ff;height:100%">Slide 1</bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0fff4;height:100%">Slide 2</bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#fff7f0;height:100%">Slide 3</bit-carousel-slide>
</bit-carousel>
```

</ComponentPreview>

## No Controls / No Indicators

Hide the navigation buttons or indicator dots independently.

<ComponentPreview>

```html
<bit-carousel
  id="c-minimal"
  label="Minimal carousel"
  show-controls="false"
  show-indicators="false"
  autoplay
  autoplay-interval="1800"
  style="height:140px">
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0f4ff;height:100%">One</bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0fff4;height:100%">Two</bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#fff7f0;height:100%">Three</bit-carousel-slide>
</bit-carousel>
```

</ComponentPreview>

## Vertical Orientation

Set `orientation="vertical"` to switch to a vertical layout. Arrow keys change to Up/Down.

<ComponentPreview>

```html
<bit-carousel id="c-vert" label="Vertical carousel" orientation="vertical" style="height:200px">
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0f4ff;height:100%">Top</bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#f0fff4;height:100%">Middle</bit-carousel-slide>
  <bit-carousel-slide style="display:flex;align-items:center;justify-content:center;background:#fff7f0;height:100%">Bottom</bit-carousel-slide>
</bit-carousel>
```

</ComponentPreview>

## Accessibility

The carousel implements the [ARIA Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/):

- **`role="region"`** + **`aria-roledescription="carousel"`** on the host element
- **`aria-label`** on the host — always provide a meaningful label
- **`role="group"`** + **`aria-roledescription="slide"`** on each `<bit-carousel-slide>`
- **`aria-hidden="true"`** on all inactive slides
- **`aria-live="polite"`** on the slide track — switches to `"off"` during autoplay to prevent interruptions
- **`role="tablist"`** on the indicators container; each indicator has **`role="tab"`** and **`aria-selected`**
- **`aria-label="Previous slide|Next slide"`** on navigation buttons; disabled attribute set when at boundary
- Screen-reader announcements via `announce()` on every slide change
- Autoplay **pauses on hover and focus** — respects user intent

**Keyboard interactions:**

| Key | Action |
|-----|--------|
| `ArrowRight` / `ArrowDown` | Next slide |
| `ArrowLeft` / `ArrowUp` | Previous slide |
| `Home` | First slide |
| `End` | Last slide |

Always provide a meaningful `label` attribute so screen readers can identify the carousel's purpose.

## API Reference

### Attributes / Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `color` | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | — | Theme color for the prev/next navigation buttons |
| `label` | `string` | `'Carousel'` | Accessible label for the carousel region (`aria-label`) |
| `slide-index` | `number` | `0` | Active slide index (zero-based). Reactive — can be set at any time |
| `loop` | `boolean` | `true` | Wrap from last slide to first and vice versa |
| `autoplay` | `boolean` | `false` | Advance slides automatically |
| `autoplay-interval` | `number` | `4000` | Milliseconds between automatic advances |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Slide direction and keyboard axis |
| `show-controls` | `boolean` | `true` | Show prev/next navigation buttons |
| `show-indicators` | `boolean` | `true` | Show indicator dots |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | `{ index: number }` | Fired when the active slide changes |

### CSS Custom Properties

| Property | Default | Description |
|---|---|---|
| `--carousel-min-height` | `240px` | Minimum height when no explicit height is set |
| `--carousel-bg` | `var(--color-canvas)` | Slide area background |
| `--carousel-radius` | `var(--rounded-xl)` | Border radius |
| `--carousel-dot-bg` | `var(--color-contrast-300)` | Inactive indicator color |
| `--carousel-dot-active-bg` | `var(--color-contrast-700)` | Active indicator / fill color |
| `--carousel-transition-duration` | `0.35s` | Slide transition duration |

### CSS Parts

| Part | Element | Description |
|---|---|---|
| `track` | `<div>` | The slide track / live region |
| `controls` | `<div>` | Prev/next button wrapper |
| `prev-btn` | `<bit-button>` | Previous slide button |
| `next-btn` | `<bit-button>` | Next slide button |
| `indicators` | `<div>` | Indicator dots container |
