# Button Component

A versatile button component with multiple variants, colors, sizes, and states. Includes both standalone buttons and button groups for organizing related actions. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

**Button**
- 🎨 **6 Variants**: solid, flat, bordered, outline, ghost, text
- 🌈 **6 Semantic Colors**: primary, secondary, info, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- ♿ **Accessible**: Full keyboard support, ARIA attributes, screen reader friendly
- 🎭 **States**: loading, disabled
- 🔧 **Customizable**: CSS custom properties for styling

**Button Group**
- 🔄 **2 Orientations**: horizontal, vertical
- 🔗 **Attached Mode**: Connect buttons with shared borders
- 📐 **Full Width**: Buttons expand to fill container
- 📏 **Attribute Propagation**: Automatically apply size, variant, and color to all children

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/base/button/button.ts
:::

::: details View Source Code (Button Group)
<<< @/../packages/buildit/src/base/button-group/button-group.ts
:::

## Basic Usage

### Standalone Button

```html
<bit-button variant="solid" color="primary">Click me</bit-button>

<script type="module">
  import '@vielzeug/buildit/button';
</script>
```

### Button Group

```html
<bit-button-group>
  <bit-button>First</bit-button>
  <bit-button>Second</bit-button>
  <bit-button>Third</bit-button>
</bit-button-group>

<script type="module">
  import '@vielzeug/buildit/button';
  import '@vielzeug/buildit/button-group';
</script>
```

## Visual Options

### Variants

The button comes with eight visual variants to match different levels of emphasis.

<ComponentPreview center>

```html
<bit-button variant="solid">Solid</bit-button>
<bit-button variant="flat">Flat</bit-button>
<bit-button variant="bordered">Bordered</bit-button>
<bit-button variant="outline">Outline</bit-button>
<bit-button variant="ghost">Ghost</bit-button>
<bit-button variant="text">Text</bit-button>
```

</ComponentPreview>

### Frost Variant

Modern frost effect with backdrop blur that adapts based on color:
- **Without color**: Subtle canvas-based frost overlay
- **With color**: Frosted glass effect with colored tint

::: tip Best Used With
Frost variant works best when placed over colorful backgrounds or images to showcase the blur and transparency effects.
:::

<ComponentPreview center background="https://images.unsplash.com/photo-1516919549054-e08258825f80?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D">

```html
<bit-button variant="frost">Frost</bit-button>
<bit-button variant="frost" color="primary">Primary</bit-button>
<bit-button variant="frost" color="secondary">Secondary</bit-button>
<bit-button variant="frost" color="info">Info</bit-button>
<bit-button variant="frost" color="success">Success</bit-button>
<bit-button variant="frost" color="warning">Warning</bit-button>
<bit-button variant="frost" color="error">Error</bit-button>
```

</ComponentPreview>

### Rainbow Border

Animated rainbow border effect perfect for highlighting call-to-action buttons or special features.

<ComponentPreview center>

```html
<bit-button rainbow variant="frost">Frost + Rainbow</bit-button>
```

</ComponentPreview>

### Colors

Six semantic colors for different contexts.

<ComponentPreview center>

```html
<bit-button variant="solid">Default</bit-button>
<bit-button variant="solid" color="primary">Primary</bit-button>
<bit-button variant="solid" color="secondary">Secondary</bit-button>
<bit-button variant="solid" color="info">Info</bit-button>
<bit-button variant="solid" color="success">Success</bit-button>
<bit-button variant="solid" color="warning">Warning</bit-button>
<bit-button variant="solid" color="error">Error</bit-button>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<bit-button size="sm">Small</bit-button>
<bit-button size="md">Medium</bit-button>
<bit-button size="lg">Large</bit-button>
```

</ComponentPreview>

## States

### Loading

Show a loading spinner and prevent interaction during async operations.

<ComponentPreview center>

```html
<bit-button loading>Loading...</bit-button>
```

</ComponentPreview>

