# Checkbox Component

A customizable checkbox component with multiple colors, sizes, and states. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- 🌈 **5 Semantic Colors**: primary, secondary, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- ♿ **Accessible**: Full keyboard support, ARIA attributes, screen reader friendly
- 🎭 **States**: checked, unchecked, indeterminate, disabled
- 🔧 **Customizable**: CSS custom properties for styling
- 🌙 **Theme Support**: Works with light/dark mode
- 📋 **Form Integration**: Native form support with name and value attributes

## Basic Usage

```html
<!DOCTYPE html>
<html>
  <body>
    <bit-checkbox>Accept terms and conditions</bit-checkbox>
    <bit-checkbox checked>Subscribe to newsletter</bit-checkbox>
    <bit-checkbox disabled>Disabled option</bit-checkbox>

    <script type="module">
      import '@vielzeug/buildit/checkbox';
    </script>
  </body>
</html>
```

## Colors

Five semantic colors for different contexts:

<ClientOnly>
  <div class="demo-container">
    <bit-checkbox checked color="primary">Primary</bit-checkbox>
    <bit-checkbox checked color="secondary">Secondary</bit-checkbox>
    <bit-checkbox checked color="success">Success</bit-checkbox>
    <bit-checkbox checked color="warning">Warning</bit-checkbox>
    <bit-checkbox checked color="error">Error</bit-checkbox>
  </div>
</ClientOnly>

```html
<bit-checkbox checked color="primary">Primary</bit-checkbox>
<bit-checkbox checked color="secondary">Secondary</bit-checkbox>
<bit-checkbox checked color="success">Success</bit-checkbox>
<bit-checkbox checked color="warning">Warning</bit-checkbox>
<bit-checkbox checked color="error">Error</bit-checkbox>
```

**Use cases:**
- **Primary**: Default selection, general purpose
- **Secondary**: Alternative selections
- **Success**: Confirmations, positive actions
- **Warning**: Caution, important selections
- **Error**: Destructive or critical selections

## Sizes

Three sizes for different contexts:

<ClientOnly>
  <div class="demo-container">
    <bit-checkbox checked size="sm">Small</bit-checkbox>
    <bit-checkbox checked size="md">Medium</bit-checkbox>
    <bit-checkbox checked size="lg">Large</bit-checkbox>
  </div>
</ClientOnly>

```html
<bit-checkbox checked size="sm">Small</bit-checkbox>
<bit-checkbox checked size="md">Medium</bit-checkbox>
<bit-checkbox checked size="lg">Large</bit-checkbox>
```

## States

### Checked

Set the initial checked state:

<ClientOnly>
  <div class="demo-container">
    <bit-checkbox>Unchecked</bit-checkbox>
    <bit-checkbox checked>Checked</bit-checkbox>
  </div>
</ClientOnly>

```html
<bit-checkbox>Unchecked</bit-checkbox>
<bit-checkbox checked>Checked</bit-checkbox>
```

### Indeterminate

Show an indeterminate state (useful for "select all" checkboxes):

<ClientOnly>
  <div class="demo-container">
    <bit-checkbox indeterminate>Indeterminate</bit-checkbox>
    <bit-checkbox checked indeterminate>Indeterminate (ignored when checked)</bit-checkbox>
  </div>
</ClientOnly>

```html
<bit-checkbox indeterminate>Indeterminate</bit-checkbox>
```

::: tip Select All Pattern
The indeterminate state is commonly used for "select all" checkboxes when some (but not all) items are selected. When clicked, it typically transitions to the checked state.
:::

### Disabled

Prevent interaction and reduce opacity:

<ClientOnly>
  <div class="demo-container">
    <bit-checkbox disabled>Disabled unchecked</bit-checkbox>
    <bit-checkbox checked disabled>Disabled checked</bit-checkbox>
    <bit-checkbox indeterminate disabled>Disabled indeterminate</bit-checkbox>
  </div>
</ClientOnly>

```html
<bit-checkbox disabled>Disabled unchecked</bit-checkbox>
<bit-checkbox checked disabled>Disabled checked</bit-checkbox>
<bit-checkbox indeterminate disabled>Disabled indeterminate</bit-checkbox>
```

## Form Integration

Checkboxes work seamlessly with native HTML forms:

