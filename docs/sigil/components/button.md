# Button

A versatile button component with multiple variants, colors, sizes, and states. Includes both standalone buttons and button groups for organizing related actions. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

**Button**

- ♿ **Accessible**: Full keyboard support, ARIA attributes, screen reader friendly
- 🌈 **6 Semantic Colors**: primary, secondary, info, success, warning, error
- 🎨 **6 Variants**: solid, flat, bordered, outline, ghost, text
- 🎭 **States**: loading, disabled
- 📏 **3 Sizes**: sm, md, lg
- 🔗 **Link Mode**: renders as an accessible `<a role="button">` when `href` is set
- 🔧 **Customizable**: CSS custom properties for styling

**Button Group**

- 🔄 **2 Orientations**: horizontal, vertical
- 🔗 **Attached Mode**: Connect buttons with shared borders
- 📐 **Full Width**: Buttons expand to fill container
- 📏 **Attribute Propagation**: Automatically apply size, variant, and color to all children

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/button/button.ts
:::

::: details View Source Code (Button Group)
<<< @/../packages/sigil/src/inputs/button-group/button-group.ts
:::

## Basic Usage

### Standalone Button

```html
<sg-button variant="solid" color="primary">Click me</sg-button>

<script type="module">
  import '@vielzeug/sigil/button';
</script>
```

### Button Group

```html
<sg-button-group>
  <sg-button>First</sg-button>
  <sg-button>Second</sg-button>
  <sg-button>Third</sg-button>
</sg-button-group>

<script type="module">
  import '@vielzeug/sigil/button';
  import '@vielzeug/sigil/button-group';
</script>
```

## Visual Options

### Variants

The button comes with eight visual variants to match different levels of emphasis.

<ComponentPreview center>

```html
<sg-button variant="solid">Solid</sg-button>
<sg-button variant="flat">Flat</sg-button>
<sg-button variant="bordered">Bordered</sg-button>
<sg-button variant="outline">Outline</sg-button>
<sg-button variant="ghost">Ghost</sg-button>
<sg-button variant="text">Text</sg-button>
```

</ComponentPreview>

### Frost Variant

Modern frost effect with backdrop blur that adapts based on color:

- **Without color**: Subtle canvas-based frost overlay
- **With color**: Frosted glass effect with colored tint

::: tip Best Used With
Frost variant works best when placed over colorful backgrounds or images to showcase the blur and transparency effects.
:::

<ComponentPreview center>

```html
<sg-button variant="frost">Default</sg-button>
<sg-button variant="frost" color="primary">Primary</sg-button>
<sg-button variant="frost" color="secondary">Secondary</sg-button>
<sg-button variant="frost" color="info">Info</sg-button>
<sg-button variant="frost" color="success">Success</sg-button>
<sg-button variant="frost" color="warning">Warning</sg-button>
<sg-button variant="frost" color="error">Error</sg-button>
```

</ComponentPreview>

### Rainbow Border

Animated rainbow border effect perfect for highlighting call-to-action buttons or special features.

<ComponentPreview center>

```html
<sg-button rainbow variant="frost">Frost + Rainbow</sg-button>
```

</ComponentPreview>

### Colors

Six semantic colors for different contexts.

<ComponentPreview center>

```html
<sg-button variant="bordered">Default</sg-button>
<sg-button variant="bordered" color="primary">Primary</sg-button>
<sg-button variant="bordered" color="secondary">Secondary</sg-button>
<sg-button variant="bordered" color="info">Info</sg-button>
<sg-button variant="bordered" color="success">Success</sg-button>
<sg-button variant="bordered" color="warning">Warning</sg-button>
<sg-button variant="bordered" color="error">Error</sg-button>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<sg-button size="sm">Small</sg-button>
<sg-button size="md">Medium</sg-button>
<sg-button size="lg">Large</sg-button>
```

</ComponentPreview>

## States

### Loading

Show a loading spinner and prevent interaction during async operations.

<ComponentPreview center>

```html
<sg-button loading>Loading...</sg-button>
```

</ComponentPreview>

### Disabled

Prevent interaction and reduce opacity for unavailable actions.

<ComponentPreview center>

```html
<sg-button disabled>Disabled</sg-button>
```

</ComponentPreview>

## Icons & Extras

### With Icons

Add prefix or suffix icons using slots.

<ComponentPreview center>

