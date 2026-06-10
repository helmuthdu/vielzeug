# Textarea

A multi-line text input with integrated label, helper text, character counter, and auto-resize. Form-associated and fully keyboard accessible.

## Features

- <sg-icon name="rainbow" size="16"></sg-icon> **6 Semantic Colors** — primary, secondary, info, success, warning, error
- <sg-icon name="palette" size="16"></sg-icon> **5 Variants** — solid, flat, bordered, outline, ghost
- <sg-icon name="tag" size="16"></sg-icon> **Label Placement** — inset (floating-style) or outside
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes** — sm, md, lg
- <sg-icon name="triangle-right" size="16"></sg-icon> **Auto Resize** — grows vertically with content; no scrollbar
- <sg-icon name="file-pen" size="16"></sg-icon> **Helper & Error Text** — descriptive text or validation errors below the field
- <sg-icon name="link" size="16"></sg-icon> **Form-Associated** — participates in native form submission
- <sg-icon name="hash" size="16"></sg-icon> **Character Counter** — live counter with near-limit and at-limit colour feedback

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/textarea/textarea.ts
:::

## Basic Usage

```html
<sg-textarea label="Message" placeholder="Write something..."></sg-textarea>
```

## Visual Options

### Variants

<ComponentPreview center>

```html
<sg-textarea variant="solid" label="Solid" rows="2"></sg-textarea>
<sg-textarea variant="flat" label="Flat" rows="2"></sg-textarea>
<sg-textarea variant="bordered" label="Bordered" rows="2" color="primary"></sg-textarea>
<sg-textarea variant="outline" label="Outline" rows="2"></sg-textarea>
<sg-textarea variant="ghost" label="Ghost" rows="2"></sg-textarea>
```

</ComponentPreview>

### Colors

<ComponentPreview center>

```html
<sg-textarea variant="flat" label="Default" rows="2"></sg-textarea>
<sg-textarea variant="flat" color="primary" label="Primary" rows="2"></sg-textarea>
<sg-textarea variant="flat" color="success" label="Success" rows="2"></sg-textarea>
<sg-textarea variant="flat" color="warning" label="Warning" rows="2"></sg-textarea>
<sg-textarea variant="flat" color="error" label="Error" rows="2"></sg-textarea>
```

</ComponentPreview>

### Sizes

<ComponentPreview center>

```html
<sg-textarea size="sm" label="Small" rows="2"></sg-textarea>
<sg-textarea size="md" label="Medium" rows="2"></sg-textarea>
<sg-textarea size="lg" label="Large" rows="2"></sg-textarea>
```

</ComponentPreview>

## Labels

### Inset (Default)

The label floats inside the field as a compact top label.

<ComponentPreview center>

```html
<sg-textarea label="Bio" placeholder="Tell us about yourself"></sg-textarea>
```

</ComponentPreview>

### Outside

The label is placed above the field.

<ComponentPreview center>

```html
<sg-textarea label="Bio" label-placement="outside" placeholder="Tell us about yourself"></sg-textarea>
```

</ComponentPreview>

## Helper & Error Text

<ComponentPreview center>

```html
<sg-textarea label="Description" helper="Briefly describe the issue you are experiencing."></sg-textarea>
<sg-textarea label="Notes" error="This field is required." value=""></sg-textarea>
```

</ComponentPreview>

## Character Counter

Set `maxlength` to enable a live character counter. The counter turns amber near the limit and red at the limit.

<ComponentPreview center>

```html
<sg-textarea label="Bio" maxlength="160" placeholder="160 characters max"></sg-textarea>
```

</ComponentPreview>

## Auto Resize

Set `auto-resize` to let the textarea grow vertically with its content. Manual resize is automatically disabled.

<ComponentPreview center>

```html
<sg-textarea label="Notes" auto-resize placeholder="Start typing — the field will grow"></sg-textarea>
```

</ComponentPreview>

## Resize Control

Control the resize handle with the `resize` attribute.

<ComponentPreview center>

```html
<sg-textarea label="Vertical (default)" resize="vertical" rows="2"></sg-textarea>
<sg-textarea label="Horizontal" resize="horizontal" rows="2"></sg-textarea>
<sg-textarea label="Both" resize="both" rows="2"></sg-textarea>
<sg-textarea label="None" resize="none" rows="2"></sg-textarea>
```

</ComponentPreview>

## States

<ComponentPreview center>

```html
<sg-textarea disabled label="Disabled" value="Cannot edit this"></sg-textarea>
<sg-textarea readonly label="Read-only" value="Cannot change this"></sg-textarea>
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
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost'`                  | `'solid'`    | Visual style variant                               |
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
| `--textarea-bg`                   | Background color                                            | Variant-dependent             |
| `--textarea-border-color`         | Border color                                                | Variant-dependent             |
| `--textarea-radius`               | Border radius                                               | `var(--rounded-lg)`           |
| `--textarea-padding`              | Inner padding (block inline)                                | `var(--size-2) var(--size-3)` |
| `--textarea-gap`                  | Gap between label and field                                 | Size-dependent                |
| `--textarea-font-size`            | Font size                                                   | `var(--text-sm)`              |
| `--textarea-placeholder-color`    | Placeholder text color                                      | Theme-dependent               |
| `--textarea-min-height`           | Minimum field height                                        | `var(--size-24)`              |
| `--textarea-max-height`           | Maximum field height (`none` = unlimited)                   | `none`                        |
| `--textarea-resize`               | CSS resize direction (`vertical`/`horizontal`/`both`/`none`) | `vertical`                   |
| `--textarea-hover-bg`             | Field background on hover (flat/ghost variants)             | Variant-dependent             |
| `--textarea-hover-border-color`   | Field border on hover (flat/bordered variants)              | Variant-dependent             |
| `--textarea-focus-bg`             | Field background when focused (flat variant)                | Variant-dependent             |
| `--textarea-focus-border-color`   | Field border when focused (flat variant)                    | Variant-dependent             |

## Accessibility

The textarea component follows WCAG 2.1 Level AA standards.

### `sg-textarea`

<sg-icon name="circle-check" size="16"></sg-icon> **Keyboard Navigation**

- `Tab` focuses the field; `Shift+Tab` blurs it.
- Native textarea keyboard behaviour applies within the field.

<sg-icon name="circle-check" size="16"></sg-icon> **Screen Readers**

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
