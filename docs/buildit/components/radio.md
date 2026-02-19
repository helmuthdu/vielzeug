# Radio Component

A customizable radio button component with multiple colors, sizes, and states. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- 🌈 **5 Semantic Colors**: primary, secondary, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- ♿ **Accessible**: Full keyboard support, ARIA attributes, screen reader friendly, arrow key navigation
- 🎭 **States**: checked, unchecked, disabled
- 🔧 **Customizable**: CSS custom properties for styling
- 🌙 **Theme Support**: Works with light/dark mode
- 📋 **Form Integration**: Native form support with name and value attributes
- 🎯 **Radio Group**: Mutually exclusive selection within groups

## Basic Usage

```html
<!DOCTYPE html>
<html>
  <body>
    <bit-radio name="size" value="small" checked>Small</bit-radio>
    <bit-radio name="size" value="medium">Medium</bit-radio>
    <bit-radio name="size" value="large">Large</bit-radio>

    <script type="module">
      import '@vielzeug/buildit/radio';
    </script>
  </body>
</html>
```

::: tip Radio Groups
Radio buttons with the same `name` attribute form a group where only one can be selected at a time. The `name` attribute is required for proper radio button behavior.
:::

## Colors

Five semantic colors for different contexts:

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <bit-radio checked name="color-demo-1" color="primary">Primary</bit-radio>
      <bit-radio checked name="color-demo-2" color="secondary">Secondary</bit-radio>
      <bit-radio checked name="color-demo-3" color="success">Success</bit-radio>
      <bit-radio checked name="color-demo-4" color="warning">Warning</bit-radio>
      <bit-radio checked name="color-demo-5" color="error">Error</bit-radio>
    </div>
  </div>
</ClientOnly>

```html
<bit-radio name="option" color="primary">Primary</bit-radio>
<bit-radio name="option" color="secondary">Secondary</bit-radio>
<bit-radio name="option" color="success">Success</bit-radio>
<bit-radio name="option" color="warning">Warning</bit-radio>
<bit-radio name="option" color="error">Error</bit-radio>
```

**Use cases:**
- **Primary**: Default selection, general purpose
- **Secondary**: Alternative selections
- **Success**: Confirmations, positive choices
- **Warning**: Important selections requiring attention
- **Error**: Critical or destructive choices

## Sizes

Three sizes for different contexts:

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <bit-radio checked name="size-sm" size="sm">Small</bit-radio>
      <bit-radio checked name="size-md" size="md">Medium</bit-radio>
      <bit-radio checked name="size-lg" size="lg">Large</bit-radio>
    </div>
  </div>
</ClientOnly>

```html
<bit-radio checked name="size-sm" size="sm">Small</bit-radio>
<bit-radio checked name="size-md" size="md">Medium</bit-radio>
<bit-radio checked name="size-lg" size="lg">Large</bit-radio>
```

## States

### Checked

Only one radio in a group can be checked at a time:

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <bit-radio name="state-demo" value="option1">Option 1</bit-radio>
      <bit-radio name="state-demo" value="option2" checked>Option 2 (checked)</bit-radio>
      <bit-radio name="state-demo" value="option3">Option 3</bit-radio>
    </div>
  </div>
</ClientOnly>

```html
<bit-radio name="choice" value="option1">Option 1</bit-radio>
<bit-radio name="choice" value="option2" checked>Option 2 (checked)</bit-radio>
<bit-radio name="choice" value="option3">Option 3</bit-radio>
```

### Disabled

Prevent interaction and reduce opacity:

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <bit-radio name="disabled-demo-1" disabled>Disabled unchecked</bit-radio>
      <bit-radio name="disabled-demo-2" checked disabled>Disabled checked</bit-radio>
    </div>
  </div>
</ClientOnly>

```html
<bit-radio name="option1" disabled>Disabled unchecked</bit-radio>
<bit-radio name="option2" checked disabled>Disabled checked</bit-radio>
```

## Form Integration

Radio buttons work seamlessly with native HTML forms:

