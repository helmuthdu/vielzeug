# Slider

A single-thumb or dual-thumb slider for selecting a numeric value or a numeric range. Form-associated with native `<form>` support.

- **Single mode** (default) — one thumb; use `value` and `name` for form integration.
- **Range mode** (`range` attribute) — two independent thumbs; use `from` and `to` to set bounds.

## Colors

<ComponentPreview center vertical>

```html
<ore-slider value="35">Default</ore-slider>
<ore-slider value="40" color="primary">Primary</ore-slider>
<ore-slider value="50" color="secondary">Secondary</ore-slider>
<ore-slider value="60" color="info">Info</ore-slider>
<ore-slider value="70" color="success">Success</ore-slider>
<ore-slider value="80" color="warning">Warning</ore-slider>
<ore-slider value="90" color="error">Error</ore-slider>
```

</ComponentPreview>

## Sizes

<ComponentPreview center vertical>

```html
<ore-slider value="30" size="sm">Small</ore-slider>
<ore-slider value="50" size="md">Medium (default)</ore-slider>
<ore-slider value="70" size="lg">Large</ore-slider>
```

</ComponentPreview>

## Min, Max & Step

<ComponentPreview center vertical>

```html
<ore-slider min="0" max="100" value="50" color="primary">Percentage (0–100)</ore-slider>
<ore-slider min="0" max="200" value="100" color="secondary">Temperature (0–200 °C)</ore-slider>
<ore-slider min="0" max="100" step="5" value="50" color="success">Coarse steps (step 5)</ore-slider>
<ore-slider min="0" max="1" step="0.1" value="0.5" color="info">Decimal (step 0.1)</ore-slider>
```

</ComponentPreview>

Keep `min`, `max`, and `step` values consistent and predictable. For a small, discrete set of options, prefer `ore-select` or `ore-radio-group` over a slider. When using fractional step values, always provide `value-text` — screen readers announce the raw float verbatim otherwise.

## States

### Disabled

<ComponentPreview center vertical>

```html
<ore-slider value="50" disabled>Disabled</ore-slider>
<ore-slider value="75" color="success" disabled>Disabled with color</ore-slider>
```

</ComponentPreview>

## Range Mode

Add the boolean `range` attribute to enable two-thumb mode. Use `from` and `to` to set the initial lower and upper bounds. Range mode is suited for "between X and Y" inputs like price ranges or date spans.

```html
<ore-slider range from="20" to="80">Price range</ore-slider>
```

<ComponentPreview center vertical>

```html
<ore-slider range from="20" to="80">Default</ore-slider>
<ore-slider range from="20" to="80" color="primary">Primary</ore-slider>
<ore-slider range from="30" to="70" color="success" size="sm">Small · Success</ore-slider>
<ore-slider range from="10" to="90" color="warning" size="lg">Large · Warning</ore-slider>
```

</ComponentPreview>

In range mode, the `change` event fires with `{ from, to }`:

```js
document.getElementById('price').addEventListener('change', (e) => {
  if ('from' in e.detail) {
    // Range mode
    console.log(`Range: ${e.detail.from} – ${e.detail.to}`);
  } else {
    // Single mode
    console.log('Value:', e.detail.value);
  }
});
```

## Accessible Labels

Use `value-text` (single mode) or `from-value-text` / `to-value-text` (range mode) to give screen readers a readable version of the value — useful when the raw number needs a unit or currency symbol.

```html
<!-- Single mode: announce "75%" instead of "75" -->
<ore-slider value="75" value-text="75%" color="primary">Volume</ore-slider>

<!-- Range mode: announce "$20 – $80" -->
<ore-slider range from="20" to="80" min="0" max="100" from-value-text="$20" to-value-text="$80" color="primary">
  Price range
</ore-slider>
```

## Form Integration

`ore-slider` is form-associated in single mode. The `name` attribute is submitted as part of `FormData`. Always provide a visible label via the default slot to describe what the slider controls.

```html
<form id="settings-form">
  <ore-slider name="volume" min="0" max="100" value="70">Volume</ore-slider>
  <ore-slider name="bass" min="-10" max="10" value="0">Bass</ore-slider>
  <ore-button type="submit">Save</ore-button>
</form>

<script type="module">
  import '@vielzeug/refine/slider';
  import '@vielzeug/refine/button';

  document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    console.log('volume:', data.get('volume'));
    console.log('bass:', data.get('bass'));
  });
</script>
```

## API Reference

### Attributes

| Attribute         | Type                                                                      | Default | Description                                                                |
| ----------------- | ------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| `value`           | `number`                                                                  | `0`     | Current value (single mode)                                                |
| `from`            | `number`                                                                  | `0`     | Lower bound value (range mode)                                             |
| `to`              | `number`                                                                  | `100`   | Upper bound value (range mode)                                             |
| `range`           | `boolean`                                                                 | `false` | Activate two-thumb range mode                                              |
| `min`             | `number`                                                                  | `0`     | Minimum allowed value                                                      |
| `max`             | `number`                                                                  | `100`   | Maximum allowed value                                                      |
| `step`            | `number`                                                                  | `1`     | Value increment/decrement step                                             |
| `disabled`        | `boolean`                                                                 | `false` | Disable slider interaction                                                 |
| `name`            | `string`                                                                  | —       | Form field name (single mode only)                                         |
| `color`           | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —       | Semantic color                                                             |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`  | Slider size                                                                |
| `value-text`      | `string`                                                                  | —       | Human-readable ARIA value label for single mode (e.g. `"75%"`)             |
| `from-value-text` | `string`                                                                  | —       | Human-readable ARIA label for the start thumb in range mode (e.g. `"$20"`) |
| `to-value-text`   | `string`                                                                  | —       | Human-readable ARIA label for the end thumb in range mode (e.g. `"$80"`)   |

### Slots

| Slot      | Description          |
| --------- | -------------------- |
| (default) | Slider label content |

### Parts

| Part          | Description                     |
| ------------- | ------------------------------- |
| `slider`      | The outer slider container      |
| `track`       | The slider track                |
| `fill`        | The filled portion of the track |
| `thumb`       | The single-value thumb          |
| `thumb-start` | The range start (lower) thumb   |
| `thumb-end`   | The range end (upper) thumb     |
| `label`       | The label element               |

### Events

| Event    | Detail — single mode | Detail — range mode            | Description                |
| -------- | -------------------- | ------------------------------ | -------------------------- |
| `change` | `{ value: number }`  | `{ from: number, to: number }` | Emitted when value changes |

### CSS Custom Properties

| Property            | Description                | Default                     |
| ------------------- | -------------------------- | --------------------------- |
| `--slider-height`   | Height of the slider track | Size-dependent              |
| `--slider-size`     | Thumb diameter             | Size-dependent              |
| `--slider-track-bg` | Track background color     | `var(--color-contrast-300)` |
| `--slider-fill`     | Active fill color          | Theme color                 |
| `--slider-thumb-bg` | Thumb background color     | `var(--color-contrast-100)` |

## Accessibility

The slider follows WAI-ARIA best practices. Each thumb carries `role="slider"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`. In range mode, each thumb has its own accessible label and independent ARIA attributes. `aria-disabled` is set when `disabled` is active.

Keyboard navigation is fully supported: `Arrow Right` / `Arrow Up` increases the value by one step, `Arrow Left` / `Arrow Down` decreases it, `Home` jumps to the minimum, and `End` jumps to the maximum. `Tab` focuses the slider; `Shift+Tab` blurs it.

The thumb has a touch-friendly minimum 44 × 44 px hit area for pointer-event dragging on mobile.
