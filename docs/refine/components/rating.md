# Rating

A star rating control implementing the WAI-ARIA slider pattern: the star row is a single tab stop, arrows adjust the value, and click or drag selects a star. Supports half-star precision, clear-on-repress, readonly display, validation chrome, and HTML form integration.

## Basic Usage

```html
<ore-rating label="Product rating" value="3"></ore-rating>
```

Listen for changes:

```html
<ore-rating id="rating" label="Rate this article"></ore-rating>

<script type="module">
  document.getElementById('rating').addEventListener('change', (e) => {
    console.log('Rating:', e.currentTarget.value);
  });
</script>
```

## Half Stars

Set `precision="0.5"` to allow half steps. The left half of a star selects `n - 0.5`, the right half selects `n`; arrow keys also step by half. Values set from code are snapped onto the grid.

<ComponentPreview vertical>

```html
<ore-rating label="Design" value="4.5" precision="0.5"></ore-rating>
<ore-rating label="Support" value="3.5" precision="0.5" readonly></ore-rating>
```

</ComponentPreview>

## Readonly Display

Use `readonly` to display a rating without allowing user interaction: useful for showing review averages. Prefer `readonly` over `disabled` for an existing score the user cannot change — it keeps `aria-readonly` instead of a disabled control.

<ComponentPreview vertical>

```html
<ore-rating value="4" readonly></ore-rating>
<ore-rating value="4.3" readonly></ore-rating>
<ore-rating value="2" color="success" readonly></ore-rating>
```

</ComponentPreview>

## Clearing

Interactive ratings are `clearable` by default: pressing the already-selected star again resets the rating to 0. Set `clearable="false"` to keep the current value sticky.

<ComponentPreview center>

```html
<ore-rating label="Press 3 again to clear" value="3"></ore-rating>
```

</ComponentPreview>

## Label, Helper & Error

`label` renders a visible caption above the stars (an `aria-label="Rating"` fallback applies when it is omitted). `helper` and `error` render assistive text below; an `error` replaces the helper, tints the empty stars, and sets `aria-invalid`/`aria-errormessage` on the slider. Pass richer markup through the `label`, `helper`, and `error` slots.

<ComponentPreview vertical>

```html
<ore-rating label="Experience" helper="1 = poor, 5 = excellent"></ore-rating>
<ore-rating label="Delivery" error="Please rate your delivery" required color="error"></ore-rating>
```

</ComponentPreview>

## Required

`required` marks the slider `aria-required` and blocks ancestor-form submission until at least one star is selected.

## Colors

Without a `color` the stars use the default gold. A `color` re-themes the fill:

<ComponentPreview center>

```html
<ore-rating value="3" color="primary"></ore-rating>
<ore-rating value="3" color="secondary"></ore-rating>
<ore-rating value="3" color="info"></ore-rating>
<ore-rating value="3" color="success"></ore-rating>
<ore-rating value="3"></ore-rating>
<ore-rating value="3" color="warning"></ore-rating>
<ore-rating value="3" color="error"></ore-rating>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<ore-rating value="3" size="sm"></ore-rating>
<ore-rating value="3" size="md"></ore-rating>
<ore-rating value="3" size="lg"></ore-rating>
```

</ComponentPreview>

## Custom Max

<ComponentPreview center>

```html
<ore-rating value="3" max="5"></ore-rating>
<ore-rating value="6" max="10"></ore-rating>
<ore-rating value="2" max="3" color="success"></ore-rating>
```

</ComponentPreview>

## Disabled

<ComponentPreview center>

```html
<ore-rating value="3" disabled></ore-rating>
```

</ComponentPreview>

## Localized Announcements

The screen-reader value text (`aria-valuetext`) defaults to English. Override it with the `labels` JS property:

```js
rating.labels = {
  unrated: 'Nicht bewertet',
  value: (value, max) => `${value} von ${max} Sternen`,
};
```