<ClientOnly>
  <div class="demo-container">
    <form style="display: flex; flex-direction: column; gap: 0.75rem;" onsubmit="event.preventDefault(); alert('Form submitted!')">
      <bit-checkbox name="newsletter" value="yes" checked>Subscribe to newsletter</bit-checkbox>
      <bit-checkbox name="terms" value="accepted">I accept the terms and conditions</bit-checkbox>
      <bit-checkbox name="marketing" value="yes">Receive marketing emails</bit-checkbox>
      <bit-button type="submit" style="margin-top: 0.5rem; align-self: flex-start;">Submit</bit-button>
    </form>
  </div>
</ClientOnly>

```html
<form>
  <bit-checkbox name="newsletter" value="yes" checked>
    Subscribe to newsletter
  </bit-checkbox>
  <bit-checkbox name="terms" value="accepted">
    I accept the terms and conditions
  </bit-checkbox>
  <bit-button type="submit">Submit</bit-button>
</form>
```

**Form attributes:**
- `name` - Field name for form submission
- `value` - Value when checked (defaults to empty string)
- `checked` - Initial checked state

## Custom Styling

Customize appearance using CSS custom properties:

<ClientOnly>
  <div class="demo-container">
    <bit-checkbox checked style="--checkbox-size: 2rem; --checkbox-radius: 50%; --checkbox-checked-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      Custom Gradient
    </bit-checkbox>
    <bit-checkbox checked style="--checkbox-size: 1.75rem; --checkbox-checked-bg: #ff6b6b; --checkbox-radius: 0.25rem;">
      Custom Color
    </bit-checkbox>
  </div>
</ClientOnly>

```html
<bit-checkbox 
  checked
  style="
    --checkbox-size: 2rem;
    --checkbox-radius: 50%;
    --checkbox-checked-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  ">
  Custom Gradient
</bit-checkbox>
```

### Available CSS Custom Properties

#### Size & Shape
- `--checkbox-size` - Size of the checkbox square
- `--checkbox-radius` - Border radius
- `--checkbox-font-size` - Label font size

#### Colors
- `--checkbox-bg` - Background color (unchecked)
- `--checkbox-border-color` - Border color (unchecked)
- `--checkbox-checked-bg` - Background color when checked
- `--checkbox-color` - Checkmark color

## Event Handling

Listen to the `change` event to respond to checkbox state changes:

```html
<bit-checkbox id="myCheckbox">Enable feature</bit-checkbox>

<script>
  const checkbox = document.getElementById('myCheckbox');
  
  checkbox.addEventListener('change', (event) => {
    const { checked, value } = event.detail;
    console.log('Checked:', checked);
    console.log('Value:', value);
  });
</script>
```

## API Reference

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `checked` | `boolean` | `false` | Checkbox checked state |
| `disabled` | `boolean` | `false` | Disable the checkbox |
| `indeterminate` | `boolean` | `false` | Show indeterminate state |
| `color` | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Checkbox size |
| `name` | `string` | - | Form field name |
| `value` | `string` | - | Form field value when checked |

### Slots

| Slot | Description |
|------|-------------|
| (default) | Checkbox label content |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `change` | `{ checked: boolean, value: string, originalEvent: Event }` | Emitted when checked state changes |

## Accessibility

The checkbox component follows WAI-ARIA best practices:

✅ **Keyboard Navigation**
- `Space` and `Enter` toggle the checkbox
- `Tab` moves focus to/from the checkbox

✅ **Screen Readers**
- Announces checkbox role and label
- `aria-checked` reflects current state (true, false, mixed)
- `aria-disabled` when disabled
- Proper focus management

✅ **Focus Management**
- Visible focus indicators
- Focus is maintained after toggling
- Disabled checkboxes cannot receive focus

### Best Practices

**Do:**
- Use clear, concise labels
- Group related checkboxes logically
- Use indeterminate state for "select all" patterns
- Provide sufficient touch targets (minimum 44×44px)

**Don't:**
- Use checkboxes for mutually exclusive options (use radio buttons)
- Rely solely on color to communicate state
- Use checkbox without a label
- Use disabled state to hide unavailable options (remove instead)

## Browser Support

Requires modern browsers with Web Components support:

- Chrome 77+
- Firefox 93+
- Safari 16.4+
- Edge 79+

## Examples

### Terms and Conditions

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; background: var(--color-contrast-100); border-radius: 0.5rem;">
      <bit-checkbox name="terms" value="accepted">
        I agree to the <a href="#" style="color: var(--color-primary);">Terms and Conditions</a>
      </bit-checkbox>
      <bit-checkbox name="privacy" value="accepted">
        I have read the <a href="#" style="color: var(--color-primary);">Privacy Policy</a>
      </bit-checkbox>
      <bit-checkbox name="age" value="confirmed">
        I confirm I am 18 years or older
      </bit-checkbox>
    </div>
  </div>
