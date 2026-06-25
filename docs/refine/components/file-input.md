# File Input

A modern file upload component with drag-and-drop support, file list management, constraint filtering, and full form integration. Shares the same visual theme system as `ore-input`.

## Variants

Six visual variants for different UI contexts and levels of emphasis.

<ComponentPreview>

```html
<ore-file-input variant="solid" label="Solid"></ore-file-input>
<ore-file-input variant="flat" label="Flat"></ore-file-input>
<ore-file-input variant="bordered" label="Bordered"></ore-file-input>
<ore-file-input variant="outline" label="Outline"></ore-file-input>
<ore-file-input variant="ghost" label="Ghost"></ore-file-input>
```

</ComponentPreview>

## Colors

Six semantic colors for different contexts and validation states.

<ComponentPreview center>

```html
<ore-grid cols="1" cols-sm="2" cols-md="3" gap="md" style="width: 100%;">
  <ore-file-input variant="flat" label="Default"></ore-file-input>
  <ore-file-input variant="flat" color="primary" label="Primary"></ore-file-input>
  <ore-file-input variant="flat" color="secondary" label="Secondary"></ore-file-input>
  <ore-file-input variant="flat" color="info" label="Info"></ore-file-input>
  <ore-file-input variant="flat" color="success" label="Success"></ore-file-input>
  <ore-file-input variant="flat" color="warning" label="Warning"></ore-file-input>
  <ore-file-input variant="flat" color="error" label="Error"></ore-file-input>
</ore-grid>
```

</ComponentPreview>

## Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<ore-file-input variant="flat" size="sm" label="Small"></ore-file-input>
<ore-file-input variant="flat" size="md" label="Medium"></ore-file-input>
<ore-file-input variant="flat" size="lg" label="Large"></ore-file-input>
```

</ComponentPreview>

## Rounded (Custom Border Radius)

Use the `rounded` attribute to apply a border radius from the theme.

<ComponentPreview center>

```html
<ore-file-input rounded="none" variant="flat" label="None"></ore-file-input>
<ore-file-input rounded="xl" variant="bordered" label="Extra large"></ore-file-input>
<ore-file-input rounded="2xl" variant="outline" label="2XL"></ore-file-input>
<ore-file-input rounded="3xl" variant="flat" color="primary" label="3XL"></ore-file-input>
```

</ComponentPreview>

## Customization

### Multiple Files

Enable multi-file selection with the `multiple` attribute. Use `multiple` only when your backend truly supports multiple files per field.

<ComponentPreview center>

```html
<ore-file-input
  multiple
  label="Upload photos"
  helper="Select one or more images"
  accept="image/*"
  variant="bordered"
  color="primary">
</ore-file-input>
```

</ComponentPreview>

### Accept Filter

Restrict accepted file types using MIME types or file extensions. The accepted types are shown in the dropzone hint automatically. Always pair with `helper` text to document accepted types so users know what is expected.

<ComponentPreview center>

```html
<!-- Only images -->
<ore-file-input accept="image/*" label="Profile Photo" variant="flat" color="primary"></ore-file-input>

<!-- PDF, Word documents -->
<ore-file-input accept=".pdf,.doc,.docx" label="Resume" variant="bordered"></ore-file-input>

<!-- Multiple types -->
<ore-file-input
  accept="image/*,application/pdf,.docx"
  label="Attachments"
  multiple
  variant="flat"
  color="secondary"></ore-file-input>
```

</ComponentPreview>

### File Size & Count Limits

Use `max-size` (bytes) and `max-files` to enforce constraints. Files that don't meet the criteria are silently filtered out. The limits appear in the dropzone hint. Always validate these constraints on the server as well — client-side filtering alone is not sufficient.

<ComponentPreview center>

```html
<!-- Max 5 MB per file -->
<ore-file-input
  accept="image/*"
  max-size="5242880"
  label="Upload image"
  helper="Images only, max 5 MB"
  variant="bordered"
  color="success">
</ore-file-input>

<!-- Multiple files with count cap -->
<ore-file-input
  multiple
  max-files="3"
  max-size="2097152"
  label="Documents"
  helper="Up to 3 files, 2 MB each"
  variant="flat"
  color="primary">
</ore-file-input>
```

</ComponentPreview>

### With Helper Text

Provide context below the dropzone using the `helper` attribute. Always provide a `label` to clearly communicate what files are expected.

<ComponentPreview center>

```html
<ore-file-input
  label="Portfolio"
  multiple
  accept="image/*,.pdf"
  helper="Upload images or PDFs showcasing your work"
  variant="bordered"
  color="primary">
