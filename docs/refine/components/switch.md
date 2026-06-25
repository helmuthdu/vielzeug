# Switch

A toggle switch component for binary on/off states. Perfect for settings, feature toggles, and preferences. Built with accessibility in mind and fully customizable through CSS custom properties.

## Colors

Six semantic colors for different contexts. Defaults to neutral when no color is specified.

<ComponentPreview center>

```html
<ore-switch checked>Default</ore-switch>
<ore-switch checked color="primary">Primary</ore-switch>
<ore-switch checked color="secondary">Secondary</ore-switch>
<ore-switch checked color="info">Info</ore-switch>
<ore-switch checked color="success">Success</ore-switch>
<ore-switch checked color="warning">Warning</ore-switch>
<ore-switch checked color="error">Error</ore-switch>
```

</ComponentPreview>

## Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<ore-switch checked size="sm">Small</ore-switch>
<ore-switch checked size="md">Medium</ore-switch>
<ore-switch checked size="lg">Large</ore-switch>
```

</ComponentPreview>

## States

### Checked

Toggle between on and off states.

<ComponentPreview center>

```html
<ore-switch>Unchecked</ore-switch> <ore-switch checked>Checked</ore-switch>
```

</ComponentPreview>

### Disabled

Prevent interaction and reduce opacity for unavailable options.

<ComponentPreview center>

```html
<ore-switch disabled>Disabled off</ore-switch> <ore-switch checked disabled>Disabled on</ore-switch>
```

</ComponentPreview>

## Usage Examples

### Form Integration

Switches work seamlessly with forms using name and value attributes. Use switches for instant actions that take effect immediately — when changes require a save/submit action, use a checkbox instead.

<ComponentPreview center>

```html
<form id="settings-form">
  <ore-switch name="notifications" value="enabled" checked> Push notifications </ore-switch>
  <ore-switch name="darkMode" value="on"> Dark mode </ore-switch>
  <ore-switch name="analytics" value="track"> Analytics tracking </ore-switch>
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
<ore-switch id="feature-toggle">Enable feature</ore-switch>
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
import '@vielzeug/refine/switch';

function SettingsPanel() {
  const [notifications, setNotifications] = useState(true);

  return (
    <ore-switch checked={notifications} onChange={(e) => setNotifications(e.detail.checked)}>
      Enable notifications
    </ore-switch>
  );
}
```

### Vue

```vue
<template>
  <ore-switch :checked="notifications" @change="notifications = $event.detail.checked"> Enable notifications </ore-switch>
</template>

<script setup>
import { ref } from 'vue';
import '@vielzeug/refine/switch';

const notifications = ref(true);
</script>
```

### Svelte

```svelte
<script>
  import '@vielzeug/refine/switch';
  let notifications = true;
</script>

<ore-switch
  checked={notifications}
  on:change={(e) => notifications = e.detail.checked}
>
  Enable notifications
</ore-switch>
```

## API Reference

**`ore-switch`**

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

| Property              | Description                           | Default         |
| --------------------- | ------------------------------------- | --------------- |
| `--switch-width`      | Track width                           | Size-dependent  |
| `--switch-height`     | Track height                          | Size-dependent  |
| `--switch-track-bg`   | Inactive (unchecked) track background | Theme-dependent |
| `--switch-checked-bg` | Active (checked) track background     | Color-dependent |
| `--switch-thumb-bg`   | Thumb background color                | Theme-dependent |
| `--switch-font-size`  | Label font size                       | Size-dependent  |

## Accessibility

The switch component follows WCAG 2.1 Level AA standards.

The component uses `role="switch"` with `aria-checked` reflecting the on/off state (`"true"` or `"false"`). `aria-labelledby` links the label; `aria-describedby` links helper and error text. `aria-disabled` reflects the disabled state. A minimum 44 × 44 px touch target is enforced for mobile usability.

Keyboard navigation is fully supported: `Space` and `Enter` toggle the switch, and `Tab` moves focus to and from the control. Always provide a visible text label — use clear labels that describe what the switch controls; if a switch must be icon-only, supply an `aria-label` so screen readers can announce the purpose.