<ClientOnly>
  <div class="demo-container">
    <form style="display: flex; flex-direction: column; gap: 0.75rem;" onsubmit="event.preventDefault(); alert('Selected: ' + new FormData(event.target).get('plan'))">
      <h4 style="margin: 0 0 0.5rem 0; font-size: var(--text-md); font-weight: 600;">Choose a plan</h4>
      <bit-radio name="plan" value="free">Free - $0/month</bit-radio>
      <bit-radio name="plan" value="pro" checked>Pro - $10/month</bit-radio>
      <bit-radio name="plan" value="enterprise">Enterprise - $50/month</bit-radio>
      <bit-button type="submit" style="margin-top: 0.5rem; align-self: flex-start;">Submit</bit-button>
    </form>
  </div>
</ClientOnly>

```html
<form>
  <bit-radio name="plan" value="free">Free - $0/month</bit-radio>
  <bit-radio name="plan" value="pro" checked>Pro - $10/month</bit-radio>
  <bit-radio name="plan" value="enterprise">Enterprise - $50/month</bit-radio>
  <bit-button type="submit">Submit</bit-button>
</form>
```

**Form attributes:**
- `name` - Field name for form submission (required for grouping)
- `value` - Value when selected
- `checked` - Initial checked state

## Custom Styling

Customize appearance using CSS custom properties:

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <bit-radio name="custom-1" checked style="--radio-size: 2rem; --radio-checked-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        Custom Gradient
      </bit-radio>
      <bit-radio name="custom-2" checked style="--radio-size: 1.75rem; --radio-checked-bg: #ff6b6b;">
        Custom Color
      </bit-radio>
    </div>
  </div>
</ClientOnly>

```html
<bit-radio 
  checked
  name="custom"
  style="
    --radio-size: 2rem;
    --radio-checked-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  ">
  Custom Gradient
</bit-radio>
```

### Available CSS Custom Properties

#### Size & Shape
- `--radio-size` - Size of the radio circle
- `--radio-font-size` - Label font size

#### Colors
- `--radio-bg` - Background color (unchecked)
- `--radio-border-color` - Border color (unchecked)
- `--radio-checked-bg` - Background color when checked
- `--radio-color` - Inner dot color

## Event Handling

Listen to the `change` event to respond to radio selection changes:

```html
<bit-radio name="notification" value="email" id="emailRadio">Email</bit-radio>
<bit-radio name="notification" value="sms">SMS</bit-radio>
<bit-radio name="notification" value="push">Push</bit-radio>

<script>
  const radios = document.querySelectorAll('bit-radio[name="notification"]');
  
  radios.forEach(radio => {
    radio.addEventListener('change', (event) => {
      const { checked, value } = event.detail;
      if (checked) {
        console.log('Selected:', value);
      }
    });
  });
</script>
```

## API Reference

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `checked` | `boolean` | `false` | Radio button checked state |
| `disabled` | `boolean` | `false` | Disable the radio button |
| `color` | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Radio button size |
| `name` | `string` | - | Form field name (required for grouping) |
| `value` | `string` | - | Form field value when checked |

### Slots

| Slot | Description |
|------|-------------|
| (default) | Radio button label content |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `change` | `{ checked: boolean, value: string, originalEvent: Event }` | Emitted when checked state changes (only when becoming checked) |

## Accessibility

The radio button component follows WAI-ARIA best practices:

✅ **Keyboard Navigation**
- `Space` and `Enter` select the radio button
- `Tab` moves focus to/from the radio group
- `Arrow Up/Left` moves to previous radio in the group
- `Arrow Down/Right` moves to next radio in the group

✅ **Screen Readers**
- Announces radio role and label
- `aria-checked` reflects current state
- `aria-disabled` when disabled
- Proper focus management within groups

✅ **Focus Management**
- Visible focus indicators
- Focus moves with arrow keys within the same radio group
- Disabled radios cannot receive focus

### Best Practices

**Do:**
- Always use the `name` attribute to group related radios
- Provide clear, distinct labels for each option
- Use semantic colors to communicate meaning
- Provide a default selection when appropriate
- Group related radios visually (fieldset/legend)

