# Slider

A single-thumb or dual-thumb slider for selecting a numeric value or a numeric range. Form-associated with native `<form>` support.

- **Single mode** (default) — one thumb; use `value` and `name` for form integration.
- **Range mode** (`range` attribute) — two independent thumbs; use `from` and `to` to set bounds.

## Features

- <sg-icon name="rainbow" size="16"></sg-icon> **6 Semantic Colors** — primary, secondary, info, success, warning, error
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes** — sm, md, lg
- <sg-icon name="arrow-left-right" size="16"></sg-icon> **Range Mode** — two-thumb selection with `from`/`to` bounds
- <sg-icon name="keyboard" size="16"></sg-icon> **Keyboard Navigation** — Arrow keys step the value; Home/End jump to min/max
- <sg-icon name="pointer" size="16"></sg-icon> **Touch Support** — Smooth pointer-event dragging on mobile
- <sg-icon name="accessibility" size="16"></sg-icon> **ARIA Slider** — `role="slider"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- <sg-icon name="bar-chart-2" size="16"></sg-icon> **Flexible Bounds** — Configurable `min`, `max`, and `step`
- <sg-icon name="wrench" size="16"></sg-icon> **Customizable** — CSS custom properties for track, fill, and thumb colors

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/slider/slider.ts
:::

## Basic Usage

```html
<sg-slider value="50">Volume</sg-slider>
```

## Visual Options

### Colors

<ComponentPreview center vertical>

```html
<sg-slider value="35">Default</sg-slider>
<sg-slider value="40" color="primary">Primary</sg-slider>
<sg-slider value="50" color="secondary">Secondary</sg-slider>
<sg-slider value="60" color="info">Info</sg-slider>
<sg-slider value="70" color="success">Success</sg-slider>
<sg-slider value="80" color="warning">Warning</sg-slider>
<sg-slider value="90" color="error">Error</sg-slider>
```

</ComponentPreview>

### Sizes

<ComponentPreview center vertical>

```html
<sg-slider value="30" size="sm">Small</sg-slider>
<sg-slider value="50" size="md">Medium (default)</sg-slider>
<sg-slider value="70" size="lg">Large</sg-slider>
```

</ComponentPreview>

## Min, Max & Step

<ComponentPreview center vertical>

```html
<sg-slider min="0" max="100" value="50" color="primary">Percentage (0–100)</sg-slider>
<sg-slider min="0" max="200" value="100" color="secondary">Temperature (0–200 °C)</sg-slider>
<sg-slider min="0" max="100" step="5" value="50" color="success">Coarse steps (step 5)</sg-slider>
<sg-slider min="0" max="1" step="0.1" value="0.5" color="info">Decimal (step 0.1)</sg-slider>
```

</ComponentPreview>

## States

### Disabled

<ComponentPreview center vertical>

```html
<sg-slider value="50" disabled>Disabled</sg-slider>
<sg-slider value="75" color="success" disabled>Disabled with color</sg-slider>
```

</ComponentPreview>

## Range Mode

Add the boolean `range` attribute to enable two-thumb mode. Use `from` and `to` to set the initial lower and upper bounds.

```html
<sg-slider range from="20" to="80">Price range</sg-slider>
```

<ComponentPreview center vertical>

```html
<sg-slider range from="20" to="80">Default</sg-slider>
<sg-slider range from="20" to="80" color="primary">Primary</sg-slider>
<sg-slider range from="30" to="70" color="success" size="sm">Small · Success</sg-slider>
<sg-slider range from="10" to="90" color="warning" size="lg">Large · Warning</sg-slider>
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
<sg-slider value="75" value-text="75%" color="primary">Volume</sg-slider>

<!-- Range mode: announce "$20 – $80" -->
<sg-slider range from="20" to="80" min="0" max="100" from-value-text="$20" to-value-text="$80" color="primary">
  Price range
</sg-slider>
```

## Form Integration

`sg-slider` is form-associated in single mode. The `name` attribute is submitted as part of `FormData`.

```html
<form id="settings-form">
  <sg-slider name="volume" min="0" max="100" value="70">Volume</sg-slider>
  <sg-slider name="bass" min="-10" max="10" value="0">Bass</sg-slider>
  <sg-button type="submit">Save</sg-button>
</form>

<script type="module">
  import '@vielzeug/sigil/slider';
  import '@vielzeug/sigil/button';

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
| `--slider-height`   | Height of the slider track  | Size-dependent              |
| `--slider-size`     | Thumb diameter              | Size-dependent              |
| `--slider-track-bg` | Track background color      | `var(--color-contrast-300)` |
| `--slider-fill`     | Active fill color           | Theme color                 |
| `--slider-thumb-bg` | Thumb background color      | `var(--color-contrast-100)` |

## Accessibility

The slider component follows WAI-ARIA best practices.

### `sg-slider`

<sg-icon name="circle-check" size="16"></sg-icon> **Keyboard Navigation**

- `Arrow Right` / `Arrow Up` — increase value by one step
- `Arrow Left` / `Arrow Down` — decrease value by one step
- `Home` — jump to minimum value
- `End` — jump to maximum value

<sg-icon name="circle-check" size="16"></sg-icon> **Screen Readers**

- The thumb has `role="slider"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
- Provide `value-text` or `from-value-text` / `to-value-text` when the raw number needs a unit (e.g. `"$80"`, `"75%"`).
- In range mode, each thumb has its own accessible label and independent ARIA attributes.
- `aria-disabled` is set when `disabled` is active.

<sg-icon name="circle-check" size="16"></sg-icon> **Touch & Focus**

- Touch-friendly draggable thumb with a minimum 44 × 44 px hit area.
- `Tab` focuses the slider; `Shift+Tab` blurs it.

## Best Practices

**Do:**

- Always provide a visible label via the default slot to describe what the slider controls.
- Use `value-text` / `from-value-text` / `to-value-text` when the value needs a unit or currency symbol.
- Keep `min`, `max`, and `step` values consistent and predictable for users.
- Use range mode for "between X and Y" inputs like price ranges or date spans.

**Don't:**

- Use a slider for a small, discrete set of options — a `sg-select` or `sg-radio-group` is clearer.
- Omit `value-text` when using fractional step values — screen readers announce the raw float verbatim.
