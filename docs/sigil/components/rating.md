# Rating

A star-based rating input that lets users select a score. Supports hover preview, keyboard navigation, readonly and disabled modes, and HTML form integration.

## Features

- <sg-icon name="keyboard" size="16"></sg-icon> **Keyboard Navigation** — `←`/`→` arrows adjust value; `Home`/`End` jump to extremes
- <sg-icon name="rainbow" size="16"></sg-icon> **6 Semantic Colors** — primary, secondary, info, success, warning, error
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes** — sm, md, lg
- <sg-icon name="lock" size="16"></sg-icon> **Readonly & Disabled** — readonly shows a non-interactive score; disabled removes from tab order
- <sg-icon name="box" size="16"></sg-icon> **Solid Fill Mode** — selected stars can render as solid-filled via `solid`
- <sg-icon name="link" size="16"></sg-icon> **Form-Associated** — `name` attribute & native form `reset` support
- <sg-icon name="mouse-pointer" size="16"></sg-icon> **Hover Preview** — stars fill on hover before selection is committed

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/rating/rating.ts
:::

## Basic Usage

```html
<sg-rating label="Product rating" value="3"></sg-rating>
```

Listen for changes:

```html
<sg-rating id="rating" label="Rate this article" color="warning"></sg-rating>

<script type="module">
  document.getElementById('rating').addEventListener('change', (e) => {
    console.log('Rating:', e.detail.value);
  });
</script>
```

## Colors

<ComponentPreview center>

```html
<sg-rating value="3" color="primary"></sg-rating>
<sg-rating value="3" color="secondary"></sg-rating>
<sg-rating value="3" color="info"></sg-rating>
<sg-rating value="3" color="success"></sg-rating>
<sg-rating value="3" color="warning"></sg-rating>
<sg-rating value="3" color="error"></sg-rating>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<sg-rating value="3" color="warning" size="sm"></sg-rating>
<sg-rating value="3" color="warning" size="md"></sg-rating>
<sg-rating value="3" color="warning" size="lg"></sg-rating>
```

</ComponentPreview>

## Custom Max

<ComponentPreview center>

```html
<sg-rating value="3" max="5" color="warning"></sg-rating>
<sg-rating value="6" max="10" color="warning"></sg-rating>
<sg-rating value="2" max="3" color="success"></sg-rating>
```

</ComponentPreview>

## Readonly

Use `readonly` to display a rating without allowing user interaction — useful for showing review scores.

<ComponentPreview center>

```html
<sg-rating value="4" color="warning" readonly></sg-rating>
<sg-rating value="3" color="primary" readonly></sg-rating>
<sg-rating value="2" color="success" readonly></sg-rating>
```

</ComponentPreview>

## Solid Stars

Use `solid` to render selected stars as filled shapes instead of outline-only.

<ComponentPreview center>

```html
<sg-rating value="3" color="warning" solid></sg-rating> <sg-rating value="4" color="primary" solid></sg-rating>
```

</ComponentPreview>

## Disabled

<ComponentPreview center>

```html
<sg-rating value="3" color="warning" disabled></sg-rating>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute  | Type                                                                      | Default | Description                                  |
| ---------- | ------------------------------------------------------------------------- | ------- | -------------------------------------------- |
| `value`    | `number`                                                                  | `0`     | Current selected rating                      |
| `max`      | `number`                                                                  | `5`     | Total number of stars                        |
| `readonly` | `boolean`                                                                 | `false` | Prevents user interaction; shows value only  |
| `solid`    | `boolean`                                                                 | `false` | Fills selected stars instead of outline-only |
| `disabled` | `boolean`                                                                 | `false` | Disables the rating input                    |
| `label`    | `string`                                                                  | `'Rating'` | Accessible label for the rating group     |
| `name`     | `string`                                                                  | —       | Form field name                              |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —       | Star highlight color                         |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`  | Star size                                    |

### Events

| Event    | Detail                                        | Description                          |
| -------- | --------------------------------------------- | ------------------------------------ |
| `change` | `{ value: number; originalEvent?: Event }` | Fired when the user selects a rating |

### Parts

| Part    | Description               |
| ------- | ------------------------- |
| `stars` | Stars container element   |
| `star`  | Individual star button    |

### CSS Custom Properties

| Property                | Default                          | Description                       |
| ----------------------- | -------------------------------- | --------------------------------- |
| `--rating-star-size`    | `var(--size-7)`                  | Size of each star icon            |
| `--rating-color-empty`  | `var(--color-contrast-200)`      | Color of unselected stars         |
| `--rating-color-filled` | `var(--color-warning)` (themed)  | Color of selected / hovered stars |
| `--rating-gap`          | `var(--size-0_5)`                | Gap between stars                 |

## Accessibility

The rating component follows WCAG 2.1 Level AA standards.

### `sg-rating`

<sg-icon name="circle-check" size="16"></sg-icon> **Keyboard Navigation**

- `←` / `→` arrow keys move and commit the selection.
- `Home` / `End` jump to 1 / max; `Tab` moves focus in and out.

<sg-icon name="circle-check" size="16"></sg-icon> **Screen Readers**

- The group uses `role="radiogroup"`; each star uses `role="radio"` with `aria-checked` reflecting the current selection.
- The group `aria-label` comes from the `label` attribute (default: `'Rating'`).
- `aria-disabled` reflects the disabled state; `aria-readonly` reflects the readonly state.
- Hover previews stars visually without committing the value.

<sg-icon name="circle-check" size="16"></sg-icon> **Forced Colors**

- In `forced-colors` environments unfilled stars use `ButtonText` and filled stars use `Highlight`, ensuring visible distinction without relying on color alone.

<sg-icon name="circle-check" size="16"></sg-icon> **Reduced Motion**

- The sparkle particle animation is suppressed when `prefers-reduced-motion: reduce` is active.

## Sparkle Effect

When a user selects a star, a burst of particle sparks radiates from the chosen star. The animation uses the current filled color and respects `prefers-reduced-motion` — particles are hidden entirely when the user has requested reduced motion.

## Best Practices

**Do:**

- Always provide a `label` attribute so screen readers announce the context (e.g. `"Product rating"`).
- Use `readonly` rather than `disabled` when showing an existing score that the user cannot change — `readonly` keeps the element accessible in the reading order.
- Use colour together with label text to reinforce meaning (e.g. `color="warning"` for a gold star aesthetic).

**Don't:**

- Use rating for non-numeric preference input — a `sg-select` or `sg-radio-group` conveys options more clearly.
- Omit the `label` attribute — an unlabelled rating group is inaccessible.

## Related Components

- [Slider](./slider) — drag-based numeric value picker