### Disabled

Prevent interaction and reduce opacity for unavailable actions.

<ComponentPreview center>

```html
<bit-button disabled>Disabled</bit-button>
```

</ComponentPreview>

## Icons & Extras

### With Icons

Add prefix or suffix icons using slots.

<ComponentPreview center>

```html
<bit-button>
  <span slot="prefix">←</span>
  Back
</bit-button>
<bit-button variant="outline" color="success">
  Save
  <span slot="suffix">💾</span>
</bit-button>
<bit-button icon-only aria-label="Delete" color="error"> 🗑️ </bit-button>
```

</ComponentPreview>

### Rounded (Custom Border Radius)

Use the `rounded` attribute to apply border radius from the theme. Use it without a value (or `rounded="full"`) for pill shape, or specify a theme value like `"lg"`, `"xl"`, etc.

<ComponentPreview center>

```html
<!-- Default/Full: Pill shape (9999px) -->
<bit-button rounded>Pill Shape</bit-button>

<!-- Large: 0.5rem / 8px -->
<bit-button rounded="lg">Large Radius</bit-button>

<!-- Extra Large: 0.75rem / 12px -->
<bit-button rounded="xl">XL Radius</bit-button>

<!-- 2XL: 1rem / 16px -->
<bit-button rounded="2xl">2XL Radius</bit-button>

<!-- Icon-only always uses perfect circle -->
<bit-button rounded icon-only aria-label="Check">✓</bit-button>
```

</ComponentPreview>

### Full Width

Button expands to fill the full width of its container.

<ComponentPreview center vertical>

```html
<bit-button fullwidth>Full Width Button</bit-button>
<bit-button fullwidth variant="bordered" color="success">Full Width Bordered</bit-button>
```

</ComponentPreview>

## Button Groups

### Orientation

Group buttons in horizontal or vertical layouts.

#### Horizontal (Default)
<ComponentPreview center>

```html
<bit-button-group>
  <bit-button>Left</bit-button>
  <bit-button>Center</bit-button>
  <bit-button>Right</bit-button>
</bit-button-group>
```

</ComponentPreview>

#### Vertical
<ComponentPreview center>

```html
<bit-button-group orientation="vertical">
  <bit-button>Top</bit-button>
  <bit-button>Middle</bit-button>
  <bit-button>Bottom</bit-button>
</bit-button-group>
```

</ComponentPreview>

### Attached Mode

Remove spacing and connect buttons with shared borders for segmented controls.

<ComponentPreview center>

```html
<bit-button-group attached>
  <bit-button variant="bordered">Day</bit-button>
  <bit-button variant="solid">Week</bit-button>
  <bit-button variant="bordered">Month</bit-button>
</bit-button-group>
```

</ComponentPreview>

### Attribute Propagation

Apply `size`, `variant`, or `color` to all child buttons automatically via the parent group.

<ComponentPreview vertical>

```html
<bit-button-group variant="outline" size="sm" color="secondary">
  <bit-button>Button 1</bit-button>
  <bit-button>Button 2</bit-button>
  <bit-button>Button 3</bit-button>
</bit-button-group>
```

</ComponentPreview>

### Full Width

Buttons expand to fill the container equally.

<ComponentPreview center>

```html
<bit-button-group fullwidth attached>
  <bit-button variant="bordered">Option A</bit-button>
  <bit-button variant="bordered">Option B</bit-button>
</bit-button-group>
```

</ComponentPreview>

## API Reference

### `bit-button` Attributes

