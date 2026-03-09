# Textarea

A multi-line text input with integrated label, helper text, character counter, and auto-resize. Form-associated and fully keyboard accessible.

## Features

- 🌈 **6 Semantic Colors** — primary, secondary, info, success, warning, error
- 🎨 **6 Variants** — solid, flat, bordered, outline, ghost, frost
- 🏷️ **Label Placement** — inset (floating-style) or outside
- 📏 **3 Sizes** — sm, md, lg
- 📐 **Auto Resize** — grows vertically with content; no scrollbar
- 📝 **Helper & Error Text** — descriptive text or validation errors below the field
- 🔗 **Form-Associated** — participates in native form submission
- 🔢 **Character Counter** — live counter with near-limit and at-limit colour feedback

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/form/textarea/textarea.ts
:::

## Basic Usage

```html
<bit-textarea label="Message" placeholder="Write something..."></bit-textarea>

<script type="module">
  import '@vielzeug/buildit/textarea';
</script>
```

## Visual Options

### Variants

<ComponentPreview center>

```html
<bit-textarea variant="solid" label="Solid" rows="2"></bit-textarea>
<bit-textarea variant="flat" label="Flat" rows="2"></bit-textarea>
<bit-textarea variant="bordered" label="Bordered" rows="2" color="primary"></bit-textarea>
<bit-textarea variant="outline" label="Outline" rows="2"></bit-textarea>
<bit-textarea variant="ghost" label="Ghost" rows="2"></bit-textarea>
```

</ComponentPreview>

### Colors

<ComponentPreview center>

```html
<bit-textarea variant="flat" label="Default" rows="2"></bit-textarea>
<bit-textarea variant="flat" color="primary" label="Primary" rows="2"></bit-textarea>
<bit-textarea variant="flat" color="success" label="Success" rows="2"></bit-textarea>
<bit-textarea variant="flat" color="warning" label="Warning" rows="2"></bit-textarea>
<bit-textarea variant="flat" color="error" label="Error" rows="2"></bit-textarea>
```

</ComponentPreview>

### Sizes

<ComponentPreview center>

```html
<bit-textarea size="sm" label="Small" rows="2"></bit-textarea>
<bit-textarea size="md" label="Medium" rows="2"></bit-textarea>
<bit-textarea size="lg" label="Large" rows="2"></bit-textarea>
```

</ComponentPreview>

## Labels

### Inset (Default)

The label floats inside the field as a compact top label.

<ComponentPreview center>

```html
<bit-textarea label="Bio" placeholder="Tell us about yourself"></bit-textarea>
```

</ComponentPreview>

### Outside

The label is placed above the field.

<ComponentPreview center>

```html
<bit-textarea label="Bio" label-placement="outside" placeholder="Tell us about yourself"></bit-textarea>
```

</ComponentPreview>

## Helper & Error Text

<ComponentPreview center>

```html
<bit-textarea label="Description" helper="Briefly describe the issue you are experiencing."></bit-textarea>
<bit-textarea label="Notes" error="This field is required." value=""></bit-textarea>
```

</ComponentPreview>

## Character Counter

Set `maxlength` to enable a live character counter. The counter turns amber near the limit and red at the limit.

<ComponentPreview center>

```html
<bit-textarea label="Bio" maxlength="160" placeholder="160 characters max"></bit-textarea>
```

</ComponentPreview>

## Auto Resize

Set `auto-resize` to let the textarea grow vertically with its content. Manual resize is automatically disabled.

<ComponentPreview center>

```html
<bit-textarea label="Notes" auto-resize placeholder="Start typing — the field will grow"></bit-textarea>
```

</ComponentPreview>

## Resize Control

Control the resize handle with the `resize` attribute.

<ComponentPreview center>

```html
<bit-textarea label="Vertical (default)" resize="vertical" rows="2"></bit-textarea>
<bit-textarea label="Horizontal" resize="horizontal" rows="2"></bit-textarea>
<bit-textarea label="Both" resize="both" rows="2"></bit-textarea>
<bit-textarea label="None" resize="none" rows="2"></bit-textarea>
```

</ComponentPreview>

## States

<ComponentPreview center>

```html
<bit-textarea disabled label="Disabled" value="Cannot edit this"></bit-textarea>
<bit-textarea readonly label="Read-only" value="Cannot change this"></bit-textarea>
```

</ComponentPreview>

## Guideline Recipe: Polish with Auto-Resize and Character Guidance

**Guideline: polish** — an auto-resizing textarea with a character counter removes manual scrolling friction and gives users a clear sense of constraint.

```html
<bit-textarea
  label="Bio"
  name="bio"
  placeholder="Tell us a little about yourself..."
  helper="Shown on your public profile"
  maxlength="160"
  show-count
  auto-resize
  rows="3"></bit-textarea>
```

**Tip:** Use `auto-resize` with a `rows` minimum so the textarea starts compact but grows with the content — preserving layout stability while eliminating the fixed-size scroll trap.

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
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'frost'`      | `'solid'`    | Visual style variant                               |
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

| Property                       | Description       | Default                       |
| ------------------------------ | ----------------- | ----------------------------- |
| `--textarea-bg`                | Background color  | `var(--color-contrast-100)`   |
| `--textarea-border-color`      | Border color      | `var(--color-contrast-300)`   |
| `--textarea-radius`            | Border radius     | `var(--rounded-md)`           |
| `--textarea-padding`           | Padding           | `var(--size-2) var(--size-3)` |
| `--textarea-font-size`         | Font size         | `var(--text-sm)`              |
| `--textarea-placeholder-color` | Placeholder color | `var(--color-contrast-500)`   |
| `--textarea-min-height`        | Minimum height    | `var(--size-24)`              |
| `--textarea-max-height`        | Maximum height    | `none`                        |

## Accessibility

The textarea component follows WCAG 2.1 Level AA standards.

### `bit-textarea`

✅ **Keyboard Navigation**

- `Tab` focuses the field; `Shift+Tab` blurs it.
- Native textarea keyboard behaviour applies within the field.

✅ **Screen Readers**

- `aria-labelledby` links the label; `aria-describedby` links helper and error text.
- `aria-invalid` is set when `error` is provided; `aria-required` reflects the `required` attribute.
- `aria-disabled` reflects the disabled state.

## Best Practices

**Do:**

- Use `auto-resize` for comment or note fields where content length is unpredictable.
- Always provide a `label`; don't rely solely on `placeholder`.
- Set `maxlength` when a backend constraint exists — the counter gives live feedback.
- Use `error` to surface server-side validation messages after submit.

**Don't:**

- Set `rows` and `auto-resize` at the same time — `auto-resize` overrides the resize handle anyway; `rows` still sets the minimum starting height.
- Use `resize="horizontal"` on full-width layouts (it breaks layout flow).
