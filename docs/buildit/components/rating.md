# Rating

A star-based rating input that lets users select a score. Supports hover preview, keyboard navigation, readonly and disabled modes, and HTML form integration.

## Features

- ⌨️ **Keyboard Navigation** — `←`/`→` arrows adjust value; `Home`/`End` jump to extremes
- ⭐ **Configurable Stars** — any number of stars via `max` (default 5)
- 🌈 **6 Semantic Colors** — primary, secondary, info, success, warning, error
- 📏 **3 Sizes** — sm, md, lg
- 🔒 **Readonly & Disabled** — readonly shows a non-interactive score; disabled removes from tab order
- 🧱 **Solid Fill Mode** — selected stars can render as solid-filled via `solid`
- 🔗 **Form-Associated** — `name` attribute & native form `reset` support
- 🖱️ **Hover Preview** — stars fill on hover before selection is committed

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/inputs/rating/rating.ts
:::

## Basic Usage

```html
<bit-rating label="Product rating" value="3"></bit-rating>

<script type="module">
  import '@vielzeug/buildit';
</script>
```

Listen for changes:

```html
<bit-rating id="rating" label="Rate this article" color="warning"></bit-rating>

<script type="module">
  import '@vielzeug/buildit';

  document.getElementById('rating').addEventListener('change', (e) => {
    console.log('Rating:', e.detail.value);
  });
</script>
```

## Colors

<ComponentPreview center>

```html
<bit-rating value="3" color="primary"></bit-rating>
<bit-rating value="3" color="secondary"></bit-rating>
<bit-rating value="3" color="info"></bit-rating>
<bit-rating value="3" color="success"></bit-rating>
<bit-rating value="3" color="warning"></bit-rating>
<bit-rating value="3" color="error"></bit-rating>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<bit-rating value="3" color="warning" size="sm"></bit-rating>
<bit-rating value="3" color="warning" size="md"></bit-rating>
<bit-rating value="3" color="warning" size="lg"></bit-rating>
```

</ComponentPreview>

## Custom Max

<ComponentPreview center>

```html
<bit-rating value="3" max="5" color="warning"></bit-rating>
<bit-rating value="6" max="10" color="warning"></bit-rating>
<bit-rating value="2" max="3" color="success"></bit-rating>
```

</ComponentPreview>

## Readonly

Use `readonly` to display a rating without allowing user interaction — useful for showing review scores.

<ComponentPreview center>

```html
<bit-rating value="4" color="warning" readonly></bit-rating>
<bit-rating value="3" color="primary" readonly></bit-rating>
<bit-rating value="2" color="success" readonly></bit-rating>
```

</ComponentPreview>

## Solid Stars

Use `solid` to render selected stars as filled shapes instead of outline-only.

<ComponentPreview center>

```html
<bit-rating value="3" color="warning"></bit-rating>
<bit-rating value="3" color="warning" solid></bit-rating>
<bit-rating value="4" color="primary" solid></bit-rating>
```

</ComponentPreview>

## Disabled

<ComponentPreview center>

```html
<bit-rating value="3" color="warning" disabled></bit-rating>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute  | Type                                                                      | Default | Description                                 |
| ---------- | ------------------------------------------------------------------------- | ------- | ------------------------------------------- |
| `value`    | `number`                                                                  | `0`     | Current selected rating                     |
| `max`      | `number`                                                                  | `5`     | Total number of stars                       |
| `readonly` | `boolean`                                                                 | `false` | Prevents user interaction; shows value only |
| `solid`    | `boolean`                                                                 | `false` | Fills selected stars instead of outline-only |
| `disabled` | `boolean`                                                                 | `false` | Disables the rating input                   |
| `label`    | `string`                                                                  | —       | Accessible label for the rating group       |
| `name`     | `string`                                                                  | —       | Form field name                             |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —       | Star highlight color                        |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`  | Star size                                   |

### Events

| Event    | Detail              | Description                          |
| -------- | ------------------- | ------------------------------------ |
| `change` | `{ value: number }` | Fired when the user selects a rating |

### CSS Custom Properties

| Property                | Description                       |
| ----------------------- | --------------------------------- |
| `--rating-star-size`    | Size of each star icon            |
| `--rating-color-empty`  | Color of unselected stars         |
| `--rating-color-filled` | Color of selected / hovered stars |
| `--rating-gap`          | Gap between stars                 |

## Accessibility

The rating component follows WCAG 2.1 Level AA standards.

### `bit-rating`

✅ **Keyboard Navigation**

- `←` / `→` arrow keys move and commit the selection.
- `Home` / `End` jump to 1 / max; `Tab` moves focus in and out.

✅ **Screen Readers**

- The group uses `role="radiogroup"`; each star uses `role="radio"` with `aria-checked` reflecting the current selection.
- `aria-labelledby` links the group label.
- `aria-disabled` reflects the disabled state; `aria-readonly` reflects the readonly state.
- Hover previews stars visually without committing the value.

## Best Practices

**Do:**

- Always provide a `label` attribute so screen readers announce the context (e.g. `"Product rating"`).
- Use `readonly` rather than `disabled` when showing an existing score that the user cannot change — `readonly` keeps the element accessible in the reading order.
- Use colour together with label text to reinforce meaning (e.g. `color="warning"` for a gold star aesthetic).

**Don't:**

- Use rating for non-numeric preference input — a `bit-select` or `bit-radio-group` conveys options more clearly.
- Omit the `label` attribute — an unlabelled rating group is inaccessible.

## Related Components

- [Slider](./slider) — drag-based numeric value picker
