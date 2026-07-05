# Button

Button and button group components with seven variants, six semantic colors, three sizes, icon slots, link mode, and animated border effects.

## Variants

Seven variants cover the full range of visual emphasis.

<ComponentPreview center>

```html
<ore-button variant="solid">Solid</ore-button>
<ore-button variant="flat">Flat</ore-button>
<ore-button variant="bordered">Bordered</ore-button>
<ore-button variant="outline">Outline</ore-button>
<ore-button variant="ghost">Ghost</ore-button>
<ore-button variant="text">Text</ore-button>
<ore-button variant="frost">Frost</ore-button>
```

</ComponentPreview>

The `frost` variant adds a backdrop blur with a subtle tinted overlay. It reads best when placed over a colorful background or image.

<ComponentPreview center>

```html
<ore-button variant="frost">Default</ore-button>
<ore-button variant="frost" color="primary">Primary</ore-button>
<ore-button variant="frost" color="secondary">Secondary</ore-button>
<ore-button variant="frost" color="info">Info</ore-button>
<ore-button variant="frost" color="success">Success</ore-button>
<ore-button variant="frost" color="warning">Warning</ore-button>
<ore-button variant="frost" color="error">Error</ore-button>
```

</ComponentPreview>

## Colors

Six semantic colors communicate intent.

<ComponentPreview center>

```html
<ore-button variant="bordered">Default</ore-button>
<ore-button variant="bordered" color="primary">Primary</ore-button>
<ore-button variant="bordered" color="secondary">Secondary</ore-button>
<ore-button variant="bordered" color="info">Info</ore-button>
<ore-button variant="bordered" color="success">Success</ore-button>
<ore-button variant="bordered" color="warning">Warning</ore-button>
<ore-button variant="bordered" color="error">Error</ore-button>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<ore-button size="sm">Small</ore-button>
<ore-button size="md">Medium</ore-button>
<ore-button size="lg">Large</ore-button>
<ore-button size="sm" icon-only label="Search">
  <ore-icon name="search"></ore-icon>
</ore-button>
<ore-button size="md" icon-only label="Search">
  <ore-icon name="search"></ore-icon>
</ore-button>
<ore-button size="lg" icon-only label="Search">
  <ore-icon name="search"></ore-icon>
</ore-button>
```

</ComponentPreview>

## States

### Loading

Renders a spinner and blocks interaction during async operations.

<ComponentPreview center>

```html
<ore-button loading>Loading...</ore-button>
```

</ComponentPreview>

### Disabled

<ComponentPreview center>

```html
<ore-button disabled>Disabled</ore-button>
```

</ComponentPreview>

## Icons

Use `prefix` and `suffix` slots to add icons alongside text. For icon-only buttons, use `icon-only` with a `label` attribute — the label is set as `aria-label` and is required for accessibility.

<ComponentPreview center>

```html
<ore-button>
  <ore-icon slot="prefix" name="arrow-left"></ore-icon>
  Back
</ore-button>
<ore-button variant="outline" color="success">
  Save
  <ore-icon slot="suffix" name="save"></ore-icon>
</ore-button>
<ore-button icon-only label="Delete" color="error">
  <ore-icon name="trash-2"></ore-icon>
</ore-button>
```

</ComponentPreview>

## Rounded

The `rounded` attribute sets the border radius from the theme scale. Used without a value (or with `"full"`) it produces a pill shape.

<ComponentPreview center>

```html
<ore-button rounded>Pill</ore-button>
<ore-button rounded="lg">Large</ore-button>
<ore-button rounded="xl">XL</ore-button>
<ore-button rounded="2xl">2XL</ore-button>
<ore-button rounded icon-only label="Check">
  <ore-icon name="check"></ore-icon>
</ore-button>
```

</ComponentPreview>

## Full Width

<ComponentPreview center vertical>

```html
<ore-button fullwidth>Full Width</ore-button>
<ore-button fullwidth variant="bordered" color="success">Full Width Bordered</ore-button>
```

</ComponentPreview>

## Link Mode

Set `href` to render a real `<a>` internally instead of a `<button>`; the host itself takes `role="link"` (and carries the real `tabindex`/keyboard handling, since `ore-button` is form-associated). Native left/middle/ctrl-click, right-click context menu, and hover-preview behavior all work as expected. All variants, sizes, states, and slots behave identically.

<ComponentPreview center>

```html
<ore-button href="#">Default Link</ore-button>
<ore-button href="#" variant="outline">Outline Link</ore-button>
<ore-button href="#" target="_blank" rel="noopener noreferrer" variant="ghost">
  Open in new tab
  <ore-icon slot="suffix" name="external-link"></ore-icon>
</ore-button>
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
<ore-button effect="rainbow" variant="frost">Frost + Rainbow</ore-button>
```

