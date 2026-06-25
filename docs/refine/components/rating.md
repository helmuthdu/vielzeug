# Rating

A star-based rating input that lets users select a score. Supports hover preview, keyboard navigation, readonly and disabled modes, and HTML form integration.

## Basic Usage

```html
<ore-rating label="Product rating" value="3"></ore-rating>
```

Listen for changes:

```html
<ore-rating id="rating" label="Rate this article" color="warning"></ore-rating>

<script type="module">
  document.getElementById('rating').addEventListener('change', (e) => {
    console.log('Rating:', e.detail.value);
  });
</script>
```

## Colors

<ComponentPreview center>

```html
<ore-rating value="3" color="primary"></ore-rating>
<ore-rating value="3" color="secondary"></ore-rating>
<ore-rating value="3" color="info"></ore-rating>
<ore-rating value="3" color="success"></ore-rating>
<ore-rating value="3" color="warning"></ore-rating>
<ore-rating value="3" color="error"></ore-rating>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<ore-rating value="3" color="warning" size="sm"></ore-rating>
<ore-rating value="3" color="warning" size="md"></ore-rating>
<ore-rating value="3" color="warning" size="lg"></ore-rating>
```

</ComponentPreview>

## Custom Max

<ComponentPreview center>

```html
<ore-rating value="3" max="5" color="warning"></ore-rating>
<ore-rating value="6" max="10" color="warning"></ore-rating>
<ore-rating value="2" max="3" color="success"></ore-rating>
```

</ComponentPreview>

## Readonly

Use `readonly` to display a rating without allowing user interaction — useful for showing review scores. Prefer `readonly` over `disabled` when showing an existing score the user cannot change, as `readonly` keeps the element in the reading order.

<ComponentPreview center>

```html
<ore-rating value="4" color="warning" readonly></ore-rating>
<ore-rating value="3" color="primary" readonly></ore-rating>
<ore-rating value="2" color="success" readonly></ore-rating>
```

</ComponentPreview>

## Solid Stars

Use `solid` to render selected stars as filled shapes instead of outline-only.

<ComponentPreview center>

```html
<ore-rating value="3" color="warning" solid></ore-rating> <ore-rating value="4" color="primary" solid></ore-rating>
```

</ComponentPreview>

## Disabled

<ComponentPreview center>

```html
<ore-rating value="3" color="warning" disabled></ore-rating>
```

</ComponentPreview>

## Sparkle Effect

When a user selects a star, a burst of particle sparks radiates from the chosen star. The animation uses the current filled color and respects `prefers-reduced-motion` — particles are hidden entirely when the user has requested reduced motion.

## API Reference

### Attributes

| Attribute  | Type                                                                      | Default    | Description                                  |
| ---------- | ------------------------------------------------------------------------- | ---------- | -------------------------------------------- |
| `value`    | `number`                                                                  | `0`        | Current selected rating                      |
| `max`      | `number`                                                                  | `5`        | Total number of stars                        |
| `readonly` | `boolean`                                                                 | `false`    | Prevents user interaction; shows value only  |
| `solid`    | `boolean`                                                                 | `false`    | Fills selected stars instead of outline-only |
| `disabled` | `boolean`                                                                 | `false`    | Disables the rating input                    |
| `label`    | `string`                                                                  | `'Rating'` | Accessible label for the rating group. Always provide a meaningful value (e.g. `"Product rating"`) so screen readers announce the context. |
| `name`     | `string`                                                                  | —          | Form field name                              |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —          | Star highlight color                         |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`     | Star size                                    |

### Events

| Event    | Detail                                     | Description                          |
| -------- | ------------------------------------------ | ------------------------------------ |
| `change` | `{ value: number; originalEvent?: Event }` | Fired when the user selects a rating |

### Parts

| Part    | Description             |
| ------- | ----------------------- |
| `stars` | Stars container element |
| `star`  | Individual star button  |

### CSS Custom Properties

| Property                | Default                         | Description                       |
| ----------------------- | ------------------------------- | --------------------------------- |
| `--rating-star-size`    | `var(--size-7)`                 | Size of each star icon            |
| `--rating-color-empty`  | `var(--color-contrast-200)`     | Color of unselected stars         |
| `--rating-color-filled` | `var(--color-warning)` (themed) | Color of selected / hovered stars |
| `--rating-gap`          | `var(--size-0_5)`               | Gap between stars                 |

## Accessibility

The rating component follows WCAG 2.1 Level AA standards.

The group uses `role="radiogroup"` and each star uses `role="radio"` with `aria-checked` reflecting the current selection. The group `aria-label` is set from the `label` attribute (default: `'Rating'`). `aria-disabled` reflects the disabled state and `aria-readonly` reflects the readonly state. Hover previews stars visually without committing the value.

Keyboard navigation is fully supported: `←` / `→` arrow keys move and commit the selection; `Home` / `End` jump to 1 / max; `Tab` moves focus in and out.

In `forced-colors` environments unfilled stars use `ButtonText` and filled stars use `Highlight`, ensuring visible distinction without relying on color alone. The sparkle particle animation is suppressed when `prefers-reduced-motion: reduce` is active.

## Related Components

- [Slider](./slider) — drag-based numeric value picker
