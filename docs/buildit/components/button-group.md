# Button Group Component

A container component for grouping buttons together with consistent styling and behavior. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- 🔄 **2 Orientations**: horizontal, vertical
- 🔗 **Attached Mode**: Connect buttons with shared borders
- 📏 **Attribute Propagation**: Apply size, variant, and color to all children
- 📐 **Full Width**: Buttons expand to fill container
- ♿ **Accessible**: Proper ARIA roles and keyboard navigation
- 🌙 **Theme Support**: Works with light/dark mode

## Basic Usage

```html
<!DOCTYPE html>
<html>
  <body>
    <bit-button-group>
      <bit-button>First</bit-button>
      <bit-button>Second</bit-button>
      <bit-button>Third</bit-button>
    </bit-button-group>

    <script type="module">
      import '@vielzeug/buildit/button';
      import '@vielzeug/buildit/button-group';
    </script>
  </body>
</html>
```

## Orientation

### Horizontal (Default)

<ComponentPreview>

```html
<bit-button-group>
  <bit-button>Left</bit-button>
  <bit-button>Center</bit-button>
  <bit-button>Right</bit-button>
</bit-button-group>
```

</ComponentPreview>

### Vertical

<ComponentPreview>

```html
<bit-button-group orientation="vertical">
  <bit-button>Top</bit-button>
  <bit-button>Middle</bit-button>
  <bit-button>Bottom</bit-button>
</bit-button-group>
```

</ComponentPreview>

## Attached Mode

Remove spacing and connect buttons with shared borders:

<ComponentPreview>

```html
<bit-button-group attached>
  <bit-button variant="bordered">Day</bit-button>
  <bit-button variant="solid">Week</bit-button>
  <bit-button variant="bordered">Month</bit-button>
</bit-button-group>
```

</ComponentPreview>

<ComponentPreview>

```html
<bit-button-group orientation="vertical" attached>
  <bit-button variant="bordered">Option 1</bit-button>
  <bit-button variant="bordered">Option 2</bit-button>
  <bit-button variant="bordered">Option 3</bit-button>
</bit-button-group>
```

</ComponentPreview>

## Attribute Propagation

Apply size, variant, or color to all child buttons automatically:

<ComponentPreview>

```html
<bit-button-group size="lg">
  <bit-button>Large 1</bit-button>
  <bit-button>Large 2</bit-button>
  <bit-button>Large 3</bit-button>
</bit-button-group>
```

</ComponentPreview>

<ComponentPreview>

```html
<bit-button-group variant="outline">
  <bit-button>Outline 1</bit-button>
  <bit-button>Outline 2</bit-button>
  <bit-button>Outline 3</bit-button>
</bit-button-group>
```

</ComponentPreview>

<ComponentPreview>

```html
<bit-button-group color="secondary">
  <bit-button>Secondary 1</bit-button>
  <bit-button>Secondary 2</bit-button>
  <bit-button>Secondary 3</bit-button>
</bit-button-group>
```

</ComponentPreview>

<ComponentPreview>

```html
<bit-button-group variant="solid" color="primary" size="sm">
  <bit-button>Combined 1</bit-button>
  <bit-button>Combined 2</bit-button>
  <bit-button>Combined 3</bit-button>
</bit-button-group>
```

</ComponentPreview>

## Full Width

Buttons expand to fill the container:

<ComponentPreview>

```html
<bit-button-group full-width>
  <bit-button>Left</bit-button>
  <bit-button>Center</bit-button>
  <bit-button>Right</bit-button>
</bit-button-group>
```

</ComponentPreview>

## Real-World Examples

### Segmented Control

<ComponentPreview>

```html
<bit-button-group attached>
  <bit-button variant="bordered">Day</bit-button>
  <bit-button variant="solid">Week</bit-button>
  <bit-button variant="bordered">Month</bit-button>
  <bit-button variant="bordered">Year</bit-button>
</bit-button-group>
```

</ComponentPreview>

### Toolbar

<ComponentPreview>

```html
<bit-button-group attached size="sm">
  <bit-button variant="ghost" icon-only aria-label="Bold">
    <strong>B</strong>
  </bit-button>
  <bit-button variant="ghost" icon-only aria-label="Italic">
    <em>I</em>
  </bit-button>
  <bit-button variant="ghost" icon-only aria-label="Underline">
    <u>U</u>
  </bit-button>
</bit-button-group>
```

</ComponentPreview>

### View Switcher

<ComponentPreview>

```html
<bit-button-group attached>
  <bit-button variant="bordered" icon-only aria-label="List view"> ☰ </bit-button>
  <bit-button variant="solid" icon-only aria-label="Grid view"> ▦ </bit-button>
</bit-button-group>
```

</ComponentPreview>

### Action Group

<ComponentPreview>

