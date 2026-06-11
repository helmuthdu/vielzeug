# Switch

A toggle switch component for binary on/off states. Perfect for settings, feature toggles, and preferences. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- <sg-icon name="zap" size="16"></sg-icon> **Touch-Optimized** — 44 × 44 px minimum touch target for mobile
- <sg-icon name="rainbow" size="16"></sg-icon> **6 Semantic Colors** — primary, secondary, info, success, warning, error
- <sg-icon name="theater" size="16"></sg-icon> **States** — checked, unchecked, disabled
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes** — sm, md, lg
- <sg-icon name="link" size="16"></sg-icon> **Form-Associated** — participates in native form submission
- <sg-icon name="wrench" size="16"></sg-icon> **Customizable** — CSS custom properties for styling

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/switch/switch.ts
:::

## Basic Usage

```html
<sg-switch>Enable notifications</sg-switch>
```

## Visual Options

### Colors

Six semantic colors for different contexts. Defaults to neutral when no color is specified.

<ComponentPreview center>

```html
<sg-switch checked>Default</sg-switch>
<sg-switch checked color="primary">Primary</sg-switch>
<sg-switch checked color="secondary">Secondary</sg-switch>
<sg-switch checked color="info">Info</sg-switch>
<sg-switch checked color="success">Success</sg-switch>
<sg-switch checked color="warning">Warning</sg-switch>
<sg-switch checked color="error">Error</sg-switch>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<sg-switch checked size="sm">Small</sg-switch>
<sg-switch checked size="md">Medium</sg-switch>
<sg-switch checked size="lg">Large</sg-switch>
```

</ComponentPreview>

## States

### Checked

Toggle between on and off states.

<ComponentPreview center>

```html
<sg-switch>Unchecked</sg-switch> <sg-switch checked>Checked</sg-switch>
```

</ComponentPreview>

### Disabled

Prevent interaction and reduce opacity for unavailable options.

<ComponentPreview center>

```html
<sg-switch disabled>Disabled off</sg-switch> <sg-switch checked disabled>Disabled on</sg-switch>
```

</ComponentPreview>

## Usage Examples

### Form Integration

Switches work seamlessly with forms using name and value attributes.

<ComponentPreview center>

```html
<form id="settings-form">
  <sg-switch name="notifications" value="enabled" checked> Push notifications </sg-switch>
  <sg-switch name="darkMode" value="on"> Dark mode </sg-switch>
  <sg-switch name="analytics" value="track"> Analytics tracking </sg-switch>
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
<sg-switch id="feature-toggle">Enable feature</sg-switch>
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

### CSS Custom Properties

| Property             | Description                   | Default                |
| -------------------- | ----------------------------- | ---------------------- |
| `--switch-width`       | Track width                           | Size-dependent  |
| `--switch-height`      | Track height                          | Size-dependent  |
| `--switch-track-bg`    | Inactive (unchecked) track background | Theme-dependent |
| `--switch-checked-bg`  | Active (checked) track background     | Color-dependent |
| `--switch-thumb-bg`    | Thumb background color                | Theme-dependent |
| `--switch-font-size`   | Label font size                       | Size-dependent  |

## Accessibility

The switch component follows WCAG 2.1 Level AA standards.

### `sg-switch`

<sg-icon name="check" size="16"></sg-icon> **Keyboard Navigation**

- `Space` / `Enter` toggle the switch.
- `Tab` moves focus to and from the control.

<sg-icon name="check" size="16"></sg-icon> **Screen Readers**

- Uses `role="switch"` with `aria-checked` reflecting the on/off state (`"true"` or `"false"`).
- `aria-labelledby` links the label; `aria-describedby` links helper and error text.
- `aria-disabled` reflects the disabled state.
- Minimum 44 × 44 px touch target for mobile.

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
import '@vielzeug/sigil/switch';

function SettingsPanel() {
  const [notifications, setNotifications] = useState(true);

  return (
    <sg-switch checked={notifications} onChange={(e) => setNotifications(e.detail.checked)}>
      Enable notifications
    </sg-switch>
  );
}
```

### Vue

```vue
<template>
  <sg-switch :checked="notifications" @change="notifications = $event.detail.checked"> Enable notifications </sg-switch>
</template>

<script setup>
import { ref } from 'vue';
import '@vielzeug/sigil/switch';

const notifications = ref(true);
</script>
```

### Svelte

```svelte
<script>
  import '@vielzeug/sigil/switch';
  let notifications = true;
</script>

<sg-switch
  checked={notifications}
  on:change={(e) => notifications = e.detail.checked}
>
  Enable notifications
</sg-switch>
```