**Don't:**
- Use radio buttons for non-mutually exclusive options (use checkboxes)
- Have only one radio button (use checkbox instead)
- Rely solely on color to communicate state
- Use radio buttons without labels
- Mix different radio groups without clear separation

## Browser Support

Requires modern browsers with Web Components support:

- Chrome 77+
- Firefox 93+
- Safari 16.4+
- Edge 79+

## Examples

### Product Selection

<ClientOnly>
  <div class="demo-container">
    <div style="padding: 1rem; background: var(--color-contrast-100); border-radius: 0.5rem;">
      <h4 style="margin: 0 0 1rem 0; font-size: var(--text-md); font-weight: 600;">Choose a product</h4>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <bit-radio name="product" value="basic" checked>
          Basic Plan - Perfect for individuals
        </bit-radio>
        <bit-radio name="product" value="professional">
          Professional Plan - For growing teams
        </bit-radio>
        <bit-radio name="product" value="enterprise">
          Enterprise Plan - Advanced features
        </bit-radio>
      </div>
    </div>
  </div>
</ClientOnly>

```html
<h4>Choose a product</h4>
<bit-radio name="product" value="basic" checked>
  Basic Plan - Perfect for individuals
</bit-radio>
<bit-radio name="product" value="professional">
  Professional Plan - For growing teams
</bit-radio>
<bit-radio name="product" value="enterprise">
  Enterprise Plan - Advanced features
</bit-radio>
```

### Payment Method

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <h4 style="margin: 0 0 0.5rem 0; font-size: var(--text-md); font-weight: 600;">Payment Method</h4>
      <bit-radio name="payment" value="card" checked color="primary">
        💳 Credit Card
      </bit-radio>
      <bit-radio name="payment" value="paypal" color="primary">
        🅿️ PayPal
      </bit-radio>
      <bit-radio name="payment" value="bank" color="primary">
        🏦 Bank Transfer
      </bit-radio>
    </div>
  </div>
</ClientOnly>

```html
<h4>Payment Method</h4>
<bit-radio name="payment" value="card" checked color="primary">
  💳 Credit Card
</bit-radio>
<bit-radio name="payment" value="paypal" color="primary">
  🅿️ PayPal
</bit-radio>
<bit-radio name="payment" value="bank" color="primary">
  🏦 Bank Transfer
</bit-radio>
```

### Difficulty Level

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <h4 style="margin: 0 0 0.5rem 0; font-size: var(--text-md); font-weight: 600;">Select Difficulty</h4>
      <bit-radio name="difficulty" value="easy" color="success" checked>
        Easy - Recommended for beginners
      </bit-radio>
      <bit-radio name="difficulty" value="medium" color="warning">
        Medium - Some experience required
      </bit-radio>
      <bit-radio name="difficulty" value="hard" color="error">
        Hard - For experienced users only
      </bit-radio>
    </div>
  </div>
</ClientOnly>

```html
<h4>Select Difficulty</h4>
<bit-radio name="difficulty" value="easy" color="success" checked>
  Easy - Recommended for beginners
</bit-radio>
<bit-radio name="difficulty" value="medium" color="warning">
  Medium - Some experience required
</bit-radio>
<bit-radio name="difficulty" value="hard" color="error">
  Hard - For experienced users only
</bit-radio>
```

### Survey Question

<ClientOnly>
  <div class="demo-container">
    <div style="padding: 1rem; border: 1px solid var(--color-contrast-400); border-radius: 0.5rem;">
      <h4 style="margin: 0 0 1rem 0; font-size: var(--text-md); font-weight: 600;">
        How satisfied are you with our service?
      </h4>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <bit-radio name="satisfaction" value="5" color="success">
          ⭐⭐⭐⭐⭐ Very Satisfied
        </bit-radio>
        <bit-radio name="satisfaction" value="4" color="success">
          ⭐⭐⭐⭐ Satisfied
        </bit-radio>
        <bit-radio name="satisfaction" value="3" color="warning" checked>
          ⭐⭐⭐ Neutral
        </bit-radio>
        <bit-radio name="satisfaction" value="2" color="error">
          ⭐⭐ Dissatisfied
        </bit-radio>
        <bit-radio name="satisfaction" value="1" color="error">
          ⭐ Very Dissatisfied
        </bit-radio>
      </div>
    </div>
  </div>