```html
<bit-button-group>
  <bit-button variant="solid" color="success">Save</bit-button>
  <bit-button variant="outline" color="secondary">Cancel</bit-button>
  <bit-button variant="ghost" color="error">Delete</bit-button>
</bit-button-group>
```

</ComponentPreview>

### Pagination

<ComponentPreview>

```html
<bit-button-group attached size="sm">
  <bit-button variant="bordered" disabled>Previous</bit-button>
  <bit-button variant="bordered">1</bit-button>
  <bit-button variant="solid">2</bit-button>
  <bit-button variant="bordered">3</bit-button>
  <bit-button variant="bordered">Next</bit-button>
</bit-button-group>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute     | Type                                                                | Default        | Description                        |
| ------------- | ------------------------------------------------------------------- | -------------- | ---------------------------------- |
| `orientation` | `'horizontal' \| 'vertical'`                                        | `'horizontal'` | Group layout direction             |
| `size`        | `'sm' \| 'md' \| 'lg'`                                              | -              | Apply size to all child buttons    |
| `variant`     | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text'` | -              | Apply variant to all child buttons |
| `color`       | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'`     | -              | Apply color to all child buttons   |
| `attached`    | `boolean`                                                           | `false`        | Remove spacing and connect buttons |
| `full-width`  | `boolean`                                                           | `false`        | Buttons expand to fill container   |

### Slots

| Slot      | Description           |
| --------- | --------------------- |
| (default) | Child button elements |

### CSS Custom Properties

| Property         | Description                                           | Default    |
| ---------------- | ----------------------------------------------------- | ---------- |
| `--group-gap`    | Spacing between buttons                               | `0.5rem`   |
| `--group-radius` | Border radius for first/last buttons in attached mode | `0.375rem` |

## Framework Integration

::: code-group

```tsx [React]
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/button-group';

function ViewSwitcher() {
  const [view, setView] = useState('list');

  return (
    <bit-button-group attached>
      <bit-button variant={view === 'list' ? 'solid' : 'bordered'} onClick={() => setView('list')}>
        List
      </bit-button>
      <bit-button variant={view === 'grid' ? 'solid' : 'bordered'} onClick={() => setView('grid')}>
        Grid
      </bit-button>
    </bit-button-group>
  );
}
```

```vue [Vue]
<template>
  <bit-button-group attached>
    <bit-button :variant="view === 'list' ? 'solid' : 'bordered'" @click="view = 'list'"> List </bit-button>
    <bit-button :variant="view === 'grid' ? 'solid' : 'bordered'" @click="view = 'grid'"> Grid </bit-button>
  </bit-button-group>
</template>

<script setup>
import { ref } from 'vue';
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/button-group';

const view = ref('list');
</script>
```

```svelte [Svelte]
<script>
  import '@vielzeug/buildit/button';
  import '@vielzeug/buildit/button-group';

  let view = 'list';
</script>

<bit-button-group attached>
  <bit-button
    variant={view === 'list' ? 'solid' : 'bordered'}
    on:click={() => view = 'list'}>
    List
  </bit-button>
  <bit-button
    variant={view === 'grid' ? 'solid' : 'bordered'}
    on:click={() => view = 'grid'}>
    Grid
  </bit-button>
</bit-button-group>
```

:::

## Accessibility

### ARIA Attributes

The button group automatically includes `role="group"` for proper semantic structure.

```html
<!-- Add aria-label for context -->
<bit-button-group aria-label="Text formatting">
  <bit-button icon-only aria-label="Bold">B</bit-button>
  <bit-button icon-only aria-label="Italic">I</bit-button>
  <bit-button icon-only aria-label="Underline">U</bit-button>
</bit-button-group>
```

### Keyboard Navigation

- **Tab** – Navigate between buttons
- **Enter/Space** – Activate focused button
- All child buttons remain keyboard accessible in attached mode

### Best Practices

✅ **Always label icon-only buttons**

```html
<bit-button icon-only aria-label="Settings">⚙️</bit-button>
```

✅ **Provide group context with aria-label**

```html
<bit-button-group aria-label="View options"> ... </bit-button-group>
```

✅ **Use semantic button types in forms**

```html
<bit-button-group>
  <bit-button type="submit" variant="solid">Save</bit-button>
  <bit-button type="reset" variant="outline">Reset</bit-button>
</bit-button-group>
```

## Customization

### Custom Styling

```html
<bit-button-group
  style="
    --group-gap: 1rem;
    --group-radius: 0.75rem;
  ">
  <bit-button>Button 1</bit-button>
  <bit-button>Button 2</bit-button>
</bit-button-group>
```

### Global Styling

```css
bit-button-group {
  --group-gap: 0.75rem;
}

bit-button-group[attached] {
  --group-radius: 0.5rem;
}
```

## Related Components

- [Button](button.md) – Individual button component
- Form (coming soon) – Form wrapper component
- Toolbar (coming soon) – Application toolbar component
