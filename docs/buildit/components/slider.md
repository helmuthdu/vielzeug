# Slider Component

A simple, efficient range slider component for selecting numeric values. Built with accessibility in mind, supporting keyboard navigation, touch gestures, and full form integration.

## Features

- 🎨 **5 Semantic Colors**: primary, secondary, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- ⌨️ **Keyboard Navigation**: Arrow keys, Home/End support
- 👆 **Touch Support**: Pointer events for smooth dragging
- ♿ **Accessible**: Full ARIA support, WCAG 2.1 Level AA compliant
- 📊 **Flexible Range**: Custom min, max, step values
- 🔧 **Customizable**: CSS custom properties for styling
- 📦 **Lightweight**: Only 6.30 kB (1.92 kB gzipped)

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/form/slider/slider.ts
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

Six semantic colors for different contexts. Defaults to neutral when no color is specified.

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

Three sizes for different contexts.

<ComponentPreview center vertical>

```html
<bit-slider value="30" size="sm">Small</bit-slider>
<bit-slider value="50" size="md">Medium</bit-slider>
<bit-slider value="70" size="lg">Large</bit-slider>
```

</ComponentPreview>

## Range Configuration

### Custom Range

Set custom minimum and maximum values.

<ComponentPreview center vertical>

```html
<bit-slider min="0" max="100" value="50">Percentage (0-100)</bit-slider>
<bit-slider min="0" max="200" value="100">Temperature (0-200°C)</bit-slider>
<bit-slider min="-50" max="50" value="0">Balance (-50 to 50)</bit-slider>
```

</ComponentPreview>

### Step Increment

Control the granularity of value changes.

<ComponentPreview center vertical>

```html
<bit-slider min="0" max="100" step="1" value="50">Fine (step: 1)</bit-slider>
<bit-slider min="0" max="100" step="5" value="50">Coarse (step: 5)</bit-slider>
<bit-slider min="0" max="100" step="25" value="50">Quarters (step: 25)</bit-slider>
<bit-slider min="0" max="1" step="0.1" value="0.5">Decimal (step: 0.1)</bit-slider>
```

</ComponentPreview>

## States

### Disabled

Prevent interaction for unavailable controls.

<ComponentPreview center vertical>

```html
<bit-slider value="50" disabled>Disabled slider</bit-slider>
<bit-slider value="75" color="success" disabled>Disabled with color</bit-slider>
```

</ComponentPreview>

## Usage Examples

### Volume Control

<ComponentPreview center vertical>

```html
<bit-slider 
  min="0" 
  max="100" 
  value="70" 
  color="primary" 
  id="volume-slider">
  Volume: <span id="volume-value">70</span>%
</bit-slider>

<script>
  const slider = document.getElementById('volume-slider');
  const valueDisplay = document.getElementById('volume-value');
  
  slider.addEventListener('change', (e) => {
    valueDisplay.textContent = e.detail.value;
  });
</script>
```

</ComponentPreview>

### Brightness Control

<ComponentPreview center vertical>

```html
<bit-slider 
  min="0" 
  max="100" 
  step="5"
  value="80" 
  color="warning"
  id="brightness-slider">
  Brightness
</bit-slider>

<script>
  const brightness = document.getElementById('brightness-slider');
  brightness.addEventListener('change', (e) => {
    console.log('Brightness:', e.detail.value);
  });
</script>
```

</ComponentPreview>

### Form Integration

Sliders work seamlessly with forms using name and value attributes.

<ComponentPreview center vertical>

```html
<form id="settings-form">
  <bit-slider name="volume" min="0" max="100" value="70">Volume</bit-slider>
  <bit-slider name="bass" min="-10" max="10" value="0">Bass</bit-slider>
  <bit-slider name="treble" min="-10" max="10" value="0">Treble</bit-slider>
  <bit-button type="submit">Save Settings</bit-button>
</form>

<script>
  const form = document.getElementById('settings-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    console.log('Settings:', Object.fromEntries(formData));
  });
</script>
```

</ComponentPreview>

## Keyboard Navigation

The slider supports comprehensive keyboard controls:

| Key | Action |
|-----|--------|
| `Arrow Right` / `Arrow Up` | Increase value by step |
| `Arrow Left` / `Arrow Down` | Decrease value by step |
| `Home` | Jump to minimum value |
| `End` | Jump to maximum value |

<ComponentPreview center vertical>

