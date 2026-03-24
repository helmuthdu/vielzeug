# Slider

A single-thumb or dual-thumb slider for selecting a numeric value or a numeric range. Form-associated with native `<form>` support.

- **Single mode** (default) — one thumb; use `value` and `name` for form integration.
- **Range mode** (`range` attribute) — two independent thumbs; use `from` and `to` to set bounds.

## Features

- 🌈 **6 Semantic Colors** — primary, secondary, info, success, warning, error
- 📏 **3 Sizes** — sm, md, lg
- ↔️ **Range Mode** — two-thumb selection with `from`/`to` bounds
- ⌨️ **Keyboard Navigation** — Arrow keys step the value; Home/End jump to min/max
- 👆 **Touch Support** — Smooth pointer-event dragging on mobile
- ♿ **ARIA Slider** — `role="slider"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- 📊 **Flexible Bounds** — Configurable `min`, `max`, and `step`
- 🔧 **Customizable** — CSS custom properties for track, fill, and thumb colors

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/inputs/slider/slider.ts
:::

## Basic Usage

```html
<bit-slider value="50">Volume</bit-slider>

<script type="module">
  import '@vielzeug/buildit/slider';
</script>
```

## Visual Options

### Colors

<ComponentPreview center vertical>

```html
<bit-slider value="35">Default</bit-slider>
<bit-slider value="40" color="primary">Primary</bit-slider>
<bit-slider value="50" color="secondary">Secondary</bit-slider>
<bit-slider value="60" color="info">Info</bit-slider>
<bit-slider value="70" color="success">Success</bit-slider>
<bit-slider value="80" color="warning">Warning</bit-slider>
<bit-slider value="90" color="error">Error</bit-slider>
```

</ComponentPreview>

### Sizes

<ComponentPreview center vertical>

```html
<bit-slider value="30" size="sm">Small</bit-slider>
<bit-slider value="50" size="md">Medium (default)</bit-slider>
<bit-slider value="70" size="lg">Large</bit-slider>
```

</ComponentPreview>

## Min, Max & Step

<ComponentPreview center vertical>

```html
<bit-slider min="0" max="100" value="50" color="primary">Percentage (0–100)</bit-slider>
<bit-slider min="0" max="200" value="100" color="secondary">Temperature (0–200 °C)</bit-slider>
<bit-slider min="0" max="100" step="5" value="50" color="success">Coarse steps (step 5)</bit-slider>
<bit-slider min="0" max="1" step="0.1" value="0.5" color="info">Decimal (step 0.1)</bit-slider>
```

</ComponentPreview>

## States

### Disabled

<ComponentPreview center vertical>

```html
<bit-slider value="50" disabled>Disabled</bit-slider>
<bit-slider value="75" color="success" disabled>Disabled with color</bit-slider>
```

</ComponentPreview>

## Range Mode

Add the boolean `range` attribute to enable two-thumb mode. Use `from` and `to` to set the initial lower and upper bounds.

```html
<bit-slider range from="20" to="80">Price range</bit-slider>

<script type="module">
  import '@vielzeug/buildit/slider';
</script>
```

<ComponentPreview center vertical>

```html
<bit-slider range from="20" to="80">Default</bit-slider>
<bit-slider range from="20" to="80" color="primary">Primary</bit-slider>
<bit-slider range from="30" to="70" color="success" size="sm">Small · Success</bit-slider>
<bit-slider range from="10" to="90" color="warning" size="lg">Large · Warning</bit-slider>
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
<bit-slider value="75" value-text="75%" color="primary">Volume</bit-slider>

<!-- Range mode: announce "$20 – $80" -->
<bit-slider range from="20" to="80" min="0" max="100" from-value-text="$20" to-value-text="$80" color="primary">
  Price range
</bit-slider>
```

## Form Integration

`bit-slider` is form-associated in single mode. The `name` attribute is submitted as part of `FormData`.

```html
<form id="settings-form">
  <bit-slider name="volume" min="0" max="100" value="70">Volume</bit-slider>
  <bit-slider name="bass" min="-10" max="10" value="0">Bass</bit-slider>
  <bit-button type="submit">Save</bit-button>
</form>

<script type="module">
  import '@vielzeug/buildit/slider';
  import '@vielzeug/buildit/button';

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

| Property          | Description                     | Default                     |
| ----------------- | ------------------------------- | --------------------------- |
| `--slider-height` | Height of the slider track      | Size-dependent              |
| `--slider-size`   | Diameter of the thumb           | Size-dependent              |
| `--slider-track`  | Track background color          | `var(--color-contrast-300)` |
| `--slider-fill`   | Filled portion background color | Theme color                 |
| `--slider-thumb`  | Thumb background color          | `var(--color-contrast-100)` |

## Accessibility

The slider component follows WAI-ARIA best practices.

### `bit-slider`

✅ **Keyboard Navigation**

- `Arrow Right` / `Arrow Up` — increase value by one step
- `Arrow Left` / `Arrow Down` — decrease value by one step
- `Home` — jump to minimum value
- `End` — jump to maximum value

✅ **Screen Readers**

- The thumb has `role="slider"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
- Provide `value-text` or `from-value-text` / `to-value-text` when the raw number needs a unit (e.g. `"$80"`, `"75%"`).
- In range mode, each thumb has its own accessible label and independent ARIA attributes.
- `aria-disabled` is set when `disabled` is active.

✅ **Touch & Focus**

- Touch-friendly draggable thumb with a minimum 44 × 44 px hit area.
- `Tab` focuses the slider; `Shift+Tab` blurs it.

## Best Practices

**Do:**

- Always provide a visible label via the default slot to describe what the slider controls.
- Use `value-text` / `from-value-text` / `to-value-text` when the value needs a unit or currency symbol.
- Keep `min`, `max`, and `step` values consistent and predictable for users.
- Use range mode for "between X and Y" inputs like price ranges or date spans.

**Don't:**

- Use a slider for a small, discrete set of options — a `bit-select` or `bit-radio-group` is clearer.
- Omit `value-text` when using fractional step values — screen readers announce the raw float verbatim.