</ore-file-input>
```

</ComponentPreview>

### Full Width

Expand the component to fill its container with `fullwidth`.

<ComponentPreview>

```html
<ore-file-input fullwidth multiple label="Attachments" helper="Drop any files here" variant="bordered" color="primary">
</ore-file-input>
```

</ComponentPreview>

## States

### Disabled

Prevents all interaction — click, drag-and-drop, and keyboard activation are all blocked.

<ComponentPreview center>

```html
<ore-file-input disabled label="Upload disabled" variant="bordered"></ore-file-input>
```

</ComponentPreview>

### Error State

Display a validation error with the `error` attribute. The error message replaces the helper text. Use semantic `color` values (`success`, `error`) to communicate validation state.

<ComponentPreview center>

```html
<ore-file-input
  error="File type not supported. Please upload a PDF or image."
  label="Contract"
  accept=".pdf"
  variant="bordered"
  color="error">
</ore-file-input>
```

</ComponentPreview>

## Form Integration

`ore-file-input` is a form-associated custom element. It serializes its selected files as `FormData` under the given `name` key — identical to how a native `<input type="file">` behaves. Always include a `name` attribute when using the component inside a `<form>` — it is required for form submission.

```html
<form id="upload-form" method="post" enctype="multipart/form-data">
  <ore-file-input name="documents" multiple accept=".pdf,.docx" label="Upload documents" required> </ore-file-input>
  <button type="submit">Submit</button>
</form>
```

Listening to the `change` event for reactive scenarios:

```js
const fileInput = document.querySelector('ore-file-input');

fileInput.addEventListener('change', ({ detail }) => {
  console.log('Selected files:', detail.files);
});

fileInput.addEventListener('remove', ({ detail }) => {
  console.log('Removed:', detail.file.name);
  console.log('Remaining:', detail.files);
});
```

## API Reference

### Attributes

| Attribute   | Type                                                                      | Default   | Description                                         |
| ----------- | ------------------------------------------------------------------------- | --------- | --------------------------------------------------- |
| `accept`    | `string`                                                                  | `''`      | Accepted MIME types or extensions (comma-separated) |
| `color`     | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —         | Color theme                                         |
| `disabled`  | `boolean`                                                                 | `false`   | Disable all interaction                             |
| `error`     | `string`                                                                  | `''`      | Error message (replaces helper text)                |
| `fullwidth` | `boolean`                                                                 | `false`   | Expand to full width                                |
| `helper`    | `string`                                                                  | `''`      | Helper text below the dropzone                      |
| `label`     | `string`                                                                  | `''`      | Label text displayed above the dropzone             |
| `max-files` | `number`                                                                  | `0`       | Maximum number of files (0 = unlimited)             |
| `max-size`  | `number`                                                                  | `0`       | Maximum file size in bytes (0 = unlimited)          |
| `multiple`  | `boolean`                                                                 | `false`   | Allow selecting multiple files                      |
| `name`      | `string`                                                                  | `''`      | Form field name                                     |
| `required`  | `boolean`                                                                 | `false`   | Mark as required                                    |
| `rounded`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl'`                | —         | Border radius                                       |
| `size`      | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`    | Component size                                      |
| `variant`   | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost'`                 | `'solid'` | Visual variant                                      |

### Events

| Event    | Detail                                     | Description                                    |
| -------- | ------------------------------------------ | ---------------------------------------------- |
| `change` | `{ files: File[], originalEvent?: Event }` | Emitted when selection changes (add or remove) |
| `remove` | `{ file: File, files: File[] }`            | Emitted when a file is removed from the list   |

### CSS Parts

| Part       | Description                              |
| ---------- | ---------------------------------------- |
| `wrapper`  | The outer wrapper `<div>`                |
| `label`    | The `<label>` element above the dropzone |
| `dropzone` | The interactive drag-and-drop zone       |
| `input`    | The hidden native `<input type="file">`  |
| `helper`   | The helper text `<div>`                  |
| `error`    | The error text `<div>`                   |

### CSS Custom Properties

| Property                          | Description                                        | Default             |
| --------------------------------- | -------------------------------------------------- | ------------------- |
| `--file-input-bg`                 | Dropzone background color                          | Variant-dependent   |
| `--file-input-border-color`       | Dropzone border color                              | Variant-dependent   |
| `--file-input-radius`             | Border radius                                      | `var(--rounded-lg)` |
| `--file-input-min-height`         | Minimum dropzone height                            | `var(--size-40)`    |
| `--file-input-font-size`          | Font size                                          | `var(--text-sm)`    |
| `--file-input-hover-bg`           | Dropzone background on hover (flat/ghost variants) | Variant-dependent   |
| `--file-input-hover-border-color` | Dropzone border on hover (flat/bordered variants)  | Variant-dependent   |
| `--file-input-focus-bg`           | Dropzone background when focused/drag-over (flat)  | Variant-dependent   |
| `--file-input-focus-border-color` | Dropzone border when focused/drag-over (flat)      | Variant-dependent   |

## Accessibility

The file input component follows WCAG 2.1 Level AA standards. The dropzone uses `role="button"` with `aria-labelledby` linking the label and `aria-describedby` linking helper text. `Tab` focuses the dropzone; `Enter` / `Space` open the native file picker. Remove buttons inside the file list are individually focusable, each with a descriptive `aria-label` (e.g. `"Remove report.pdf"`). Error messages use `role="alert"` for live-region announcements. `aria-disabled` reflects the disabled state.