```html
<bit-slider value="50" step="10">
  Use arrow keys or Home/End
</bit-slider>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute  | Type                                                            | Default     | Description                             |
| ---------- | --------------------------------------------------------------- | ----------- | --------------------------------------- |
| `min`      | `number`                                                        | `0`         | Minimum value                           |
| `max`      | `number`                                                        | `100`       | Maximum value                           |
| `step`     | `number`                                                        | `1`         | Value increment/decrement step          |
| `value`    | `number`                                                        | `0`         | Current slider value                    |
| `disabled` | `boolean`                                                       | `false`     | Disable the slider                      |
| `name`     | `string`                                                        | -           | Form field name                         |
| `color`    | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color                          |
| `size`     | `'sm' \| 'md' \| 'lg'`                                          | `'md'`      | Slider size                             |

### Slots

| Slot      | Description            |
| --------- | ---------------------- |
| (default) | Slider label content   |

### Events

| Event    | Detail                                      | Description                     |
| -------- | ------------------------------------------- | ------------------------------- |
| `change` | `{ value: number, originalEvent: Event }`   | Emitted when value changes      |

## CSS Custom Properties

| Property | Description | Default |
|----------|-------------|---------|
| `--slider-track-height` | Height of the slider track | Size-dependent |
| `--slider-thumb-size` | Size of the slider thumb | Size-dependent |
| `--slider-track-bg` | Background color of the track | `var(--color-contrast-300)` |
| `--slider-fill-bg` | Background color of the filled portion | Theme color |
| `--slider-thumb-bg` | Background color of the thumb | `var(--color-contrast-100)` |

## Accessibility

The slider component follows WAI-ARIA best practices.

✅ **Keyboard Navigation**
- Arrow keys adjust the value by step increment
- Home/End keys jump to min/max values
- Tab moves focus to/from the slider

✅ **Screen Readers**
- Announces slider role and current value
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` reflect state
- `aria-disabled` reflects disabled state

✅ **Focus Management**
- Visible focus indicator on keyboard focus
- Disabled state removes from tab order
- Touch-friendly target size (44×44px minimum)

## Best Practices

**Do:**
- Provide clear labels describing what the slider controls
- Use appropriate step values for the use case
- Consider decimal steps for fine-grained control (e.g., 0.1, 0.01)
- Use semantic colors (warning for volume at high levels)

**Don't:**
- Make sliders too small for touch targets (use size="lg" on mobile)
- Use sliders for binary choices (use switches instead)
- Forget to display the current value to users
- Use overly large value ranges without appropriate steps

## Examples in Real Applications

### Audio Equalizer

```html
<div class="equalizer">
  <bit-slider min="-12" max="12" step="1" value="0">60Hz</bit-slider>
  <bit-slider min="-12" max="12" step="1" value="0">250Hz</bit-slider>
  <bit-slider min="-12" max="12" step="1" value="0">1kHz</bit-slider>
  <bit-slider min="-12" max="12" step="1" value="0">4kHz</bit-slider>
  <bit-slider min="-12" max="12" step="1" value="0">16kHz</bit-slider>
</div>
```

### Image Editor

```html
<bit-slider min="0" max="100" value="50" color="primary">Brightness</bit-slider>
<bit-slider min="0" max="100" value="50" color="secondary">Contrast</bit-slider>
<bit-slider min="0" max="100" value="50" color="success">Saturation</bit-slider>
<bit-slider min="0" max="360" value="0" color="warning">Hue</bit-slider>
<bit-slider min="0" max="100" value="100" color="error">Opacity</bit-slider>
```

### Temperature Control

```html
<bit-slider 
  min="16" 
  max="30" 
  step="0.5" 
  value="22" 
  color="warning">
  Temperature: <span id="temp">22</span>°C
</bit-slider>

<script>
  document.querySelector('bit-slider').addEventListener('change', (e) => {
    document.getElementById('temp').textContent = e.detail.value;
  });
</script>
```

## Component Comparison

### Slider vs Switch

| Feature | Slider | Switch |
|---------|--------|--------|
| **Purpose** | Numeric range selection | Binary on/off |
| **Value Type** | Number (0-100, etc.) | Boolean |
| **Interaction** | Drag or keyboard | Click or keyboard |
| **Use Cases** | Volume, brightness, zoom | Enable/disable features |
| **Bundle Size** | 6.30 kB | 6.03 kB |