</ClientOnly>

```html
<bit-checkbox name="terms" value="accepted">
  I agree to the <a href="#">Terms and Conditions</a>
</bit-checkbox>
<bit-checkbox name="privacy" value="accepted">
  I have read the <a href="#">Privacy Policy</a>
</bit-checkbox>
```

### Preferences

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <h4 style="margin: 0 0 0.5rem 0; font-size: var(--text-md); font-weight: 600;">Notification Preferences</h4>
      <bit-checkbox checked color="primary">Email notifications</bit-checkbox>
      <bit-checkbox color="primary">Push notifications</bit-checkbox>
      <bit-checkbox checked color="primary">SMS alerts</bit-checkbox>
      <bit-checkbox disabled color="primary">Phone calls (Premium only)</bit-checkbox>
    </div>
  </div>
</ClientOnly>

```html
<h4>Notification Preferences</h4>
<bit-checkbox checked color="primary">Email notifications</bit-checkbox>
<bit-checkbox color="primary">Push notifications</bit-checkbox>
<bit-checkbox checked color="primary">SMS alerts</bit-checkbox>
<bit-checkbox disabled color="primary">Phone calls (Premium only)</bit-checkbox>
```

### Select All Pattern

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; border: 1px solid var(--color-contrast-400); border-radius: 0.5rem;">
      <bit-checkbox id="selectAll" indeterminate size="lg" style="font-weight: 600; border-bottom: 1px solid var(--color-contrast-400); padding-bottom: 0.5rem;">
        Select All
      </bit-checkbox>
      <bit-checkbox checked class="item">Item 1</bit-checkbox>
      <bit-checkbox class="item">Item 2</bit-checkbox>
      <bit-checkbox checked class="item">Item 3</bit-checkbox>
      <bit-checkbox class="item">Item 4</bit-checkbox>
    </div>
  </div>
</ClientOnly>

```html
<bit-checkbox id="selectAll" indeterminate>Select All</bit-checkbox>
<bit-checkbox checked class="item">Item 1</bit-checkbox>
<bit-checkbox class="item">Item 2</bit-checkbox>
<bit-checkbox checked class="item">Item 3</bit-checkbox>
<bit-checkbox class="item">Item 4</bit-checkbox>

<script>
  const selectAll = document.getElementById('selectAll');
  const items = document.querySelectorAll('.item');
  
  selectAll.addEventListener('change', (e) => {
    items.forEach(item => {
      if (e.detail.checked) {
        item.setAttribute('checked', '');
      } else {
        item.removeAttribute('checked');
      }
    });
  });
  
  // Update selectAll state based on items
  function updateSelectAll() {
    const checkedCount = Array.from(items).filter(i => i.hasAttribute('checked')).length;
    
    if (checkedCount === 0) {
      selectAll.removeAttribute('checked');
      selectAll.removeAttribute('indeterminate');
    } else if (checkedCount === items.length) {
      selectAll.setAttribute('checked', '');
      selectAll.removeAttribute('indeterminate');
    } else {
      selectAll.removeAttribute('checked');
      selectAll.setAttribute('indeterminate', '');
    }
  }
  
  items.forEach(item => {
    item.addEventListener('change', updateSelectAll);
  });
</script>
```

### Color-Coded Tasks

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <bit-checkbox checked color="success">Complete project proposal</bit-checkbox>
      <bit-checkbox checked color="success">Review design mockups</bit-checkbox>
      <bit-checkbox color="warning">Schedule client meeting</bit-checkbox>
      <bit-checkbox color="error">Fix critical bug in production</bit-checkbox>
      <bit-checkbox color="primary">Update documentation</bit-checkbox>
    </div>
  </div>
</ClientOnly>

```html
<bit-checkbox checked color="success">Complete project proposal</bit-checkbox>
<bit-checkbox checked color="success">Review design mockups</bit-checkbox>
<bit-checkbox color="warning">Schedule client meeting</bit-checkbox>
<bit-checkbox color="error">Fix critical bug in production</bit-checkbox>
<bit-checkbox color="primary">Update documentation</bit-checkbox>
```

## Related Components

- **Radio** - For mutually exclusive selections (coming soon)
- **Switch** - For on/off toggles (coming soon)
- **Checkbox Group** - Group related checkboxes (coming soon)

## Source Code

- [Checkbox Component](https://github.com/helmuthdu/vielzeug/tree/main/packages/buildit/src/form/checkbox)
- [Tests](https://github.com/helmuthdu/vielzeug/tree/main/packages/buildit/src/form/checkbox/__tests__)

