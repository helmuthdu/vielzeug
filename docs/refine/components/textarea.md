# Textarea

A multi-line text input with integrated label, helper text, character counter, and auto-resize. Form-associated and fully keyboard accessible.

## Variants

<ComponentPreview center>

```html
<ore-textarea variant="solid" label="Solid" rows="2"></ore-textarea>
<ore-textarea variant="flat" label="Flat" rows="2"></ore-textarea>
<ore-textarea variant="bordered" label="Bordered" rows="2" color="primary"></ore-textarea>
<ore-textarea variant="outline" label="Outline" rows="2"></ore-textarea>
<ore-textarea variant="ghost" label="Ghost" rows="2"></ore-textarea>
```

</ComponentPreview>

## Colors

<ComponentPreview center>

```html
<ore-textarea variant="flat" label="Default" rows="2"></ore-textarea>
<ore-textarea variant="flat" color="primary" label="Primary" rows="2"></ore-textarea>
<ore-textarea variant="flat" color="success" label="Success" rows="2"></ore-textarea>
<ore-textarea variant="flat" color="warning" label="Warning" rows="2"></ore-textarea>
<ore-textarea variant="flat" color="error" label="Error" rows="2"></ore-textarea>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<ore-textarea size="sm" label="Small" rows="2"></ore-textarea>
<ore-textarea size="md" label="Medium" rows="2"></ore-textarea>
<ore-textarea size="lg" label="Large" rows="2"></ore-textarea>
```

</ComponentPreview>

## Labels

### Inset (Default)

The label floats inside the field as a compact top label.

<ComponentPreview center>

```html
<ore-textarea label="Bio" placeholder="Tell us about yourself"></ore-textarea>
```

</ComponentPreview>

### Outside

The label is placed above the field.

<ComponentPreview center>

```html
<ore-textarea label="Bio" label-placement="outside" placeholder="Tell us about yourself"></ore-textarea>
```

</ComponentPreview>

## Helper & Error Text

<ComponentPreview center>

```html
<ore-textarea label="Description" helper="Briefly describe the issue you are experiencing."></ore-textarea>
<ore-textarea label="Notes" error="This field is required." value=""></ore-textarea>
```

</ComponentPreview>

## Character Counter

Set `maxlength` to enable a live character counter. The counter turns amber near the limit and red at the limit. Set `maxlength` whenever a backend constraint exists — the counter provides live feedback to users.

<ComponentPreview center>

```html
<ore-textarea label="Bio" maxlength="160" placeholder="160 characters max"></ore-textarea>
```

</ComponentPreview>

## Auto Resize

Set `auto-resize` to let the textarea grow vertically with its content. Manual resize is automatically disabled. This is useful for comment or note fields where content length is unpredictable. Note that `rows` still sets the minimum starting height when used alongside `auto-resize`.

<ComponentPreview center>

```html
<ore-textarea label="Notes" auto-resize placeholder="Start typing — the field will grow"></ore-textarea>
```

</ComponentPreview>

## Resize Control

Control the resize handle with the `resize` attribute. Avoid `resize="horizontal"` on full-width layouts as it breaks layout flow.

<ComponentPreview center>

```html
<ore-textarea label="Vertical (default)" resize="vertical" rows="2"></ore-textarea>
<ore-textarea label="Horizontal" resize="horizontal" rows="2"></ore-textarea>
<ore-textarea label="Both" resize="both" rows="2"></ore-textarea>
<ore-textarea label="None" resize="none" rows="2"></ore-textarea>
```

</ComponentPreview>

## States

<ComponentPreview center>

