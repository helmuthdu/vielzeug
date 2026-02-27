# Switch Component

A toggle switch component for binary on/off states. Perfect for settings, feature toggles, and preferences. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- 🌈 **5 Semantic Colors**: primary, secondary, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- ♿ **Accessible**: Full keyboard support, ARIA switch role, screen reader friendly
- 🎭 **States**: checked, unchecked, disabled
- 🔧 **Customizable**: CSS custom properties for styling
- ⚡ **Touch-Optimized**: 44px minimum touch target for mobile

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/form/switch/switch.ts
:::

## Basic Usage

```html
<bit-switch>Enable notifications</bit-switch>

<script type="module">
  import '@vielzeug/buildit/switch';
</script>
```

## Visual Options

### Colors

Six semantic colors for different contexts. Defaults to neutral when no color is specified.

<ComponentPreview center>

```html
<bit-switch checked>Default</bit-switch>
<bit-switch checked color="primary">Primary</bit-switch>
<bit-switch checked color="secondary">Secondary</bit-switch>
<bit-switch checked color="info">Info</bit-switch>
<bit-switch checked color="success">Success</bit-switch>
<bit-switch checked color="warning">Warning</bit-switch>
<bit-switch checked color="error">Error</bit-switch>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<bit-switch checked size="sm">Small</bit-switch>
<bit-switch checked size="md">Medium</bit-switch>
<bit-switch checked size="lg">Large</bit-switch>
```

</ComponentPreview>

## States

### Checked

Toggle between on and off states.

<ComponentPreview center>

```html
<bit-switch>Unchecked</bit-switch> <bit-switch checked>Checked</bit-switch>
```

</ComponentPreview>

### Disabled

Prevent interaction and reduce opacity for unavailable options.

<ComponentPreview center>

```html
<bit-switch disabled>Disabled off</bit-switch> <bit-switch checked disabled>Disabled on</bit-switch>
```

</ComponentPreview>

## Usage Examples

### Form Integration

Switches work seamlessly with forms using name and value attributes.

<ComponentPreview center>

```html
<form id="settings-form">
  <bit-switch name="notifications" value="enabled" checked> Push notifications </bit-switch>
  <bit-switch name="darkMode" value="on"> Dark mode </bit-switch>
  <bit-switch name="analytics" value="track"> Analytics tracking </bit-switch>
</form>

<script>
  const form = document.getElementById('settings-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    console.log(Object.fromEntries(formData));
  });
</script>
```

</ComponentPreview>

### Event Handling

Listen to change events for custom logic.

<ComponentPreview center>

```html
<bit-switch id="feature-toggle">Enable feature</bit-switch>
<div id="status"></div>

<script>
  const toggle = document.getElementById('feature-toggle');
  const status = document.getElementById('status');

  toggle.addEventListener('change', (e) => {
    const { checked, value } = e.detail;
    status.textContent = `Feature is ${checked ? 'enabled' : 'disabled'}`;
  });
</script>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute  | Type                                                            | Default     | Description              |
| ---------- | --------------------------------------------------------------- | ----------- | ------------------------ |
| `checked`  | `boolean`                                                       | `false`     | Switch checked state     |
| `disabled` | `boolean`                                                       | `false`     | Disable the switch       |
| `color`    | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color           |
| `size`     | `'sm' \| 'md' \| 'lg'`                                          | `'md'`      | Switch size              |
| `name`     | `string`                                                        | -           | Form field name          |
| `value`    | `string`                                                        | -           | Form field value when on |

### Slots

| Slot      | Description          |
| --------- | -------------------- |
| (default) | Switch label content |

### Events

| Event    | Detail                                                              | Description                        |
| -------- | ------------------------------------------------------------------- | ---------------------------------- |
| `change` | `{ checked: boolean, value: string \| null, originalEvent: Event }` | Emitted when checked state changes |

## CSS Custom Properties

| Property             | Description                   | Default                |
| -------------------- | ----------------------------- | ---------------------- |
| `--switch-width`     | Width of the switch track     | Size-dependent         |
| `--switch-height`    | Height of the switch track    | Size-dependent         |
| `--switch-bg`        | Background when checked       | Color-dependent        |
| `--switch-track`  | Background of unchecked track | `--color-contrast-300` |
| `--switch-thumb`  | Background of the thumb       | `white`                |
| `--switch-font-size` | Font size of the label        | Size-dependent         |

## Accessibility

The switch component follows WAI-ARIA best practices for the switch role.

✅ **Keyboard Navigation**

- `Space` and `Enter` toggle the switch.
- `Tab` moves focus to/from the switch.

✅ **Screen Readers**

- Announces switch role and label.
- `aria-checked` reflects current state (true, false).
- `aria-disabled` reflects disabled state.

✅ **Touch Targets**

- Minimum 44px touch target height for mobile accessibility.

## Best Practices

**Do:**

- Use switches for instant actions that take effect immediately.
- Use clear labels that describe what the switch controls.
- Use appropriate colors (e.g., success for "enable", error for "disable critical feature").

**Don't:**

- Use switches when changes require a save/submit action (use checkbox instead).
- Use switches for more than two options (use radio buttons or select).
- Hide critical settings behind disabled switches without explanation.

## When to Use Switch vs Checkbox

**Use Switch for:**

- Settings that take effect immediately
- Enabling/disabling features
- Toggling system states (on/off, true/false)

**Use Checkbox for:**

- Form selections that require submit
- Multiple selections in a list
- Agreeing to terms and conditions

## Framework Examples

### React

```tsx
import '@vielzeug/buildit/switch';

function SettingsPanel() {
  const [notifications, setNotifications] = useState(true);

  return (
    <bit-switch checked={notifications} onChange={(e) => setNotifications(e.detail.checked)}>
      Enable notifications
    </bit-switch>
  );
}
```

### Vue

```vue
<template>
  <bit-switch :checked="notifications" @change="notifications = $event.detail.checked">
    Enable notifications
  </bit-switch>
</template>

<script setup>
import { ref } from 'vue';
import '@vielzeug/buildit/switch';

const notifications = ref(true);
</script>
```

### Svelte

```svelte
<script>
  import '@vielzeug/buildit/switch';
  let notifications = true;
</script>

<bit-switch
  checked={notifications}
  on:change={(e) => notifications = e.detail.checked}
>
  Enable notifications
</bit-switch>
```
