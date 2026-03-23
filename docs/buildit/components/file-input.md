# File Input

A modern file upload component with drag-and-drop support, file list management, constraint filtering, and full form integration. Shares the same visual theme system as `bit-input`.

## Features

- 🌈 **6 Semantic Colors** — primary, secondary, info, success, warning, error
- 🎨 **5 Variants** — solid, flat, bordered, outline, ghost
- 📎 **Click to Browse** — opens the native file picker on click or keyboard activation
- 📏 **3 Sizes** — sm, md, lg
- 🔒 **Constraints** — `accept`, `max-size`, `max-files` filtering built-in
- 🔗 **Form-Associated** — participates in native form submission via `FormData`
- 🔲 **Multiple Selection** — toggle via `multiple` attribute
- 🖱️ **Drag & Drop** — drop files directly onto the dropzone
- 🗂️ **File List** — displays selected files with name, size, and individual remove buttons

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/form/file-input/file-input.ts
:::

## Basic Usage

```html
<bit-file-input label="Upload files"></bit-file-input>

<script type="module">
  import '@vielzeug/buildit/file-input';
</script>
```

## Visual Options

### Variants

Six visual variants for different UI contexts and levels of emphasis.

<ComponentPreview>

```html
<bit-file-input variant="solid" label="Solid"></bit-file-input>
<bit-file-input variant="flat" label="Flat"></bit-file-input>
<bit-file-input variant="bordered" label="Bordered"></bit-file-input>
<bit-file-input variant="outline" label="Outline"></bit-file-input>
<bit-file-input variant="ghost" label="Ghost"></bit-file-input>
```

</ComponentPreview>

### Colors

Six semantic colors for different contexts and validation states.

<ComponentPreview center>

```html
<bit-grid cols="1" cols-sm="2" cols-md="3" gap="md" style="width: 100%;">
  <bit-file-input variant="flat" label="Default"></bit-file-input>
  <bit-file-input variant="flat" color="primary" label="Primary"></bit-file-input>
  <bit-file-input variant="flat" color="secondary" label="Secondary"></bit-file-input>
  <bit-file-input variant="flat" color="info" label="Info"></bit-file-input>
  <bit-file-input variant="flat" color="success" label="Success"></bit-file-input>
  <bit-file-input variant="flat" color="warning" label="Warning"></bit-file-input>
  <bit-file-input variant="flat" color="error" label="Error"></bit-file-input>
</bit-grid>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<bit-file-input variant="flat" size="sm" label="Small"></bit-file-input>
<bit-file-input variant="flat" size="md" label="Medium"></bit-file-input>
<bit-file-input variant="flat" size="lg" label="Large"></bit-file-input>
```

</ComponentPreview>

### Rounded (Custom Border Radius)

Use the `rounded` attribute to apply a border radius from the theme.

<ComponentPreview center>

```html
<bit-file-input rounded="none" variant="flat" label="None"></bit-file-input>
<bit-file-input rounded="xl" variant="bordered" label="Extra large"></bit-file-input>
<bit-file-input rounded="2xl" variant="outline" label="2XL"></bit-file-input>
<bit-file-input rounded="3xl" variant="flat" color="primary" label="3XL"></bit-file-input>
```

</ComponentPreview>

## Customization

### Multiple Files

Enable multi-file selection with the `multiple` attribute.

<ComponentPreview center>

```html
<bit-file-input
  multiple
  label="Upload photos"
  helper="Select one or more images"
  accept="image/*"
  variant="bordered"
  color="primary">
</bit-file-input>
```

</ComponentPreview>

### Accept Filter

Restrict accepted file types using MIME types or file extensions. The accepted types are shown in the dropzone hint automatically.

<ComponentPreview center>

```html
<!-- Only images -->
<bit-file-input accept="image/*" label="Profile Photo" variant="flat" color="primary"></bit-file-input>

<!-- PDF, Word documents -->
<bit-file-input accept=".pdf,.doc,.docx" label="Resume" variant="bordered"></bit-file-input>

<!-- Multiple types -->
<bit-file-input
  accept="image/*,application/pdf,.docx"
  label="Attachments"
  multiple
  variant="flat"
  color="secondary"></bit-file-input>
```