```html
<sg-button>
  <sg-icon slot="prefix" name="arrow-left" size="18"></sg-icon>
  Back
</sg-button>
<sg-button variant="outline" color="success">
  Save
  <sg-icon slot="suffix" name="save" size="18"></sg-icon>
</sg-button>
<sg-button icon-only label="Delete" color="error">
  <sg-icon name="trash-2" size="18"></sg-icon>
</sg-button>

<script type="module">
  import '@vielzeug/sigil/button';
  import '@vielzeug/sigil/icon';
</script>
```

</ComponentPreview>

### Rounded (Custom Border Radius)

Use the `rounded` attribute to apply border radius from the theme. Use it without a value (or `rounded="full"`) for pill shape, or specify a theme value like `"lg"`, `"xl"`, etc.

<ComponentPreview center>

```html
<!-- Default/Full: Pill shape (9999px) -->
<sg-button rounded>Pill Shape</sg-button>

<!-- Large: 0.5rem / 8px -->
<sg-button rounded="lg">Large Radius</sg-button>

<!-- Extra Large: 0.75rem / 12px -->
<sg-button rounded="xl">XL Radius</sg-button>

<!-- 2XL: 1rem / 16px -->
<sg-button rounded="2xl">2XL Radius</sg-button>

<!-- Icon-only always uses perfect circle -->
<sg-button rounded icon-only label="Check">
  <sg-icon name="check" size="18"></sg-icon>
</sg-button>

<script type="module">
  import '@vielzeug/sigil/button';
  import '@vielzeug/sigil/icon';
</script>
```

</ComponentPreview>

### Full Width

Button expands to fill the full width of its container.

<ComponentPreview center vertical>

```html
<sg-button fullwidth>Full Width Button</sg-button>
<sg-button fullwidth variant="bordered" color="success">Full Width Bordered</sg-button>
```

</ComponentPreview>

## Link Buttons

When `href` is provided, `sg-button` renders as an `<a role="button">` element instead of `<button>`. All visual variants, sizes, states, and slots behave exactly the same.

<ComponentPreview center>

```html
<sg-button href="#">Default Link</sg-button>
<sg-button href="#" variant="outline">Outline Link</sg-button>
<sg-button href="#" target="_blank" rel="noopener noreferrer" variant="ghost">
  Open in new tab
  <sg-icon slot="suffix" name="external-link" size="18"></sg-icon>
</sg-button>

<script type="module">
  import '@vielzeug/sigil/button';
  import '@vielzeug/sigil/icon';
</script>
```

</ComponentPreview>

::: info Security
Always set `rel="noopener noreferrer"` when using `target="_blank"` to prevent tabnapping attacks.
:::

## Button Groups

### Orientation

Group buttons in horizontal or vertical layouts.

#### Horizontal (Default)

<ComponentPreview center>

```html
<sg-button-group>
  <sg-button>Left</sg-button>
  <sg-button>Center</sg-button>
  <sg-button>Right</sg-button>
</sg-button-group>
```

</ComponentPreview>

#### Vertical

<ComponentPreview center>

```html
<sg-button-group orientation="vertical">
  <sg-button>Top</sg-button>
  <sg-button>Middle</sg-button>
  <sg-button>Bottom</sg-button>
</sg-button-group>
```

</ComponentPreview>

### Attached Mode

Remove spacing and connect buttons with shared borders for segmented controls.

<ComponentPreview center>

```html
<sg-button-group attached>
  <sg-button variant="bordered">Day</sg-button>
  <sg-button variant="solid">Week</sg-button>
  <sg-button variant="bordered">Month</sg-button>
</sg-button-group>
```

</ComponentPreview>

### Attribute Propagation

Apply `size`, `variant`, or `color` to all child buttons automatically via the parent group.

<ComponentPreview vertical>

```html
<sg-button-group variant="outline" size="sm" color="secondary">
  <sg-button>Button 1</sg-button>
  <sg-button>Button 2</sg-button>
  <sg-button>Button 3</sg-button>
</sg-button-group>
```

</ComponentPreview>

### Full Width

Buttons expand to fill the container equally.

<ComponentPreview center>

```html
<sg-button-group fullwidth attached>
  <sg-button variant="bordered">Option A</sg-button>
  <sg-button variant="bordered">Option B</sg-button>
</sg-button-group>
```

</ComponentPreview>

## API Reference

### `sg-button` Attributes