</ComponentPreview>

### Shine

A neon comet that sweeps the border using the button's own `color` token.

<ComponentPreview center>

```html
<ore-button effect="shine" color="primary">Primary</ore-button>
<ore-button effect="shine" color="secondary">Secondary</ore-button>
<ore-button effect="shine" color="success">Success</ore-button>
<ore-button effect="shine" color="warning">Warning</ore-button>
<ore-button effect="shine" color="error">Error</ore-button>
<ore-button effect="shine" variant="outline" color="primary" rounded>Outline</ore-button>
<ore-button effect="shine" variant="bordered" color="secondary">Bordered</ore-button>
<ore-button effect="shine" variant="frost" color="info">Frost</ore-button>
```

</ComponentPreview>

## Button Groups

### Basic

<ComponentPreview center>

```html
<ore-button-group>
  <ore-button>Left</ore-button>
  <ore-button>Center</ore-button>
  <ore-button>Right</ore-button>
</ore-button-group>
```

</ComponentPreview>

### Vertical

<ComponentPreview center>

```html
<ore-button-group orientation="vertical">
  <ore-button>Top</ore-button>
  <ore-button>Middle</ore-button>
  <ore-button>Bottom</ore-button>
</ore-button-group>
```

</ComponentPreview>

### Attached

Removes spacing and connects buttons with shared borders — use for segmented controls.

<ComponentPreview center>

```html
<ore-button-group attached>
  <ore-button variant="bordered">Day</ore-button>
  <ore-button variant="solid">Week</ore-button>
  <ore-button variant="bordered">Month</ore-button>
</ore-button-group>
```

</ComponentPreview>

### Attribute Propagation

`size`, `variant`, and `color` set on the group apply to all child buttons automatically.

<ComponentPreview vertical>

```html
<ore-button-group variant="outline" size="sm" color="secondary">
  <ore-button>Button 1</ore-button>
  <ore-button>Button 2</ore-button>
  <ore-button>Button 3</ore-button>
</ore-button-group>
```

</ComponentPreview>

### Full Width

<ComponentPreview center>

```html
<ore-button-group fullwidth attached>
  <ore-button variant="bordered">Option A</ore-button>
  <ore-button variant="bordered">Option B</ore-button>
</ore-button-group>
```

</ComponentPreview>

## API Reference

### `ore-button` Attributes

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
| `href`      | `string`                                                                        | —          | Renders as a real `<a>` internally when set; host takes `role="link"`       |
| `target`    | `'_blank' \| '_self' \| '_parent' \| '_top'`                                   | —          | Link target (requires `href`)                                               |
| `rel`       | `string`                                                                        | —          | Link `rel` attribute (requires `href`)                                      |

### `ore-button-group` Attributes

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

**`ore-button`**

| Slot        | Description                        |
| ----------- | ---------------------------------- |
| *(default)* | Button label, text, or content     |
| `prefix`    | Content before the label           |
| `suffix`    | Content after the label            |

**`ore-button-group`**

| Slot        | Description           |
| ----------- | --------------------- |
| *(default)* | Child button elements |

### Events

`ore-button` fires the native `click` (`MouseEvent`) event. No custom events.

`ore-button-group` fires no events.

### CSS Parts

**`ore-button`**

| Part      | Element                               |
| --------- | ------------------------------------- |
| `button`  | The inner `<button>` or `<a>` element |
| `loader`  | The loading spinner                   |
| `content` | The text/content wrapper              |

**`ore-button-group`**

| Part    | Element         |
| ------- | --------------- |
| `group` | Group container |

### CSS Custom Properties

**`ore-button`**

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

**`ore-button-group`**

| Property         | Description                                                   | Default             |
| ---------------- | ------------------------------------------------------------- | ------------------- |
| `--group-gap`    | Spacing between buttons (non-attached)                        | `var(--size-2)`     |
| `--group-radius` | Border radius on first/last buttons in attached mode          | `var(--rounded-lg)` |

## Accessibility

**Keyboard:** `Enter` and `Space` activate the button. `Tab` moves focus in and out.

**Screen readers:** The button role and label are announced automatically. `aria-disabled` is set when disabled; `aria-busy` when loading.

**Icon-only buttons:** The `label` attribute is required — it becomes the `aria-label`. Without it, screen readers have nothing to announce.

**Button groups:** The container gets `role="group"` automatically. Set the `label` attribute on the group when the purpose isn't clear from the button labels alone (e.g., `label="Text alignment"`).