</ComponentPreview>

### File Size & Count Limits

Use `max-size` (bytes) and `max-files` to enforce constraints. Files that don't meet the criteria are silently filtered out. The limits appear in the dropzone hint.

<ComponentPreview center>

```html
<!-- Max 5 MB per file -->
<bit-file-input
  accept="image/*"
  max-size="5242880"
  label="Upload image"
  helper="Images only, max 5 MB"
  variant="bordered"
  color="success">
</bit-file-input>

<!-- Multiple files with count cap -->
<bit-file-input
  multiple
  max-files="3"
  max-size="2097152"
  label="Documents"
  helper="Up to 3 files, 2 MB each"
  variant="flat"
  color="primary">
</bit-file-input>
```

</ComponentPreview>

### With Helper Text

Provide context below the dropzone using the `helper` attribute.

<ComponentPreview center>

```html
<bit-file-input
  label="Portfolio"
  multiple
  accept="image/*,.pdf"
  helper="Upload images or PDFs showcasing your work"
  variant="bordered"
  color="primary">
</bit-file-input>
```

</ComponentPreview>

### Full Width

Expand the component to fill its container with `fullwidth`.

<ComponentPreview>

```html
<bit-file-input fullwidth multiple label="Attachments" helper="Drop any files here" variant="bordered" color="primary">
</bit-file-input>
```

</ComponentPreview>

## States

### Disabled

Prevents all interaction — click, drag-and-drop, and keyboard activation are all blocked.

<ComponentPreview center>

```html
<bit-file-input disabled label="Upload disabled" variant="bordered"></bit-file-input>
```

</ComponentPreview>

### Error State

Display a validation error with the `error` attribute. The error message replaces the helper text.

<ComponentPreview center>

```html
<bit-file-input
  error="File type not supported. Please upload a PDF or image."
  label="Contract"
  accept=".pdf"
  variant="bordered"
  color="error">
</bit-file-input>
```

</ComponentPreview>

## Form Integration

`bit-file-input` is a form-associated custom element. It serializes its selected files as `FormData` under the given `name` key — identical to how a native `<input type="file">` behaves.

```html
<form id="upload-form" method="post" enctype="multipart/form-data">
  <bit-file-input name="documents" multiple accept=".pdf,.docx" label="Upload documents" required> </bit-file-input>
  <button type="submit">Submit</button>
</form>
```

Listening to the `change` event for reactive scenarios:

```js
const fileInput = document.querySelector('bit-file-input');

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

| Property                    | Description               | Default                     |
| --------------------------- | ------------------------- | --------------------------- |
| `--file-input-bg`           | Dropzone background color | `var(--color-contrast-100)` |
| `--file-input-border-color` | Dropzone border color     | `var(--color-contrast-300)` |
| `--file-input-radius`       | Border radius             | `var(--rounded-lg)`         |
| `--file-input-min-height`   | Minimum dropzone height   | `var(--size-40)`            |
| `--file-input-font-size`    | Font size                 | `var(--text-sm)`            |

## Accessibility

The file input component follows WCAG 2.1 Level AA standards.

### `bit-file-input`

✅ **Keyboard Navigation**

- `Tab` focuses the dropzone; `Enter` / `Space` open the native file picker.
- Remove buttons inside the file list are individually focusable.

✅ **Screen Readers**

- The dropzone uses `role="button"` with `aria-labelledby` linking the label and `aria-describedby` linking helper text.
- Each remove button has a descriptive `aria-label` (e.g. `"Remove report.pdf"`).
- Error messages use `role="alert"` for live-region announcements.
- `aria-disabled` reflects the disabled state.

## Best Practices

**Do:**

- Always provide a `label` to clearly communicate what files are expected.
- Use `accept` to guide users toward valid file types and avoid upload errors.
- Set `max-size` and `max-files` to prevent oversized or unexpected uploads.
- Use `multiple` only when your backend truly supports multiple files per field.
- Pair with `helper` text to document accepted types and size limits.
- Use semantic `color` values (`success`, `error`) to communicate validation state.

**Don't:**

- Rely solely on client-side `max-size` / `accept` filtering — always validate on the server.
- Omit a `name` attribute when using the component inside a `<form>` — it is required for form submission.