| Attribute   | Type                                                                           | Default     | Description                                                             |
| ----------- | ------------------------------------------------------------------------------ | ----------- | ----------------------------------------------------------------------- |
| `variant`   | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'` | `'solid'`   | Visual style variant                                                    |
| `color`     | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'`                | `'primary'` | Semantic color                                                          |
| `size`      | `'sm' \| 'md' \| 'lg'`                                                         | `'md'`      | Button size                                                             |
| `type`      | `'button' \| 'submit' \| 'reset'`                                              | `'button'`  | Button type (for forms)                                                 |
| `disabled`  | `boolean`                                                                      | `false`     | Disable the button                                                      |
| `loading`   | `boolean`                                                                      | `false`     | Show loading state                                                      |
| `rainbow`   | `boolean`                                                                      | `false`     | Animated rainbow border effect                                          |
| `icon-only` | `boolean`                                                                      | `false`     | Icon-only mode (square aspect ratio, no padding)                        |
| `label`     | `string`                                                                       | —           | Accessible label for the inner element — required for icon-only buttons |
| `fullwidth` | `boolean`                                                                      | `false`     | Button takes full width of container                                    |
| `rounded`   | `boolean`                                                                      | `false`     | Fully rounded corners                                                   |
| `href`      | `string`                                                                       | —           | URL to navigate to; renders as `<a role="button">`                      |
| `target`    | `'_blank' \| '_self' \| '_parent' \| '_top'`                                   | —           | Link target (requires `href`)                                           |
| `rel`       | `string`                                                                       | —           | Link `rel` attribute (requires `href`)                                  |

### `sg-button-group` Attributes

| Attribute     | Type                                                                           | Default        | Description                        |
| ------------- | ------------------------------------------------------------------------------ | -------------- | ---------------------------------- |
| `orientation` | `'horizontal' \| 'vertical'`                                                   | `'horizontal'` | Group layout direction             |
| `attached`    | `boolean`                                                                      | `false`        | Remove spacing and connect buttons |
| `fullwidth`   | `boolean`                                                                      | `false`        | Buttons expand to fill container   |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                         | -              | Apply size to all child buttons    |
| `variant`     | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'` | -              | Apply variant to all child buttons |
| `color`       | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'`                | -              | Apply color to all child buttons   |

### Slots

#### `sg-button`

| Slot      | Description                        |
| --------- | ---------------------------------- |
| (default) | Button content (text, icons, etc.) |
| `prefix`  | Content before the main content    |
| `suffix`  | Content after the main content     |

#### `sg-button-group`

| Slot      | Description           |
| --------- | --------------------- |
| (default) | Child button elements |

### Events

#### `sg-button`

| Event   | Detail       | Description                                                |
| ------- | ------------ | ---------------------------------------------------------- |
| `click` | `MouseEvent` | Native click event — standard `MouseEvent`, not suppressed |

#### `sg-button-group`

No events.

### CSS Custom Properties

### `sg-button`

| Property           | Description      | Default           |
| ------------------ | ---------------- | ----------------- |
| `--button-bg`      | Background color | Variant-dependent |
| `--button-color`   | Text color       | Variant-dependent |
| `--button-radius`  | Border radius    | `0.375rem`        |
| `--button-padding` | Inner padding    | Size-dependent    |

### `sg-button-group`

| Property         | Description                                           | Default    |
| ---------------- | ----------------------------------------------------- | ---------- |
| `--group-gap`    | Spacing between buttons                               | `0.5rem`   |
| `--group-radius` | Border radius for first/last buttons in attached mode | `0.375rem` |

## Accessibility

Both components follow WAI-ARIA best practices.

### `sg-button`

✅ **Keyboard Navigation**

- `Enter` and `Space` activate the button.
- `Tab` moves focus to/from the button.

✅ **Screen Readers**

- Announces button role and label.
- `aria-disabled` when disabled.
- `aria-busy` when loading.
- Icon-only buttons require `label` attribute.

### `sg-button-group`

✅ **Semantic Structure**

- Automatically includes `role="group"` on the container.
- Use the `label` attribute to provide context for screen readers (e.g., `label="Text alignment"`).

✅ **Keyboard Navigation**

- `Tab` moves focus between buttons.

✅ **Screen Readers**

- Buttons within a group are announced in context.

## Best Practices

### `sg-button`

**Do:**

- Use semantic colors to communicate intent.
- Provide `aria-label` for icon-only buttons.
- Use loading state for async operations.

**Don't:**

- Use multiple primary buttons in the same context.
- Nest interactive elements inside buttons.

### `sg-button-group`

**Do:**

- Use `attached` mode for related segmented controls.
- Use `fullwidth` for mobile-optimized layouts or primary actions.
- Provide an `aria-label` when the group's purpose isn't clear from the content.

**Don't:**

- Mix too many variants or colors within a single group.
- Use `vertical` orientation for more than 4-5 buttons if possible.