</ClientOnly>

```html
<h4>How satisfied are you with our service?</h4>
<bit-radio name="satisfaction" value="5" color="success">
  ⭐⭐⭐⭐⭐ Very Satisfied
</bit-radio>
<bit-radio name="satisfaction" value="4" color="success">
  ⭐⭐⭐⭐ Satisfied
</bit-radio>
<bit-radio name="satisfaction" value="3" color="warning" checked>
  ⭐⭐⭐ Neutral
</bit-radio>
<bit-radio name="satisfaction" value="2" color="error">
  ⭐⭐ Dissatisfied
</bit-radio>
<bit-radio name="satisfaction" value="1" color="error">
  ⭐ Very Dissatisfied
</bit-radio>
```

### With Dynamic JavaScript

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <h4 style="margin: 0 0 0.5rem 0; font-size: var(--text-md); font-weight: 600;">Theme Preference</h4>
      <bit-radio name="theme" value="light" id="themeLight" checked>
        ☀️ Light Mode
      </bit-radio>
      <bit-radio name="theme" value="dark" id="themeDark">
        🌙 Dark Mode
      </bit-radio>
      <bit-radio name="theme" value="auto" id="themeAuto">
        🔄 Auto (System)
      </bit-radio>
      <div id="themeResult" style="margin-top: 0.5rem; padding: 0.75rem; background: var(--color-primary); color: white; border-radius: 0.25rem; font-size: var(--text-sm);">
        Selected: Light Mode
      </div>
    </div>
  </div>
</ClientOnly>

```html
<h4>Theme Preference</h4>
<bit-radio name="theme" value="light" id="themeLight" checked>
  ☀️ Light Mode
</bit-radio>
<bit-radio name="theme" value="dark" id="themeDark">
  🌙 Dark Mode
</bit-radio>
<bit-radio name="theme" value="auto" id="themeAuto">
  🔄 Auto (System)
</bit-radio>
<div id="themeResult"></div>

<script>
  const radios = document.querySelectorAll('bit-radio[name="theme"]');
  const result = document.getElementById('themeResult');
  
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const labels = {
        light: '☀️ Light Mode',
        dark: '🌙 Dark Mode',
        auto: '🔄 Auto (System)'
      };
      result.textContent = `Selected: ${labels[e.detail.value]}`;
    });
  });
</script>
```

<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  // Handle theme selection example
  if (typeof window !== 'undefined') {
    const themeRadios = document.querySelectorAll('bit-radio[name="theme"]');
    const themeResult = document.getElementById('themeResult');
    
    if (themeRadios.length && themeResult) {
      themeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          const labels = {
            light: '☀️ Light Mode',
            dark: '🌙 Dark Mode',
            auto: '🔄 Auto (System)'
          };
          themeResult.textContent = `Selected: ${labels[e.detail.value]}`;
        });
      });
    }
  }
});
</script>

## Radio vs Checkbox

When to use radio buttons vs checkboxes:

| Feature | Radio Button | Checkbox |
|---------|--------------|----------|
| **Selection** | Single choice from multiple options | Multiple independent choices |
| **Grouping** | Requires `name` attribute for grouping | Optional grouping |
| **Uncheck** | Cannot uncheck (select different option instead) | Can toggle on/off |
| **Use Cases** | Payment method, plan selection, difficulty level | Terms acceptance, feature toggles, preferences |

## Related Components

- **Checkbox** - For multiple independent selections
- **Switch** - For on/off toggles (coming soon)
- **Radio Group** - Wrapper for radio button groups (coming soon)

## Source Code

- [Radio Component](https://github.com/helmuthdu/vielzeug/tree/main/packages/buildit/src/form/radio)
- [Tests](https://github.com/helmuthdu/vielzeug/tree/main/packages/buildit/src/form/radio/__tests__)

