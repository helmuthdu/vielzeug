# Button

Button and button group components with seven variants, six semantic colors, three sizes, icon slots, link mode, and animated border effects.

## Variants

Seven variants cover the full range of visual emphasis.

<ComponentPreview center>

```html
<sg-button variant="solid">Solid</sg-button>
<sg-button variant="flat">Flat</sg-button>
<sg-button variant="bordered">Bordered</sg-button>
<sg-button variant="outline">Outline</sg-button>
<sg-button variant="ghost">Ghost</sg-button>
<sg-button variant="text">Text</sg-button>
<sg-button variant="frost">Frost</sg-button>
```

</ComponentPreview>

The `frost` variant adds a backdrop blur with a subtle tinted overlay. It reads best when placed over a colorful background or image.

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

## Colors

Six semantic colors communicate intent.

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

## Sizes

<ComponentPreview center>

```html
<sg-button size="sm">Small</sg-button>
<sg-button size="md">Medium</sg-button>
<sg-button size="lg">Large</sg-button>
```

</ComponentPreview>

## States

### Loading

Renders a spinner and blocks interaction during async operations.

<ComponentPreview center>

```html
<sg-button loading>Loading...</sg-button>
```

</ComponentPreview>

### Disabled

<ComponentPreview center>

```html
<sg-button disabled>Disabled</sg-button>
```

</ComponentPreview>

## Icons

Use `prefix` and `suffix` slots to add icons alongside text. For icon-only buttons, use `icon-only` with a `label` attribute — the label is set as `aria-label` and is required for accessibility.

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
```

</ComponentPreview>

## Rounded

The `rounded` attribute sets the border radius from the theme scale. Used without a value (or with `"full"`) it produces a pill shape.

<ComponentPreview center>

```html
<sg-button rounded>Pill</sg-button>
<sg-button rounded="lg">Large</sg-button>
<sg-button rounded="xl">XL</sg-button>
<sg-button rounded="2xl">2XL</sg-button>
<sg-button rounded icon-only label="Check">
  <sg-icon name="check" size="18"></sg-icon>
</sg-button>
```

</ComponentPreview>

## Full Width

<ComponentPreview center vertical>

```html
<sg-button fullwidth>Full Width</sg-button>
<sg-button fullwidth variant="bordered" color="success">Full Width Bordered</sg-button>
```

</ComponentPreview>

## Link Mode

Set `href` to render an `<a role="button">` instead of `<button>`. All variants, sizes, states, and slots behave identically.

<ComponentPreview center>

```html
<sg-button href="#">Default Link</sg-button>
<sg-button href="#" variant="outline">Outline Link</sg-button>
<sg-button href="#" target="_blank" rel="noopener noreferrer" variant="ghost">
  Open in new tab
  <sg-icon slot="suffix" name="external-link" size="18"></sg-icon>
</sg-button>
```

</ComponentPreview>

::: warning Security
Always set `rel="noopener noreferrer"` when using `target="_blank"` to prevent tabnapping.
:::

## Animated Border Effects

The `effect` attribute adds an animated border. Both effects pause automatically when the user has `prefers-reduced-motion` enabled.

### Rainbow

An Okabe-Ito colorblind-safe color sweep — good for highlighting a primary call-to-action.

<ComponentPreview center>

```html
<sg-button effect="rainbow" variant="frost">Frost + Rainbow</sg-button>
```

</ComponentPreview>

### Shine

A neon comet that sweeps the border using the button's own `color` token.

<ComponentPreview center>

```html
<sg-button effect="shine" color="primary">Primary</sg-button>
<sg-button effect="shine" color="secondary">Secondary</sg-button>
<sg-button effect="shine" color="success">Success</sg-button>
<sg-button effect="shine" color="warning">Warning</sg-button>
<sg-button effect="shine" color="error">Error</sg-button>
<sg-button effect="shine" variant="outline" color="primary" rounded>Outline</sg-button>
<sg-button effect="shine" variant="bordered" color="secondary">Bordered</sg-button>
<sg-button effect="shine" variant="frost" color="info">Frost</sg-button>
```

</ComponentPreview>

## Button Groups

### Basic

<ComponentPreview center>

```html
<sg-button-group>
  <sg-button>Left</sg-button>
  <sg-button>Center</sg-button>
  <sg-button>Right</sg-button>
</sg-button-group>
```

</ComponentPreview>

### Vertical

<ComponentPreview center>

```html
<sg-button-group orientation="vertical">
  <sg-button>Top</sg-button>
  <sg-button>Middle</sg-button>
  <sg-button>Bottom</sg-button>