| Attribute   | Type                                                                                          | Default     | Description                      |
| ----------- | --------------------------------------------------------------------------------------------- | ----------- | -------------------------------- |
| `variant`   | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'glass' \| 'frost'` | `'solid'`   | Visual style variant             |
| `color`     | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'`                               | `'primary'` | Semantic color                   |
| `size`      | `'sm' \| 'md' \| 'lg'`                                              | `'md'`      | Button size                      |
| `type`      | `'button' \| 'submit' \| 'reset'`                                   | `'button'`  | Button type (for forms)          |
| `disabled`  | `boolean`                                                           | `false`     | Disable the button               |
| `loading`   | `boolean`                                                           | `false`     | Show loading state               |
| `rainbow`   | `boolean`                                                           | `false`     | Animated rainbow border effect   |
| `icon-only` | `boolean`                                                           | `false`     | Icon-only mode (smaller padding) |
| `fullwidth`| `boolean`                                                           | `false`     | Button takes full width of container |
| `rounded`   | `boolean`                                                           | `false`     | Fully rounded corners            |

### `bit-button-group` Attributes

| Attribute     | Type                                                                                          | Default        | Description                        |
| ------------- | --------------------------------------------------------------------------------------------- | -------------- | ---------------------------------- |
| `orientation` | `'horizontal' \| 'vertical'`                                                                  | `'horizontal'` | Group layout direction             |
| `attached`    | `boolean`                                                                                     | `false`        | Remove spacing and connect buttons |
| `fullwidth`  | `boolean`                                                                                     | `false`        | Buttons expand to fill container   |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                                        | -              | Apply size to all child buttons    |
| `variant`     | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'glass' \| 'frost'` | -              | Apply variant to all child buttons |
| `color`       | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'`                               | -              | Apply color to all child buttons   |

### Slots

#### `bit-button`
| Slot      | Description                        |
| --------- | ---------------------------------- |
| (default) | Button content (text, icons, etc.) |
| `prefix`  | Content before the main content    |
| `suffix`  | Content after the main content     |

#### `bit-button-group`
| Slot      | Description           |
| --------- | --------------------- |
| (default) | Child button elements |

### Events

#### `bit-button`
| Event   | Detail                          | Description                                              |
| ------- | ------------------------------- | -------------------------------------------------------- |
| `click` | `{ originalEvent: MouseEvent }` | Emitted when button is clicked (if not disabled/loading) |

## CSS Custom Properties

### `bit-button`
| Property | Description | Default |
|----------|-------------|---------|
| `--button-bg` | Background color | Variant-dependent |
| `--button-color` | Text color | Variant-dependent |
| `--button-radius` | Border radius | `0.375rem` |
| `--button-padding` | Inner padding | Size-dependent |

### `bit-button-group`
| Property         | Description                                           | Default    |
| ---------------- | ----------------------------------------------------- | ---------- |
| `--group-gap`    | Spacing between buttons                               | `0.5rem`   |
| `--group-radius` | Border radius for first/last buttons in attached mode | `0.375rem` |

## Accessibility

Both components follow WAI-ARIA best practices.

### `bit-button`

✅ **Keyboard Navigation**
- `Enter` and `Space` activate the button.
- `Tab` moves focus to/from the button.

✅ **Screen Readers**
- Announces button role and label.
- `aria-disabled` when disabled.
- `aria-busy` when loading.
- Icon-only buttons require `aria-label`.

### `bit-button-group`

✅ **Semantic Structure**
- Automatically includes `role="group"` on the container.
- Use `aria-label` to provide context (e.g., "Text alignment").

✅ **Keyboard Navigation**
- `Tab` moves focus between buttons.
- Standard button keyboard interaction is maintained.

## Best Practices

### `bit-button`

**Do:**
- Use semantic colors to communicate intent.
- Provide `aria-label` for icon-only buttons.
- Use loading state for async operations.

**Don't:**
- Use multiple primary buttons in the same context.
- Nest interactive elements inside buttons.

### `bit-button-group`

**Do:**
- Use `attached` mode for related segmented controls.
- Use `fullwidth` for mobile-optimized layouts or primary actions.
- Provide an `aria-label` when the group's purpose isn't clear from the content.

**Don't:**
- Mix too many variants or colors within a single group.
- Use `vertical` orientation for more than 4-5 buttons if possible.