```html
<ore-textarea disabled label="Disabled" value="Cannot edit this"></ore-textarea>
<ore-textarea readonly label="Read-only" value="Cannot change this"></ore-textarea>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute         | Type                                                                      | Default      | Description                                        |
| ----------------- | ------------------------------------------------------------------------- | ------------ | -------------------------------------------------- |
| `label`           | `string`                                                                  | `''`         | Label text                                         |
| `label-placement` | `'inset' \| 'outside'`                                                    | `'inset'`    | Label placement                                    |
| `value`           | `string`                                                                  | `''`         | Current value                                      |
| `name`            | `string`                                                                  | `''`         | Form field name                                    |
| `placeholder`     | `string`                                                                  | `''`         | Placeholder text                                   |
| `rows`            | `number`                                                                  | -            | Visible row count (sets minimum height)            |
| `maxlength`       | `number`                                                                  | -            | Maximum character count — enables counter when set |
| `helper`          | `string`                                                                  | `''`         | Helper text below the field                        |
| `error`           | `string`                                                                  | `''`         | Error message (marks field invalid)                |
| `disabled`        | `boolean`                                                                 | `false`      | Disable the textarea                               |
| `readonly`        | `boolean`                                                                 | `false`      | Make the textarea read-only                        |
| `required`        | `boolean`                                                                 | `false`      | Mark the field as required                         |
| `fullwidth`       | `boolean`                                                                 | `false`      | Expand to full width                               |
| `auto-resize`     | `boolean`                                                                 | `false`      | Grow vertically with content                       |
| `no-resize`       | `boolean`                                                                 | `false`      | Disable the manual resize handle                   |
| `resize`          | `'none' \| 'vertical' \| 'horizontal' \| 'both'`                          | `'vertical'` | Resize direction                                   |
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost'`                 | `'solid'`    | Visual style variant                               |
| `color`           | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | -            | Color theme                                        |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`       | Component size                                     |
| `rounded`         | `'none' \| 'sm' \| 'md' \| 'lg' \| 'full'`                                | -            | Border radius override                             |

### Slots

| Slot     | Description                            |
| -------- | -------------------------------------- |
| `helper` | Complex helper content below the field |

### Events

| Event    | Detail                                    | Description                             |
| -------- | ----------------------------------------- | --------------------------------------- |
| `input`  | `{ value: string, originalEvent: Event }` | Fired on every keystroke                |
| `change` | `{ value: string, originalEvent: Event }` | Fired when value is committed (on blur) |

### CSS Custom Properties

| Property                        | Description                                                  | Default                       |
| ------------------------------- | ------------------------------------------------------------ | ----------------------------- |
| `--textarea-bg`                 | Background color                                             | Variant-dependent             |
| `--textarea-border-color`       | Border color                                                 | Variant-dependent             |
| `--textarea-radius`             | Border radius                                                | `var(--rounded-lg)`           |
| `--textarea-padding`            | Inner padding (block inline)                                 | `var(--size-2) var(--size-3)` |
| `--textarea-gap`                | Gap between label and field                                  | Size-dependent                |
| `--textarea-font-size`          | Font size                                                    | `var(--text-sm)`              |
| `--textarea-placeholder-color`  | Placeholder text color                                       | Theme-dependent               |
| `--textarea-min-height`         | Minimum field height                                         | `var(--size-24)`              |
| `--textarea-max-height`         | Maximum field height (`none` = unlimited)                    | `none`                        |
| `--textarea-resize`             | CSS resize direction (`vertical`/`horizontal`/`both`/`none`) | `vertical`                    |
| `--textarea-hover-bg`           | Field background on hover (flat/ghost variants)              | Variant-dependent             |
| `--textarea-hover-border-color` | Field border on hover (flat/bordered variants)               | Variant-dependent             |
| `--textarea-focus-bg`           | Field background when focused (flat variant)                 | Variant-dependent             |
| `--textarea-focus-border-color` | Field border when focused (flat variant)                     | Variant-dependent             |

## Accessibility

The textarea component follows WCAG 2.1 Level AA standards.

Keyboard navigation uses `Tab` to focus the field and `Shift+Tab` to blur it. Native textarea keyboard behaviour applies within the field.

`aria-labelledby` links the label to the field and `aria-describedby` links helper and error text. `aria-invalid` is set when `error` is provided, `aria-required` reflects the `required` attribute, and `aria-disabled` reflects the disabled state. Always provide a `label` — do not rely solely on `placeholder`, as placeholder text is not exposed as an accessible label. Use `error` to surface server-side validation messages after submit.