</sg-button-group>
```

</ComponentPreview>

### Attached

Removes spacing and connects buttons with shared borders — use for segmented controls.

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

`size`, `variant`, and `color` set on the group apply to all child buttons automatically.

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

| Attribute   | Type                                                                            | Default    | Description                                                                 |
| ----------- | ------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| `variant`   | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'` | `'solid'`  | Visual style                                                                |
| `color`     | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`      | —          | Semantic color; uncolored neutral when omitted                              |
| `size`      | `'sm' \| 'md' \| 'lg'`                                                          | `'md'`     | Button size                                                                 |
| `type`      | `'button' \| 'submit' \| 'reset'`                                               | `'button'` | HTML button type for form association                                       |
| `disabled`  | `boolean`                                                                       | `false`    | Disables the button                                                         |
| `loading`   | `boolean`                                                                       | `false`    | Shows spinner; also disables interaction                                    |
| `effect`    | `'shine' \| 'rainbow'`                                                          | —          | Animated border effect                                                      |
| `icon-only` | `boolean`                                                                       | `false`    | Square aspect ratio, no padding — pair with `label`                         |
| `label`     | `string`                                                                        | —          | Sets `aria-label` on the host — required for icon-only buttons              |
| `fullwidth` | `boolean`                                                                       | `false`    | Expands to full container width                                             |
| `rounded`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`          | —          | Border radius; omit value or use `'full'` for pill shape                    |
| `href`      | `string`                                                                        | —          | Renders as `<a role="button">` when set                                     |
| `target`    | `'_blank' \| '_self' \| '_parent' \| '_top'`                                   | —          | Link target (requires `href`)                                               |
| `rel`       | `string`                                                                        | —          | Link `rel` attribute (requires `href`)                                      |

### `sg-button-group` Attributes

| Attribute     | Type                                                                            | Default        | Description                                      |
| ------------- | ------------------------------------------------------------------------------- | -------------- | ------------------------------------------------ |
| `orientation` | `'horizontal' \| 'vertical'`                                                    | `'horizontal'` | Layout direction                                 |
| `attached`    | `boolean`                                                                       | `false`        | Removes spacing and connects buttons with borders|
| `fullwidth`   | `boolean`                                                                       | `false`        | Buttons expand equally to fill container         |
| `label`       | `string`                                                                        | —              | `aria-label` for the group container             |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                          | —              | Propagated to all child buttons                  |
| `variant`     | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'` | —              | Propagated to all child buttons                  |
| `color`       | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`      | —              | Propagated to all child buttons                  |

### Slots

**`sg-button`**

| Slot        | Description                        |
| ----------- | ---------------------------------- |
| *(default)* | Button label, text, or content     |
| `prefix`    | Content before the label           |
| `suffix`    | Content after the label            |

**`sg-button-group`**

| Slot        | Description           |
| ----------- | --------------------- |
| *(default)* | Child button elements |

### Events

`sg-button` fires the native `click` (`MouseEvent`) event. No custom events.

`sg-button-group` fires no events.

### CSS Parts

**`sg-button`**

| Part      | Element                               |
| --------- | ------------------------------------- |
| `button`  | The inner `<button>` or `<a>` element |
| `loader`  | The loading spinner                   |
| `content` | The text/content wrapper              |

**`sg-button-group`**

| Part    | Element         |
| ------- | --------------- |
| `group` | Group container |

### CSS Custom Properties

**`sg-button`**

| Property                             | Description                                                  | Default             |
| ------------------------------------ | ------------------------------------------------------------ | ------------------- |
| `--button-bg`                        | Background color                                             | Variant-dependent   |
| `--button-color`                     | Text color                                                   | Variant-dependent   |
| `--button-border`                    | Border width                                                 | `var(--border)`     |
| `--button-border-color`              | Border color                                                 | Variant-dependent   |
| `--button-border-top`                | Top border width (used by attached groups)                   | —                   |
| `--button-border-start`              | Inline-start border width (used by attached groups)          | —                   |
| `--button-radius`                    | Border radius                                                | `var(--rounded-lg)` |
| `--button-padding`                   | Inner padding                                                | Size-dependent      |
| `--button-gap`                       | Gap between icon and text                                    | Size-dependent      |
| `--button-font-size`                 | Font size                                                    | Size-dependent      |
| `--button-frost-active-bg`           | Background when hovered/pressed in frost variant             | Variant-dependent   |
| `--button-frost-active-border-color` | Border color when hovered/pressed in frost variant           | Variant-dependent   |

**`sg-button-group`**

| Property         | Description                                                   | Default             |
| ---------------- | ------------------------------------------------------------- | ------------------- |
| `--group-gap`    | Spacing between buttons (non-attached)                        | `var(--size-2)`     |
| `--group-radius` | Border radius on first/last buttons in attached mode          | `var(--rounded-lg)` |

## Accessibility

**Keyboard:** `Enter` and `Space` activate the button. `Tab` moves focus in and out.

**Screen readers:** The button role and label are announced automatically. `aria-disabled` is set when disabled; `aria-busy` when loading.

**Icon-only buttons:** The `label` attribute is required — it becomes the `aria-label`. Without it, screen readers have nothing to announce.

**Button groups:** The container gets `role="group"` automatically. Set the `label` attribute on the group when the purpose isn't clear from the button labels alone (e.g., `label="Text alignment"`).