## API Reference

### Attributes

| Attribute   | Type                                                                      | Default | Description                                         |
| ----------- | ------------------------------------------------------------------------- | ------- | --------------------------------------------------- |
| `value`     | `number`                                                                  | `0`     | Current rating, snapped to `precision`              |
| `max`       | `number`                                                                  | `5`     | Total number of stars                               |
| `precision` | `1 \| 0.5`                                                                | `1`     | Selection granularity                               |
| `clearable` | `boolean`                                                                 | `true`  | Re-pressing the selected star clears the rating     |
| `readonly`  | `boolean`                                                                 | `false` | Display-only mode; keeps the value in reading order |
| `required`  | `boolean`                                                                 | `false` | Requires at least one star for form submission      |
| `disabled`  | `boolean`                                                                 | `false` | Disables the rating                                 |
| `label`     | `string`                                                                  | `''`    | Visible label above the stars                       |
| `helper`    | `string`                                                                  | N/A     | Helper text below the stars (hidden by `error`)     |
| `error`     | `string`                                                                  | N/A     | Error text; invalidates the slider                  |
| `name`      | `string`                                                                  | N/A     | Form field name                                     |
| `color`     | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | N/A     | Filled star color                                   |
| `size`      | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`  | Star size                                           |

### JS Properties

| Property | Type                                                   | Default          | Description              |
| -------- | ------------------------------------------------------ | ---------------- | ------------------------ |
| `labels` | `{ unrated?: string; value?: (value, max) => string }` | English defaults | `aria-valuetext` strings |

### Slots

| Slot     | Description                               |
| -------- | ----------------------------------------- |
| `label`  | Visible label content (overrides `label`) |
| `helper` | Helper text content (overrides `helper`)  |
| `error`  | Error text content (overrides `error`)    |

### Events

| Event    | Detail | Description                                                       |
| -------- | ------ | ----------------------------------------------------------------- |
| `input`  | —      | Native-style event; read the new rating from `event.target.value` |
| `change` | —      | Native-style event fired after every committed rating change      |

### Parts

| Part      | Description                              |
| --------- | ---------------------------------------- |
| `wrapper` | Column with label, stars, assistive text |
| `label`   | Visible label element                    |
| `stars`   | The focusable slider row                 |
| `star`    | One star cell                            |
| `helper`  | The helper text element                  |
| `error`   | The error text element                   |

### CSS Custom Properties

| Property                | Default                     | Description                       |
| ----------------------- | --------------------------- | --------------------------------- |
| `--rating-star-size`    | `var(--size-7)`             | Size of each star icon            |
| `--rating-color-empty`  | `var(--color-contrast-200)` | Color of unselected stars         |
| `--rating-color-filled` | `var(--color-star)` (gold)  | Color of selected / hovered stars |
| `--rating-gap`          | `var(--size-0_5)`           | Gap between stars                 |

## Accessibility

The rating follows the WAI-ARIA slider rating pattern. The star row is one focusable `role="slider"` with `aria-valuemin="0"`, `aria-valuemax` from `max`, and `aria-valuenow`/`aria-valuetext` announcing the exact rating (or the unrated state). The accessible name comes from the visible `label` via `aria-labelledby`, falling back to `aria-label="Rating"`. An active `error` sets `aria-invalid` and `aria-errormessage`; `required` sets `aria-required`.

Keyboard: `←`/`→` (and `↑`/`↓`) adjust by `precision`, `Home` unsets the rating, `End` selects the maximum, `Tab` moves focus in and out as a single stop.

Selected stars are always rendered solid-filled while empty stars keep the outline, so the value reads by shape, not only by color. A short scale "pop" on the committed star is suppressed under `prefers-reduced-motion`. In `forced-colors` environments empty stars use `ButtonText` and the fill uses `Highlight`.

## Related Components

- [Slider](./slider): drag-based numeric value picker
